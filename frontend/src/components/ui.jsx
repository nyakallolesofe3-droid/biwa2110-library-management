import { BookOpen } from 'lucide-react';

export function PageHeader({ eyebrow, title, description, action }) {
  return <div className="page-header"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action && <div className="header-action">{action}</div>}</div>;
}

export function StatCard({ label, value, caption, icon: Icon, tone = 'green' }) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={19}/></div><span className="stat-label">{label}</span><strong>{value}</strong><span className="stat-caption">{caption}</span></div>;
}

export function Status({ quantity }) {
  return <span className={`status ${quantity < 2 ? 'status-low' : quantity < 5 ? 'status-medium' : 'status-good'}`}><i/>{quantity < 2 ? 'Low stock' : quantity < 5 ? 'Running low' : 'In stock'}</span>;
}

export function Empty({ title, text, action }) {
  return <div className="empty"><div className="empty-icon"><BookOpen size={20}/></div><b>{title}</b><p>{text}</p>{action}</div>;
}

export function Field({ label, name, value, change, placeholder, type = 'text', required, min, max, autoComplete }) {
  return <label className="field"><span>{label}{required && <i> *</i>}</span><input name={name} type={type} value={value} onChange={change} placeholder={placeholder} required={required} min={min} max={max} autoComplete={autoComplete}/></label>;
}

export function Modal({ title, subtitle, close, children }) {
  return <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && close()}><div className="modal" role="dialog" aria-modal="true" aria-label={title}><div className="modal-heading"><div><h2>{title}</h2><p>{subtitle}</p></div><button className="icon-button" onClick={close} aria-label="Close">×</button></div>{children}</div></div>;
}
