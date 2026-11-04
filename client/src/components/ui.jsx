import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CITIES, FUEL, TRANSMISSION, money, carName } from '../labels.js';

export function Logo({ light = false, to = '/' }) {
  return (
    <Link to={to} className="logo" aria-label="Redrive" style={light ? { color: '#fff' } : undefined}>
      <svg width="36" height="36" viewBox="0 0 100 100" aria-hidden="true">
        <rect width="100" height="100" rx="24" fill="#1E5FD9" />
        <g fill="none" stroke="#fff" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round">
          <path d="M30 78 V22 H52 A14 14 0 0 1 52 50 H30" /><path d="M48 50 L74 80" />
        </g>
      </svg>
      <b><span>Re</span>drive</b>
    </Link>
  );
}

export const Badge = ({ tone = '', children }) => <span className={`badge ${tone}`}>{children}</span>;
export const StatusBadge = ({ map, value }) => <Badge tone={map[value]?.tone}>{map[value]?.label || value}</Badge>;

export function Field({ label, error, hint, children }) {
  return (
    <div className="field">
      {label && <label>{label}</label>}
      {children}
      {error ? <span className="error">{error}</span> : hint && <span className="hint">{hint}</span>}
    </div>
  );
}

export function Stars({ value }) {
  if (!value) return <span className="muted small">جديدة</span>;
  return <span className="small"><span style={{ color: 'var(--star)' }}>★</span> {Number(value).toFixed(1)}</span>;
}

export function StarInput({ value, onChange, label }) {
  return (
    <div className="stars" role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button type="button" key={n} className={n <= value ? 'on' : ''} aria-label={`${n} من 5`} onClick={() => onChange(n)}>★</button>
      ))}
    </div>
  );
}

export function CarImage({ car, height }) {
  const photo = car?.photos?.[0];
  return (
    <div className="car-img" style={height ? { aspectRatio: 'auto', height } : undefined}>
      {photo ? <img src={photo} alt={carName(car)} /> : (
        <svg width="55%" viewBox="0 0 220 90" aria-hidden="true">
          <path d="M18 62c0-9 5-14 14-16l26-6 22-18c4-3 9-5 14-5h46c6 0 11 2 15 6l18 17 26 5c9 2 15 8 15 17v6c0 4-3 7-7 7H25c-4 0-7-3-7-7z" fill="#B9C8DC" />
          <path d="M86 25c3-2 6-3 10-3h40c4 0 8 1 11 4l15 14H70z" fill="#E8EFF7" />
          <circle cx="60" cy="74" r="13" fill="#55607A" /><circle cx="60" cy="74" r="5" fill="#D5DBE6" />
          <circle cx="166" cy="74" r="13" fill="#55607A" /><circle cx="166" cy="74" r="5" fill="#D5DBE6" />
        </svg>
      )}
    </div>
  );
}

export function CarCard({ car, days, extra }) {
  return (
    <Link to={`/cars/${car._id}`} className="car-card">
      <CarImage car={car} />
      <div className="body">
        <div className="row between">
          <b>{car.brand} {car.model} <span className="muted" style={{ fontWeight: 400 }}>{car.year}</span></b>
          <Stars value={car.ratingAvg} />
        </div>
        <span className="muted small">{TRANSMISSION[car.transmission]} · {FUEL[car.fuel]} · {car.seats} مقاعد · {CITIES[car.city]}</span>
        {car.company?.name && <span className="small">{car.company.name}</span>}
        <div className="row between" style={{ marginTop: 4 }}>
          <span><span className="price">{money(car.dailyPrice)}</span><span className="muted small">/يوم</span></span>
          {days > 0 && <span className="muted small">{money(car.dailyPrice * days)} المجموع</span>}
          {car.distanceKm != null && <span className="muted small">{car.distanceKm} كم</span>}
        </div>
        {extra}
      </div>
    </Link>
  );
}

export function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  );
}

export function Loading() {
  return <div className="empty">عم نحمّل…</div>;
}

export function Empty({ title, text, action }) {
  return (
    <div className="empty card">
      <h3 style={{ color: 'var(--ink)', marginBottom: 6 }}>{title}</h3>
      {text && <p>{text}</p>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}

export function ErrorBox({ error }) {
  if (!error) return null;
  return <div className="alert red" role="alert">{error}</div>;
}

// Small async-loader hook: const { data, error, loading, reload } = useLoad(() => api('/x'), [deps])
export function useLoad(fn, deps = []) {
  const [state, setState] = useState({ data: null, error: '', loading: true });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    fn().then((data) => alive && setState({ data, error: '', loading: false }))
      .catch((e) => alive && setState({ data: null, error: e.message, loading: false }));
    return () => { alive = false; };
  }, [...deps, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  return { ...state, reload: () => setTick((t) => t + 1) };
}
