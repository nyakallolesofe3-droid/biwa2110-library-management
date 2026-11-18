import { useState } from 'react';
import { Search, Users } from 'lucide-react';
import { api } from '../api.js';
import { Empty, Field, Modal, PageHeader } from '../components/ui.jsx';

const initials = (name = '') => name.split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase();
const date = value => new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export default function UsersPage({ users, refresh, notify, user, login }) {
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const admin = user?.role === 'Admin';
  const filtered = users.filter(member => `${member.name} ${member.membership_id} ${member.role}`.toLowerCase().includes(query.toLowerCase()));
  const remove = async member => {
    if (!window.confirm(`Remove ${member.name} from the member list?`)) return;
    try { await api(`/users/${member.id}`, { method: 'DELETE' }); await refresh(); notify('Member removed'); }
    catch (error) { notify(error.message); }
  };
  return <>
    <PageHeader eyebrow="MEMBER DIRECTORY" title="Members" description="Manage library accounts and membership access." action={admin && <button className="button button-primary" onClick={() => setModal({})}>＋ Add a member</button>}/>
    {!user ? <div className="login-prompt"><div className="prompt-icon"><Users size={19}/></div><div><b>Administrator sign-in</b><span>Sign in to manage member accounts.</span></div><button className="button button-light" onClick={() => setLoginOpen(true)}>Sign in</button></div> : admin ? <div className="signed-in-banner"><div className="profile-avatar">{initials(user.name)}</div><div><b>Signed in as {user.name}</b><span>{user.role} · {user.membershipId}</span></div><span className="verified-tag">● Administrator</span></div> : <div className="login-prompt"><div><b>Administrator access required</b><span>Your account can borrow books, but only an administrator can manage members.</span></div></div>}
    {admin && <>
      <div className="collection-summary"><div><Users size={18}/><span><b>{users.length} members</b><small>registered accounts</small></span></div><span className="summary-divider"/><div><span className="role-dot admin-dot"/><span><b>{users.filter(member => member.role === 'Admin').length} administrators</b><small>with system access</small></span></div><div className="summary-right"><div className="search-box"><Search size={16}/><input placeholder="Search name or membership ID…" value={query} onChange={event => setQuery(event.target.value)}/></div></div></div>
      <section className="panel table-panel"><div className="panel-heading"><div><div className="eyebrow">USER DIRECTORY</div><h2>All members <span className="count-pill">{filtered.length}</span></h2></div><span className="table-hint">Roles control administrator access</span></div>
        {filtered.length ? <div className="table-scroll"><table><thead><tr><th>MEMBER</th><th>MEMBERSHIP ID</th><th>ROLE</th><th>JOINED</th><th>ACTIONS</th></tr></thead><tbody>{filtered.map((member, index) => <tr key={member.id}><td><div className="member-cell"><div className={`member-avatar avatar-${index % 5}`}>{initials(member.name)}</div><span><b>{member.name}</b><small>{member.role === 'Admin' ? 'Library administrator' : 'Library member'}</small></span></div></td><td className="muted-cell">{member.membership_id}</td><td><span className={`role-tag role-${member.role.toLowerCase()}`}><i/>{member.role}</span></td><td className="muted-cell">{date(member.created_at)}</td><td><div className="row-actions"><button onClick={() => setModal(member)} aria-label={`Edit ${member.name}`} title="Edit">✎</button><button onClick={() => remove(member)} disabled={member.id === user.id} aria-label={`Delete ${member.name}`} title={member.id === user.id ? 'You cannot delete your signed-in account' : 'Delete'}>⌫</button></div></td></tr>)}</tbody></table></div> : <Empty title="No members found" text="Add members to let them borrow books and build a lending history." action={!query && <button className="button button-light" onClick={() => setModal({})}>Add a member</button>}/>}
      </section>
    </>}
    {modal && <UserForm person={modal.id ? modal : null} close={() => setModal(null)} onDone={async () => { await refresh(); setModal(null); notify(modal.id ? 'Member details updated' : 'Member added'); }}/ >}
    {loginOpen && <LoginForm close={() => setLoginOpen(false)} onLogin={async credentials => { const result = await api('/auth/login', { method: 'POST', body: credentials }); login(result); setLoginOpen(false); }}/ >}
  </>;
}

export function UserForm({ person, close, onDone }) {
  const [form, setForm] = useState({ name: person?.name || '', membershipId: person?.membership_id || '', role: person?.role || 'Student', password: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const change = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }));
  const submit = async event => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const body = { name: form.name, membershipId: form.membershipId, role: form.role };
      if (!person || form.password) body.password = form.password;
      await api(person ? `/users/${person.id}` : '/users', { method: person ? 'PUT' : 'POST', body });
      await onDone();
    } catch (problem) { setError(problem.message); } finally { setSaving(false); }
  };
  return <Modal title={person ? 'Edit member details' : 'Add a member'} subtitle={person ? 'Leave password blank to keep the current one.' : 'Create an account with a secure sign-in password.'} close={close}><form onSubmit={submit}>
    <Field label="Full name" name="name" value={form.name} change={change} placeholder="Member’s full name" required autoComplete="name"/>
    <Field label="Membership ID" name="membershipId" value={form.membershipId} change={change} placeholder="e.g. LKU202501" required/>
    <label className="field"><span>Role</span><select name="role" value={form.role} onChange={change}><option>Student</option><option>Staff</option><option>Admin</option></select></label>
    <Field label={person ? 'New password (optional)' : 'Password'} name="password" type="password" value={form.password} change={change} placeholder="At least 10 characters" required={!person} autoComplete="new-password"/>
    {error && <div className="form-error">{error}</div>}
    <div className="modal-actions"><button type="button" className="button button-light" onClick={close}>Cancel</button><button className="button button-primary" disabled={saving}>{saving ? 'Saving…' : person ? 'Save changes' : 'Add member'}</button></div>
  </form></Modal>;
}

function LoginForm({ close, onLogin }) {
  const [form, setForm] = useState({ membershipId: '', password: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const change = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }));
  const submit = async event => {
    event.preventDefault(); setSaving(true); setError('');
    try { await onLogin(form); } catch (problem) { setError(problem.message); } finally { setSaving(false); }
  };
  return <Modal title="Member sign-in" subtitle="Enter your membership ID and password." close={close}><form onSubmit={submit}>
    <Field label="Membership ID" name="membershipId" value={form.membershipId} change={change} placeholder="e.g. LKU202501" required autoComplete="username"/>
    <Field label="Password" name="password" type="password" value={form.password} change={change} required autoComplete="current-password"/>
    {error && <div className="form-error">{error}</div>}
    <div className="modal-actions"><button type="button" className="button button-light" onClick={close}>Cancel</button><button className="button button-primary" disabled={saving}>{saving ? 'Signing in…' : 'Sign in'}</button></div>
  </form></Modal>;
}
