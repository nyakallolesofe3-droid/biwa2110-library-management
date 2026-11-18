import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { pool, initializeDatabase } from './db.js';
import { createSession, requireAdmin, requireAuth } from './auth.js';
import { hashPassword, verifyPassword } from './passwords.js';

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || true }));
app.use(express.json({ limit: '32kb' }));

const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const requiredText = (value, label) => {
  const text = String(value ?? '').trim();
  if (!text) throw fail(`${label} is required`);
  return text;
};
const positiveInt = (value, label = 'Quantity') => {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1) throw fail(`${label} must be a positive whole number`);
  return number;
};
const bookFields = (body) => ({
  title: requiredText(body.title, 'Title'),
  author: requiredText(body.author, 'Author'),
  genre: requiredText(body.genre, 'Genre'),
  isbn: requiredText(body.isbn, 'ISBN'),
  quantity: Number(body.quantity),
});
const safeUser = ({ password_hash: _hash, ...user }) => user;

app.get('/health', asyncRoute(async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ status: 'ok' });
}));

// Books: public catalogue reads, administrator-only changes.
app.get('/books', asyncRoute(async (req, res) => {
  const q = `%${String(req.query.q || '').trim()}%`;
  const { rows } = await pool.query(
    `SELECT * FROM books WHERE title ILIKE $1 OR author ILIKE $1 OR genre ILIKE $1 OR isbn ILIKE $1 ORDER BY title`,
    [q],
  );
  res.json(rows);
}));
app.get('/books/:id', asyncRoute(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM books WHERE id=$1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Book not found' });
  res.json(rows[0]);
}));
app.post('/books', requireAuth, requireAdmin, asyncRoute(async (req, res) => {
  const book = bookFields(req.body);
  if (!Number.isSafeInteger(book.quantity) || book.quantity < 0) throw fail('Initial quantity must be zero or more');
  const { rows } = await pool.query(
    'INSERT INTO books(title,author,genre,isbn,quantity) VALUES($1,$2,$3,$4,$5) RETURNING *',
    [book.title, book.author, book.genre, book.isbn, book.quantity],
  );
  res.status(201).json(rows[0]);
}));
app.put('/books/:id', requireAuth, requireAdmin, asyncRoute(async (req, res) => {
  const book = bookFields(req.body);
  if (!Number.isSafeInteger(book.quantity) || book.quantity < 0) throw fail('Quantity must be zero or more');
  const { rows } = await pool.query(
    'UPDATE books SET title=$1,author=$2,genre=$3,isbn=$4,quantity=$5,updated_at=NOW() WHERE id=$6 RETURNING *',
    [book.title, book.author, book.genre, book.isbn, book.quantity, req.params.id],
  );
  if (!rows[0]) return res.status(404).json({ error: 'Book not found' });
  res.json(rows[0]);
}));
app.delete('/books/:id', requireAuth, requireAdmin, asyncRoute(async (req, res) => {
  const { rowCount } = await pool.query('DELETE FROM books WHERE id=$1', [req.params.id]);
  if (!rowCount) return res.status(404).json({ error: 'Book not found' });
  res.status(204).end();
}));

// Sign-in returns a short-lived signed bearer token; the password hash never leaves the server.
app.post('/auth/login', asyncRoute(async (req, res) => {
  const membershipId = requiredText(req.body.membershipId, 'Membership ID');
  const password = requiredText(req.body.password, 'Password');
  const { rows } = await pool.query(
    'SELECT id,name,membership_id AS "membershipId",role,password_hash FROM users WHERE membership_id=$1',
    [membershipId],
  );
  if (!rows[0] || !(await verifyPassword(password, rows[0].password_hash))) {
    return res.status(401).json({ error: 'Membership ID or password is incorrect' });
  }
  const user = safeUser(rows[0]);
  res.json({ token: createSession(user), user });
}));
app.get('/auth/me', requireAuth, (req, res) => res.json(req.user));

