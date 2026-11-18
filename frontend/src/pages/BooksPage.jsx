import { useMemo, useState } from 'react';
import { Activity, BookOpen, Search, Users, X } from 'lucide-react';
import { api } from '../api.js';
import BookForm from '../components/BookForm.jsx';
import { BookList } from '../components/BookList.jsx';
import { PageHeader } from '../components/ui.jsx';

export default function BooksPage({ books, refresh, notify, user }) {
  const [query, setQuery] = useState('');
  const [editingBook, setEditingBook] = useState(null);
  const admin = user?.role === 'Admin';
  const filtered = useMemo(
    () => books.filter(book => `${book.title} ${book.author} ${book.genre} ${book.isbn}`.toLowerCase().includes(query.toLowerCase())),
    [books, query],
  );
  const remove = async book => {
    if (!window.confirm(`Delete “${book.title}” from the collection?`)) return;
    try { await api(`/books/${book.id}`, { method: 'DELETE' }); await refresh(); notify('Book removed from collection'); }
    catch (error) { notify(error.message); }
  };
  return <>
    <PageHeader eyebrow="COLLECTION MANAGEMENT" title="Book collection" description="Manage your titles, keep details current, and monitor stock." action={admin && <button className="button button-primary" onClick={() => setEditingBook({})}>＋ Add a book</button>}/>
    <div className="collection-summary"><div><BookOpen size={18}/><span><b>{books.length} titles</b><small>in your collection</small></span></div><span className="summary-divider"/><div><Activity size={18}/><span><b>{books.filter(book => book.quantity < 2).length} low stock</b><small>need replenishing</small></span></div><div className="summary-right"><div className="search-box"><Search size={16}/><input placeholder="Search title, author, ISBN…" value={query} onChange={event => setQuery(event.target.value)}/>{query && <button onClick={() => setQuery('')} aria-label="Clear search"><X size={14}/></button>}</div></div></div>
    {!admin && <div className="login-prompt"><div className="prompt-icon"><Users size={19}/></div><div><b>Administrator access</b><span>Sign in as an administrator to add, edit, or remove books.</span></div></div>}
    <section className="panel table-panel"><div className="panel-heading"><div><div className="eyebrow">CATALOGUE</div><h2>All books <span className="count-pill">{filtered.length}</span></h2></div><span className="table-hint">Showing {filtered.length} of {books.length} titles</span></div><BookList books={filtered} admin={admin} onEdit={setEditingBook} onDelete={remove} emptyAction={admin && !query && <button className="button button-light" onClick={() => setEditingBook({})}>Add your first book</button>}/></section>
    {editingBook && <BookForm book={editingBook.id ? editingBook : null} close={() => setEditingBook(null)} onDone={async () => { await refresh(); setEditingBook(null); notify(editingBook.id ? 'Book details updated' : 'Book added to collection'); }}/ >}
  </>;
}
