import { cloneElement, isValidElement, useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { CITIES, FUEL, TRANSMISSION, money, carName, carCategory } from '../labels.js';

// Brand mark: midnight-navy tile with a soft top light, white R, and the road line on its leg
// lit in electric blue like an LED strip. Wordmark: "Re" in electric blue, "drive" in midnight.
export function LogoMark({ size = 40 }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" style={{ flex: 'none' }}>
      <defs>
        <linearGradient id={`${id}t`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#22376A" /><stop offset="1" stopColor="#0A1430" /></linearGradient>
        <radialGradient id={`${id}l`} cx=".3" cy="0" r="1"><stop offset="0" stopColor="#FFFFFF" stopOpacity=".22" /><stop offset=".6" stopColor="#FFFFFF" stopOpacity="0" /></radialGradient>
        <filter id={`${id}g`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.6" /></filter>
      </defs>
      <rect width="100" height="100" rx="24" fill={`url(#${id}t)`} />
      <rect width="100" height="100" rx="24" fill={`url(#${id}l)`} />
      <rect x="1" y="1" width="98" height="98" rx="23" fill="none" stroke="#FFFFFF" strokeOpacity=".14" strokeWidth="2" />
      <g fill="none" stroke="#FFFFFF" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round">
        <path d="M30 78 V22 H52 A14 14 0 0 1 52 50 H30" /><path d="M48 50 L74 80" />
      </g>
      <path d="M52.5 55.5 L69.5 75" fill="none" stroke="#4C8DFF" strokeWidth="4" strokeLinecap="round" filter={`url(#${id}g)`} />
      <path d="M52.5 55.5 L69.5 75" fill="none" stroke="#2F6BFF" strokeWidth="2.6" strokeLinecap="round" strokeDasharray="4.5 4.5" />
    </svg>
  );
}

// Smooth scroll to the top of the page (instant when the viewer prefers reduced motion).
function scrollToTop() {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
}

export function Logo({ to = '/', label = 'Redrive، الصفحة الرئيسية' }) {
  return (
    <Link to={to} className="logo" aria-label={label} onClick={scrollToTop}>
      <LogoMark />
      <b><span>Re</span>drive</b>
    </Link>
  );
}

// Line icons from the design (24px grid, 1.8 stroke). Decorative: pair them with a text label or aria-label.
const ICONS = {
  sparkle: <><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" /><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" /></>,
  heart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  bell: <><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
  chevronRight: <path d="M9 6l6 6-6 6" />,
  chevronLeft: <path d="M15 6l-6 6 6 6" />,
  menu: <><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></>,
  close: <><path d="M6 6l12 12" /><path d="M18 6L6 18" /></>,
  shield: <><path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6z" /><path d="M9 12l2 2 4-4" /></>,
  card: <><rect x="3" y="5.5" width="18" height="13" rx="2.5" /><path d="M3 10h18" /><path d="M7 15h3" /></>,
  star: <path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" />,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></>,
  pin: <><path d="M12 21s-6-5.3-6-10a6 6 0 0 1 12 0c0 4.7-6 10-6 10z" /><circle cx="12" cy="11" r="2.2" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 9.5h17" /><path d="M8 3v4" /><path d="M16 3v4" /></>,
  arrowLeft: <><path d="M19 12H5" /><path d="M11 6l-6 6 6 6" /></>,
  arrowRight: <><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></>,
  gear: <><circle cx="6" cy="5" r="1.8" /><circle cx="12" cy="5" r="1.8" /><circle cx="18" cy="5" r="1.8" /><circle cx="6" cy="19" r="1.8" /><circle cx="12" cy="19" r="1.8" /><path d="M6 7v10M12 7v10M18 7v5H6" /></>,
  seat: <><path d="M8 3.5h2.5a2 2 0 0 1 2 2V13h4.5a2 2 0 0 1 2 2v3.5H9.5a2 2 0 0 1-2-1.8L6.5 6.2A2.3 2.3 0 0 1 8 3.5z" /><path d="M10 18.5V21M17 18.5V21" /></>,
  fuel: <><path d="M5 20V6a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v14" /><path d="M3.5 20h12" /><path d="M7.5 8.5h4" /><path d="M14 10h1.5a2 2 0 0 1 2 2v4a1.5 1.5 0 0 0 3 0V8.5L18 6" /></>,
  key: <><circle cx="8" cy="15" r="4.5" /><path d="M11.2 11.8L20 3M16.5 6.5l2.5 2.5M14 9l2 2" /></>,
  chat: <><path d="M4 5.5h16v10H9l-5 4z" /><path d="M8 9.5h8M8 12.5h5" /></>,
  map: <><path d="M3 6.5l6-2.5 6 2.5 6-2.5v13.5l-6 2.5-6-2.5-6 2.5z" /><path d="M9 4v13.5M15 6.5V20" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></>,
  eyeOff: <><path d="M4 4l16 16" /><path d="M9.9 5.8A9.7 9.7 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3 3.8M6.3 7.6C3.9 9.4 2.5 12 2.5 12S6 18.5 12 18.5c1.5 0 2.9-.4 4.1-1" /><path d="M10 10a3 3 0 0 0 4 4" /></>,
  mail: <><rect x="3" y="5.5" width="18" height="13" rx="2.5" /><path d="M4 7l8 6 8-6" /></>,
  phone: <><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M11 18.5h2" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4.5 20.5c1.2-4 4.2-6 7.5-6s6.3 2 7.5 6" /></>,
  building: <><path d="M4.5 20.5V5a1.5 1.5 0 0 1 1.5-1.5h8A1.5 1.5 0 0 1 15.5 5v15.5" /><path d="M15.5 9.5H18a1.5 1.5 0 0 1 1.5 1.5v9.5" /><path d="M3 20.5h18" /><path d="M8 7.5h4M8 11h4M8 14.5h4" /></>,
  upload: <><path d="M12 15.5V4" /><path d="M7.5 8.5L12 4l4.5 4.5" /><path d="M4.5 15v3a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></>,
  filter: <><path d="M4 6.5h16" /><path d="M7 12h10" /><path d="M10 17.5h4" /></>,
  list: <><path d="M9 6.5h11M9 12h11M9 17.5h11" /><circle cx="4.75" cy="6.5" r="1" /><circle cx="4.75" cy="12" r="1" /><circle cx="4.75" cy="17.5" r="1" /></>,
  doc: <><path d="M6.5 3.5h7l4 4v13h-11z" /><path d="M13.5 3.5v4h4" /><path d="M9 12.5h6M9 16h6" /></>,
  info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5" /><path d="M12 7.8v.2" /></>,
};

export function Icon({ name, size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none' }}>
      {ICONS[name]}
    </svg>
  );
}

export const Badge = ({ tone = '', children }) => <span className={`badge ${tone}`}>{children}</span>;
// Status pill with a coloured dot (rental, car and account states).
export const StatusBadge = ({ map, value }) => <span className={`badge status ${map[value]?.tone || ''}`}>{map[value]?.label || value}</span>;

// Form field: the label is tied to its input, and the hint or error is read out with it.
const CONTROLS = new Set(['input', 'select', 'textarea']);
export function Field({ label, error, hint, children }) {
  const id = useId();
  const msgId = `${id}-msg`;
  const msg = error || hint;
  const linkable = isValidElement(children) && CONTROLS.has(children.type);
  const controlId = linkable ? children.props.id || id : undefined;
  const control = linkable
    ? cloneElement(children, {
      id: controlId,
      'aria-describedby': [children.props['aria-describedby'], msg && msgId].filter(Boolean).join(' ') || undefined,
      ...(error && { 'aria-invalid': true }),
    })
    : children;
  return (
    <div className="field">
      {label && <label htmlFor={controlId}>{label}</label>}
      {control}
      {error ? <span className="error" id={msgId}>{error}</span> : hint && <span className="hint" id={msgId}>{hint}</span>}
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

export function CarImage({ car, height, src, alt }) {
  const photo = src || car?.photos?.[0];
  return (
    <div className="car-img" style={height ? { aspectRatio: 'auto', height } : undefined}>
      {photo ? <img src={photo} alt={alt ?? carName(car)} /> : (
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

// Car card: photo with a glass category tag and rating, name, company and city, quick specs with
// icons, the daily price, and a booking button. The whole card is clickable through the title link;
// the button sits above it. On hover the card lifts and an LED-like light runs along its edge.
export function CarCard({ car, days, extra, style }) {
  const to = `/cars/${car._id}`;
  const rated = car.ratingAvg > 0;
  return (
    <article className="car-card" style={style}>
      <div className="car-media">
        <CarImage car={car} />
        <span className="car-tag">{carCategory(car)}</span>
        <span className={`car-rating ${rated ? '' : 'new'}`}>
          {rated ? <><Icon name="star" size={14} color="var(--star)" />{Number(car.ratingAvg).toFixed(1)}</> : 'جديدة'}
        </span>
      </div>
      <div className="body">
        <h3 className="car-title"><Link to={to} className="stretched">{car.brand} {car.model}</Link><span className="car-year">{car.year}</span></h3>
        <span className="car-company">{[car.company?.name, CITIES[car.city]].filter(Boolean).join(' · ')}</span>
        <ul className="specs" aria-label="المواصفات">
          <li><Icon name="gear" size={16} />{TRANSMISSION[car.transmission]}</li>
          <li><Icon name="seat" size={16} />{car.seats} مقاعد</li>
          <li><Icon name="fuel" size={16} />{FUEL[car.fuel]}</li>
        </ul>
        <div className="car-foot">
          <div className="car-price">
            <span><b>{money(car.dailyPrice)}</b> / يوم</span>
            {days > 0 && <small>{money(car.dailyPrice * days)} لـ {days} أيام</small>}
            {car.distanceKm != null && <small>على بعد {car.distanceKm} كم</small>}
          </div>
          <Link to={to} className="btn sm book" aria-label={`احجز ${car.brand} ${car.model}`}>احجز<Icon name="arrowLeft" size={18} /></Link>
        </div>
        {extra}
      </div>
    </article>
  );
}

export function Modal({ title, onClose, children, wide = false }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  );
}

// Page header for inner pages: breadcrumbs, a small kicker, the title, a line under it, and actions.
export function PageHead({ crumbs, kicker, title, sub, children, titleId }) {
  return (
    <div className="page-head">
      {crumbs && (
        <nav className="crumbs" aria-label="مسار الصفحة">
          <ol>{crumbs.map(([to, label]) => <li key={label}>{to ? <Link to={to}>{label}</Link> : <span aria-current="page">{label}</span>}</li>)}</ol>
        </nav>
      )}
      <div className="page-head-row">
        <div className="page-head-copy">
          {kicker && <span className="kicker">{kicker}</span>}
          <h1 id={titleId}>{title}</h1>
          {sub && <p>{sub}</p>}
        </div>
        {children && <div className="page-head-actions">{children}</div>}
      </div>
    </div>
  );
}

// Numbered steps with a line between them; finished steps show a check.
export function Stepper({ steps, current, label = 'خطوات', compact = false }) {
  return (
    <ol className={`stepper${compact ? ' compact' : ''}`} aria-label={label}>
      {steps.map((s, i) => (
        <li key={s} className={i < current ? 'done' : i === current ? 'on' : ''} aria-current={i === current ? 'step' : undefined}>
          <span className="n">{i < current ? <Icon name="check" size={16} /> : i + 1}</span>
          <span className="t">{s}</span>
        </li>
      ))}
    </ol>
  );
}

// Loading placeholder: shimmering lines in the shape of a page.
export function Loading({ lines = 3 }) {
  return (
    <div className="loading" role="status">
      <span className="sr-only">عم نحمّل…</span>
      <div className="skel skel-title" aria-hidden="true" />
      {Array.from({ length: lines }, (_, i) => <div key={i} className="skel skel-line" style={{ width: `${92 - i * 18}%` }} aria-hidden="true" />)}
    </div>
  );
}

// Loading placeholder in the shape of car cards.
export function SkeletonCards({ count = 6, className = 'grid cards' }) {
  return (
    <div className={className} role="status">
      <span className="sr-only">عم نحمّل السيارات…</span>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="car-card skel-card" aria-hidden="true">
          <div className="skel skel-media" />
          <div className="body">
            <div className="skel skel-line" style={{ width: '62%' }} />
            <div className="skel skel-line" style={{ width: '40%' }} />
            <div className="skel skel-line" style={{ width: '86%', height: 30 }} />
            <div className="skel skel-line" style={{ width: '50%', height: 22, marginTop: 8 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Empty({ icon = 'search', title, text, action }) {
  return (
    <div className="empty-state">
      <span className="empty-ic"><Icon name={icon} size={26} color="#FFFFFF" /></span>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action && <div className="empty-act">{action}</div>}
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