// Users: listing and changes are administrator-only. Passwords are write-only.
app.get('/users', requireAuth, requireAdmin, asyncRoute(async (_req, res) => {
  const { rows } = await pool.query('SELECT id,name,membership_id,role,created_at FROM users ORDER BY name');
  res.json(rows);
}));
app.get('/users/:id', requireAuth, requireAdmin, asyncRoute(async (req, res) => {
  const { rows } = await pool.query('SELECT id,name,membership_id,role,created_at FROM users WHERE id=$1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });
  res.json(rows[0]);
}));
app.post('/users', requireAuth, requireAdmin, asyncRoute(async (req, res) => {
  const name = requiredText(req.body.name, 'Name');
  const membershipId = requiredText(req.body.membershipId, 'Membership ID');
  const password = requiredText(req.body.password, 'Password');
  const role = req.body.role || 'Student';
  if (password.length < 10) throw fail('Password must be at least 10 characters');
  if (!['Student', 'Staff', 'Admin'].includes(role)) throw fail('Choose a valid role');
  const passwordHash = await hashPassword(password);
  const { rows } = await pool.query(
    'INSERT INTO users(name,membership_id,role,password_hash) VALUES($1,$2,$3,$4) RETURNING id,name,membership_id,role,created_at',
    [name, membershipId, role, passwordHash],
  );
  res.status(201).json(rows[0]);
}));
app.put('/users/:id', requireAuth, requireAdmin, asyncRoute(async (req, res) => {
  const name = requiredText(req.body.name, 'Name');
  const membershipId = requiredText(req.body.membershipId, 'Membership ID');
  const role = req.body.role;
  const password = String(req.body.password || '');
  if (!['Student', 'Staff', 'Admin'].includes(role)) throw fail('Choose a valid role');
  if (password && password.length < 10) throw fail('Password must be at least 10 characters');
  if (Number(req.params.id) === req.user.id && role !== 'Admin') throw fail('You cannot remove your own administrator role', 409);
  const values = [name, membershipId, role, req.params.id];
  const sql = password
    ? 'UPDATE users SET name=$1,membership_id=$2,role=$3,password_hash=$5 WHERE id=$4 RETURNING id,name,membership_id,role,created_at'
    : 'UPDATE users SET name=$1,membership_id=$2,role=$3 WHERE id=$4 RETURNING id,name,membership_id,role,created_at';
  if (password) values.push(await hashPassword(password));
  const { rows } = await pool.query(sql, values);
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });
  res.json(rows[0]);
}));
app.delete('/users/:id', requireAuth, requireAdmin, asyncRoute(async (req, res) => {
  if (Number(req.params.id) === req.user.id) throw fail('You cannot delete your own account while signed in', 409);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const target = await client.query('SELECT role FROM users WHERE id=$1 FOR UPDATE', [req.params.id]);
    if (!target.rows[0]) throw fail('User not found', 404);
    if (target.rows[0].role === 'Admin') {
      const admins = await client.query("SELECT COUNT(*) FROM users WHERE role='Admin'");
      if (Number(admins.rows[0].count) <= 1) throw fail('The last administrator cannot be deleted', 409);
    }
    await client.query('DELETE FROM users WHERE id=$1', [req.params.id]);
    await client.query('COMMIT');
    res.status(204).end();
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally { client.release(); }
}));

const transactionSelect = `SELECT t.*,b.title AS book_title,u.name AS user_name,u.membership_id
  FROM transactions t LEFT JOIN books b ON b.id=t.book_id LEFT JOIN users u ON u.id=t.user_id`;
const movement = (type, quantity) => type === 'stock-in' ? quantity : -quantity;

async function applyStockDeltas(client, deltas) {
  const entries = [...deltas].filter(([, delta]) => delta !== 0).sort(([a], [b]) => a - b);
  if (!entries.length) return;
  const ids = entries.map(([id]) => id);
  const { rows } = await client.query('SELECT id,quantity FROM books WHERE id=ANY($1::int[]) ORDER BY id FOR UPDATE', [ids]);
  if (rows.length !== ids.length) throw fail('Book not found', 404);
  const quantities = new Map(rows.map((row) => [Number(row.id), Number(row.quantity)]));
  for (const [id, delta] of entries) {
    if (quantities.get(id) + delta < 0) throw fail('This change would make book stock negative', 409);
  }
  for (const [id, delta] of entries) {
    await client.query('UPDATE books SET quantity=quantity+$1,updated_at=NOW() WHERE id=$2', [delta, id]);
  }
}

