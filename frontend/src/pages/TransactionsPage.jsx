import { useState } from 'react';
import { Activity, ArrowDownLeft, ArrowUpRight, BookOpen } from 'lucide-react';
import { api } from '../api.js';
import { Empty, Field, Modal, PageHeader, StatCard } from '../components/ui.jsx';

const date = (value) => new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export default function TransactionsPage({ books, users, transactions, refresh, notify, user, goToLogin }) {
  const [modal, setModal] = useState(null);
  const [filter, setFilter] = useState('all');
  const admin = user?.role === 'Admin';
  const filtered = transactions.filter((transaction) => filter === 'all' || transaction.type === filter);
  const remove = async (transaction) => {
    if (!window.confirm(`Delete this ${transaction.type} transaction and reverse its stock movement?`)) return;
    try {
      await api(`/transactions/${transaction.id}`, { method: 'DELETE' });
      await refresh();
      notify('Transaction deleted and stock adjusted');
    } catch (error) { notify(error.message); }
  };
  const openNew = () => user ? setModal({}) : goToLogin();

  return <>
    <PageHeader eyebrow="CIRCULATION & STOCK" title="Transactions" description="Track books borrowed by members and stock received by the library." action={<button className="button button-primary" onClick={openNew}>＋ New transaction</button>}/>
    <div className="stats-grid transaction-stats">
      <StatCard label="Total transactions" value={transactions.length} caption="Latest 100 shown below" icon={Activity}/>
      <StatCard label="Books borrowed" value={transactions.filter(t => t.type === 'borrow').length} caption="Recorded borrowing events" icon={ArrowUpRight} tone="blue"/>
      <StatCard label="Stock deliveries" value={transactions.filter(t => t.type === 'stock-in').length} caption="Recorded stock additions" icon={ArrowDownLeft} tone="purple"/>
      <StatCard label="Copies borrowed" value={transactions.filter(t => t.type === 'borrow').reduce((n, t) => n + Number(t.quantity), 0)} caption="In the latest 100 records" icon={BookOpen} tone="amber"/>
    </div>
    {!user && <div className="login-prompt"><div><b>Sign in to view transaction history</b><span>Members can borrow books; administrators can also manage transaction records.</span></div><button className="button button-light" onClick={goToLogin}>Sign in</button></div>}
    <section className="panel table-panel">
      <div className="panel-heading"><div><div className="eyebrow">TRANSACTION LOG</div><h2>History <span className="count-pill">{filtered.length}</span></h2></div><div className="filter-tabs">{[['all','All activity'],['borrow','Borrowed'],...(admin ? [['stock-in','Stock received']] : [])].map(([key,label]) => <button key={key} className={filter === key ? 'selected' : ''} onClick={() => setFilter(key)}>{label}</button>)}</div></div>
      {user && filtered.length ? <div className="table-scroll"><table><thead><tr><th>TYPE</th><th>BOOK</th><th>MEMBER / STAFF</th><th>QUANTITY</th><th>DATE</th><th>NOTE</th>{admin && <th>ACTIONS</th>}</tr></thead><tbody>{filtered.map(transaction => <tr key={transaction.id}><td><span className={`type-tag ${transaction.type === 'borrow' ? 'type-borrow' : 'type-stock'}`}>{transaction.type === 'borrow' ? <ArrowUpRight size={13}/> : <ArrowDownLeft size={13}/>} {transaction.type === 'borrow' ? 'Borrowed' : 'Stock in'}</span></td><td><b>{transaction.book_title || 'Deleted book'}</b></td><td>{transaction.user_name || 'Deleted user'}{transaction.membership_id && <small className="sub-cell">{transaction.membership_id}</small>}</td><td><b>{transaction.quantity}</b> copies</td><td className="muted-cell">{date(transaction.created_at)}</td><td className="muted-cell">{transaction.note || '—'}</td>{admin && <td><div className="row-actions"><button onClick={() => setModal(transaction)} aria-label="Edit transaction" title="Edit">✎</button><button onClick={() => remove(transaction)} aria-label="Delete transaction" title="Delete">⌫</button></div></td>}</tr>)}</tbody></table></div> : user ? <Empty title="No transactions found" text="Stock additions and borrowings will appear here." action={<button className="button button-light" onClick={openNew}>Record a transaction</button>}/> : null}
    </section>
    {modal && <TransactionForm transaction={modal.id ? modal : null} books={books} users={users} user={user} close={() => setModal(null)} onDone={async () => { await refresh(); setModal(null); notify(modal.id ? 'Transaction updated' : 'Transaction recorded successfully'); }}/ >}
  </>;
}

export function TransactionForm({ transaction, books, users, user, close, onDone }) {
  const admin = user?.role === 'Admin';
  const [form, setForm] = useState({ type: transaction?.type || 'borrow', bookId: transaction?.book_id || '', userId: transaction?.user_id || (admin ? '' : user?.id || ''), quantity: transaction?.quantity || 1, note: transaction?.note || '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const book = books.find(item => String(item.id) === String(form.bookId));
  const change = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }));
  const submit = async event => {
    event.preventDefault(); setError(''); setSaving(true);
    try {
      const body = { type: form.type, bookId: Number(form.bookId), quantity: Number(form.quantity), note: form.note };
      if (admin && form.userId) body.userId = Number(form.userId);
      await api(transaction ? `/transactions/${transaction.id}` : '/transactions', { method: transaction ? 'PUT' : 'POST', body });
      await onDone();
    } catch (problem) { setError(problem.message); } finally { setSaving(false); }
  };
  return <Modal title={transaction ? 'Edit transaction' : 'Record a transaction'} subtitle="Stock changes are checked and saved together with the transaction." close={close}>
    <form onSubmit={submit}>
      {admin && <div className="segmented"><button type="button" className={form.type === 'borrow' ? 'on' : ''} onClick={() => setForm({ ...form, type: 'borrow' })}><ArrowUpRight size={15}/> Borrow a book</button><button type="button" className={form.type === 'stock-in' ? 'on' : ''} onClick={() => setForm({ ...form, type: 'stock-in' })}><ArrowDownLeft size={15}/> Add stock</button></div>}
      <label className="field"><span>Book <i>*</i></span><select name="bookId" value={form.bookId} onChange={change} required><option value="">Select a title…</option>{books.map(item => <option key={item.id} value={item.id}>{item.title} ({item.quantity} in stock)</option>)}</select></label>
      {admin && form.type === 'borrow' && <label className="field"><span>Member</span><select name="userId" value={form.userId} onChange={change}><option value="">Administrator / staff</option>{users.map(member => <option key={member.id} value={member.id}>{member.name} · {member.membership_id}</option>)}</select></label>}
      <div className="form-grid"><Field label="Copies" name="quantity" type="number" min="1" max={form.type === 'borrow' ? book?.quantity : undefined} value={form.quantity} change={change} required/><Field label="Note (optional)" name="note" value={form.note} change={change} placeholder="Add a short note"/></div>
      {form.type === 'borrow' && book && <div className={`stock-hint ${book.quantity < 1 ? 'hint-warn' : ''}`}>{book.quantity > 0 ? `${book.quantity} ${book.quantity === 1 ? 'copy' : 'copies'} currently available` : 'This title is out of stock'}</div>}
      {error && <div className="form-error">{error}</div>}
      <div className="modal-actions"><button type="button" className="button button-light" onClick={close}>Cancel</button><button className="button button-primary" disabled={saving || !books.length}>{saving ? 'Saving…' : transaction ? 'Save changes' : 'Save transaction'}</button></div>
    </form>
  </Modal>;
}
