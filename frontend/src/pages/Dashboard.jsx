import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Activity, ArrowDownLeft, ArrowUpRight, BookOpen, Boxes, Users } from 'lucide-react';
import { TransactionForm } from './TransactionsPage.jsx';
import { Empty, PageHeader, StatCard, Status } from '../components/ui.jsx';

const date = value => new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export default function Dashboard({ books, transactions, users, refresh, notify, user, goToLogin }) {
  const [showTransaction, setShowTransaction] = useState(false);
  const lowStock = books.filter(book => book.quantity < 2);
  const totalCopies = books.reduce((sum, book) => sum + Number(book.quantity), 0);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  return <>
    <PageHeader eyebrow={new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()} title={`${greeting}, ${user?.name?.split(' ')[0] || 'there'}`} description="Here’s what’s happening across your library today." action={<button className="button button-primary" onClick={() => user ? setShowTransaction(true) : goToLogin()}><ArrowUpRight size={16}/> Record a transaction</button>}/>
    <div className="stats-grid"><StatCard label="Titles in collection" value={books.length.toLocaleString()} caption="Unique books catalogued" icon={BookOpen}/><StatCard label="Copies available" value={totalCopies.toLocaleString()} caption="Across all titles" icon={Boxes} tone="blue"/><StatCard label="Registered members" value={user?.role === 'Admin' ? users.length.toLocaleString() : '—'} caption={user?.role === 'Admin' ? 'Active library accounts' : 'Admin sign-in required'} icon={Users} tone="purple"/><StatCard label="Low stock alerts" value={lowStock.length.toLocaleString()} caption="Titles with fewer than 2 copies" icon={Activity} tone={lowStock.length ? 'amber' : 'green'}/></div>
    <div className="dashboard-grid">
      <section className="panel inventory-panel"><div className="panel-heading"><div><div className="eyebrow">YOUR COLLECTION</div><h2>Inventory overview</h2></div><NavLink to="/books" className="text-link">View all books <span>↗</span></NavLink></div>{books.length ? <div className="table-scroll"><table><thead><tr><th>BOOK</th><th>GENRE</th><th>ISBN</th><th>IN STOCK</th><th>STATUS</th></tr></thead><tbody>{books.slice(0, 5).map(book => <tr key={book.id}><td><div className="book-cell"><div className="book-cover">{book.title.slice(0, 1)}</div><span><b>{book.title}</b><small>{book.author}</small></span></div></td><td><span className="genre-tag">{book.genre}</span></td><td className="muted-cell">{book.isbn}</td><td><b>{book.quantity}</b></td><td><Status quantity={book.quantity}/></td></tr>)}</tbody></table></div> : <Empty title="Your collection is ready" text="An administrator can add the first book from Book collection."/>}</section>
      <section className="panel activity-panel"><div className="panel-heading"><div><div className="eyebrow">LIVE UPDATES</div><h2>Recent activity</h2></div><NavLink to="/transactions" className="icon-link" aria-label="View transactions">↗</NavLink></div>{transactions.length ? <div className="activity-list">{transactions.slice(0, 5).map(transaction => <div className="activity-row" key={transaction.id}><div className={`activity-icon ${transaction.type === 'borrow' ? 'borrow' : 'stock'}`}>{transaction.type === 'borrow' ? <ArrowUpRight size={15}/> : <ArrowDownLeft size={15}/>}</div><div className="activity-copy"><b>{transaction.type === 'borrow' ? 'Book borrowed' : 'Stock received'}</b><span>{transaction.book_title || 'Deleted book'} · {transaction.quantity} {transaction.quantity === 1 ? 'copy' : 'copies'}</span><small>{transaction.user_name || 'Library staff'} · {date(transaction.created_at)}</small></div></div>)}</div> : <Empty title={user ? 'No activity yet' : 'Sign in to see your activity'} text={user ? 'Your transactions will appear here.' : 'Sign in to record a borrowing and view your history.'}/>}<div className="activity-foot"><span className="live-dot"/> Activity updates when a transaction is recorded</div></section>
    </div>
    {lowStock.length > 0 && <div className="alert-banner"><div className="alert-symbol">!</div><div><b>{lowStock.length} {lowStock.length === 1 ? 'title needs' : 'titles need'} attention</b><span>{lowStock.map(book => book.title).slice(0, 3).join(', ')}{lowStock.length > 3 ? ` and ${lowStock.length - 3} more` : ''} {lowStock.length === 1 ? 'has' : 'have'} fewer than 2 copies remaining.</span></div><NavLink to="/books" className="text-link">Review stock <span>→</span></NavLink></div>}
    {showTransaction && <TransactionForm books={books} users={users} user={user} close={() => setShowTransaction(false)} onDone={async () => { await refresh(); setShowTransaction(false); notify('Transaction recorded successfully'); }}/ >}
  </>;
}
