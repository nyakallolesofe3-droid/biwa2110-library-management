import { useCallback, useEffect, useState } from 'react';
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Activity, BookOpen, Boxes, ChevronDown, CircleHelp, LayoutDashboard, LogOut, Menu, Settings, Users, X } from 'lucide-react';
import { api, getAuthToken, setAuthToken } from './api.js';
import Dashboard from './pages/Dashboard.jsx';
import BooksPage from './pages/BooksPage.jsx';
import TransactionsPage from './pages/TransactionsPage.jsx';
import UsersPage from './pages/UsersPage.jsx';

const nav = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/books', label: 'Book collection', icon: BookOpen },
  { to: '/transactions', label: 'Transactions', icon: Activity },
  { to: '/users', label: 'Members', icon: Users },
];
const initials = (name = 'Library Admin') => name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase();

function App() {
  const [books, setBooks] = useState([]), [users, setUsers] = useState([]), [transactions, setTransactions] = useState([]);
  const [user, setUser] = useState(() => { try { return JSON.parse(sessionStorage.getItem('biwa-user')); } catch { return null; } });
  const [toast, setToast] = useState(''), [mobileNav, setMobileNav] = useState(false);
  const navigate = useNavigate();
  const refresh = useCallback(async () => {
    const bookRows = await api('/books');
    const signedIn = Boolean(getAuthToken());
    const [transactionRows, userRows] = await Promise.all([
      signedIn ? api('/transactions') : Promise.resolve([]),
      signedIn && user?.role === 'Admin' ? api('/users') : Promise.resolve([]),
    ]);
    setBooks(bookRows); setUsers(userRows); setTransactions(transactionRows);
  }, [user]);
  useEffect(() => { refresh().catch((err) => setToast(err.message)); }, [refresh]);
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(''), 3600); return () => clearTimeout(id); }, [toast]);
  const notify = (message) => setToast(message);
  const login = (result) => { setAuthToken(result.token); setUser(result.user); sessionStorage.setItem('biwa-user', JSON.stringify(result.user)); notify(`Welcome, ${result.user.name.split(' ')[0]}`); };
  const logout = () => { setAuthToken(null); setUser(null); sessionStorage.removeItem('biwa-user'); setUsers([]); setTransactions([]); notify('You have signed out'); };
  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><BookOpen size={20}/></div><div><strong>northstar</strong><span>LIBRARY SYSTEM</span></div><button className="mobile-close icon-button" onClick={() => setMobileNav(false)} aria-label="Close menu"><X size={19}/></button></div>
      <div className="workspace-label">WORKSPACE</div><div className="campus-switch"><div className="campus-avatar">L</div><div><b>Limkokwing Library</b><span>Lesotho campus</span></div><ChevronDown size={15}/></div>
      <div className="nav-label">MAIN MENU</div><nav className="main-nav">{nav.map(({ to,label,icon:Icon,end })=><NavLink key={to} to={to} end={end} onClick={()=>setMobileNav(false)} className={({isActive})=>`nav-link ${isActive?'active':''}`}><Icon size={18}/><span>{label}</span>{label==='Book collection'&&<span className="nav-count">{books.length}</span>}</NavLink>)}</nav>
      <div className="sidebar-bottom"><div className="nav-label">SUPPORT</div><button className="nav-link"><CircleHelp size={18}/><span>Help centre</span></button><button className="nav-link"><Settings size={18}/><span>Settings</span></button><div className="sidebar-note"><div className="note-icon"><Boxes size={16}/></div><div><b>Library tip</b><p>Keep stock levels up to date so members can find what they need.</p></div></div><div className="sidebar-footer">BIWA2110 · SEMESTER 1 <span>v1.0.0</span></div></div>
    </aside>
    {mobileNav&&<button aria-label="Close navigation" className="scrim" onClick={()=>setMobileNav(false)}/>}
    <main className="main-area"><header className="topbar"><div className="crumb"><button className="mobile-menu icon-button" onClick={()=>setMobileNav(true)} aria-label="Open menu"><Menu size={20}/></button><span>Workspace</span><span className="crumb-slash">/</span><PageName/></div><div className="top-actions"><span className="today-label">{new Date().toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'})}</span><span className="top-divider"/><button className="profile" onClick={user?logout:()=>navigate('/users')} title={user?'Sign out':'Sign in'}><div className="profile-avatar">{user?initials(user.name):'G'}</div><span><b>{user?.name||'Guest session'}</b><small>{user?.role||'Sign in'}</small></span>{user?<LogOut size={15}/>:<span className="profile-dot"/>}</button></div></header>
      <div className="page-wrap"><Routes>
        <Route path="/" element={<Dashboard books={books} transactions={transactions} users={users} refresh={refresh} notify={notify} user={user} goToLogin={()=>navigate('/users')}/>}/>
        <Route path="/books" element={<BooksPage books={books} refresh={refresh} notify={notify} user={user}/>}/>
        <Route path="/transactions" element={<TransactionsPage books={books} users={users} transactions={transactions} refresh={refresh} notify={notify} user={user} goToLogin={()=>navigate('/users')}/>}/>
        <Route path="/users" element={<UsersPage users={users} refresh={refresh} notify={notify} user={user} login={login}/>}/>
      </Routes><footer className="page-footer"><span>© 2025 Limkokwing University of Creative Technology</span><span>Library management · BIWA2110</span></footer></div>
    </main>{toast&&<div className={`toast ${toast.toLowerCase().includes('could not')||toast.toLowerCase().includes('failed')?'toast-error':''}`} role="status"><span className="toast-mark">✓</span>{toast}<button onClick={()=>setToast('')} aria-label="Dismiss"><X size={15}/></button></div>}
  </div>;
}
function PageName(){const location=useLocation();return <b>{nav.find(n=>n.to===location.pathname)?.label||'Overview'}</b>}
export default App;
