import { useState } from 'react';
import { api } from '../api.js';
import { Field, Modal } from './ui.jsx';

export default function BookForm({ book, close, onDone }) {
  const [form, setForm] = useState({ title: book?.title || '', author: book?.author || '', genre: book?.genre || '', isbn: book?.isbn || '', quantity: book?.quantity ?? 0 });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const change = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }));
  const submit = async event => {
    event.preventDefault(); setError(''); setSaving(true);
    try {
      await api(book ? `/books/${book.id}` : '/books', { method: book ? 'PUT' : 'POST', body: { ...form, quantity: Number(form.quantity) } });
      await onDone();
    } catch (problem) { setError(problem.message); } finally { setSaving(false); }
  };
  return <Modal title={book ? 'Edit book details' : 'Add a new book'} subtitle={book ? 'Update catalogue information and current stock.' : 'Add a title to the library catalogue.'} close={close}><form onSubmit={submit}>
    <div className="form-grid"><Field label="Book title" name="title" value={form.title} change={change} placeholder="e.g. Things Fall Apart" required/><Field label="Author" name="author" value={form.author} change={change} placeholder="Author’s full name" required/><Field label="Genre" name="genre" value={form.genre} change={change} placeholder="e.g. Fiction" required/><Field label="ISBN" name="isbn" value={form.isbn} change={change} placeholder="13-digit ISBN" required/><Field label="Initial quantity" name="quantity" type="number" min="0" value={form.quantity} change={change} required/></div>
    {error && <div className="form-error">{error}</div>}
    <div className="modal-actions"><button type="button" className="button button-light" onClick={close}>Cancel</button><button className="button button-primary" disabled={saving}>{saving ? 'Saving…' : book ? 'Save changes' : 'Add book'}</button></div>
  </form></Modal>;
}