app.get('/transactions', requireAuth, asyncRoute(async (req, res) => {
  const { rows } = await pool.query(
    `${transactionSelect} WHERE ($1::text='Admin' OR t.user_id=$2) ORDER BY t.created_at DESC LIMIT 100`,
    [req.user.role, req.user.id],
  );
  res.json(rows);
}));
app.get('/transactions/:id', requireAuth, asyncRoute(async (req, res) => {
  const { rows } = await pool.query(`${transactionSelect} WHERE t.id=$1 AND ($2::text='Admin' OR t.user_id=$3)`, [req.params.id, req.user.role, req.user.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Transaction not found' });
  res.json(rows[0]);
}));
app.post('/transactions', requireAuth, asyncRoute(async (req, res) => {
  const bookId = positiveInt(req.body.bookId, 'Book');
  const quantity = positiveInt(req.body.quantity);
  const { type, note = '' } = req.body;
  if (!['stock-in', 'borrow'].includes(type)) throw fail('Transaction type must be stock-in or borrow');
  if (type === 'stock-in' && req.user.role !== 'Admin') throw fail('Administrator access is required to add stock', 403);
  const userId = req.user.role === 'Admin' && req.body.userId ? positiveInt(req.body.userId, 'User') : req.user.id;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: books } = await client.query('SELECT id,quantity FROM books WHERE id=$1 FOR UPDATE', [bookId]);
    if (!books[0]) throw fail('Book not found', 404);
    if (Number(books[0].quantity) + movement(type, quantity) < 0) throw fail('Not enough copies are available', 409);
    await client.query('UPDATE books SET quantity=quantity+$1,updated_at=NOW() WHERE id=$2', [movement(type, quantity), bookId]);
    const { rows } = await client.query(
      'INSERT INTO transactions(book_id,user_id,type,quantity,note) VALUES($1,$2,$3,$4,$5) RETURNING *',
      [bookId, userId, type, quantity, String(note).slice(0, 240)],
    );
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally { client.release(); }
}));
app.put('/transactions/:id', requireAuth, requireAdmin, asyncRoute(async (req, res) => {
  const bookId = positiveInt(req.body.bookId, 'Book');
  const quantity = positiveInt(req.body.quantity);
  const { type, note = '' } = req.body;
  if (!['stock-in', 'borrow'].includes(type)) throw fail('Transaction type must be stock-in or borrow');
  const userId = req.body.userId ? positiveInt(req.body.userId, 'User') : null;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: oldRows } = await client.query('SELECT * FROM transactions WHERE id=$1 FOR UPDATE', [req.params.id]);
    const old = oldRows[0];
    if (!old) throw fail('Transaction not found', 404);
    const deltas = new Map();
    if (old.book_id) deltas.set(Number(old.book_id), -movement(old.type, Number(old.quantity)));
    deltas.set(bookId, (deltas.get(bookId) || 0) + movement(type, quantity));
    await applyStockDeltas(client, deltas);
    const { rows } = await client.query(
      'UPDATE transactions SET book_id=$1,user_id=$2,type=$3,quantity=$4,note=$5 WHERE id=$6 RETURNING *',
      [bookId, userId, type, quantity, String(note).slice(0, 240), req.params.id],
    );
    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally { client.release(); }
}));
app.delete('/transactions/:id', requireAuth, requireAdmin, asyncRoute(async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT * FROM transactions WHERE id=$1 FOR UPDATE', [req.params.id]);
    const transaction = rows[0];
    if (!transaction) throw fail('Transaction not found', 404);
    if (transaction.book_id) {
      await applyStockDeltas(client, new Map([[Number(transaction.book_id), -movement(transaction.type, Number(transaction.quantity))]]));
    }
    await client.query('DELETE FROM transactions WHERE id=$1', [req.params.id]);
    await client.query('COMMIT');
    res.status(204).end();
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally { client.release(); }
}));

app.use((error, _req, res, _next) => {
  if (error.code === '23505') return res.status(409).json({ error: 'That ISBN or membership ID is already in use' });
  if (error.code === '23503') return res.status(400).json({ error: 'The selected book or member does not exist' });
  console.error(error);
  res.status(error.status || 500).json({ error: error.status ? error.message : 'Unexpected server error' });
});

const port = Number(process.env.PORT) || 4000;
initializeDatabase()
  .then(() => app.listen(port, () => console.log(`Library API listening on http://localhost:${port}`)))
  .catch((error) => { console.error('Database initialization failed:', error); process.exit(1); });
