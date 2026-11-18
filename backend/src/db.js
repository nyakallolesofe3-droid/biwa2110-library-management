import pg from 'pg';
import 'dotenv/config';
import { hashPassword } from './passwords.js';

const { Pool } = pg;
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is missing. Set it in backend/.env.');
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS books (
      id SERIAL PRIMARY KEY, title VARCHAR(180) NOT NULL, author VARCHAR(140) NOT NULL,
      genre VARCHAR(80) NOT NULL, isbn VARCHAR(32) UNIQUE NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY, name VARCHAR(140) NOT NULL, membership_id VARCHAR(40) UNIQUE NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'Student' CHECK (role IN ('Student','Staff','Admin')),
      password_hash TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY, book_id INTEGER REFERENCES books(id) ON DELETE SET NULL,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, type VARCHAR(12) NOT NULL CHECK (type IN ('stock-in','borrow')),
      quantity INTEGER NOT NULL CHECK (quantity > 0), note VARCHAR(240) DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`);
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT');
  await pool.query('ALTER TABLE users ALTER COLUMN password_hash TYPE TEXT');
  const books = await pool.query('SELECT COUNT(*) FROM books');
  if (Number(books.rows[0].count) === 0) {
    await pool.query(`INSERT INTO books(title,author,genre,isbn,quantity) VALUES
      ('Things Fall Apart','Chinua Achebe','Fiction','9780385474542',8),
      ('Clean Code','Robert C. Martin','Technology','9780132350884',1),
      ('The Pragmatic Programmer','David Thomas','Technology','9780135957059',4)`);
  }
  const adminPasswordHash = await hashPassword(process.env.DEFAULT_ADMIN_PASSWORD || 'Library@2026!');
  await pool.query(`INSERT INTO users(name,membership_id,role,password_hash)
    VALUES ('Library Administrator','ADMIN001','Admin',$1)
    ON CONFLICT (membership_id) DO UPDATE
    SET password_hash=COALESCE(users.password_hash,EXCLUDED.password_hash)`, [adminPasswordHash]);
}
