import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { Icon, Logo, Loading, useLoad } from './ui.jsx';
import { api } from '../api.js';

// Re-mounts on every route change so each page plays the enter animation,
// and opens the new page at the top (unless the link points at an anchor like #how).
function Page() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [pathname, hash]);
  return <div className="page" key={pathname}><Outlet /></div>;
}

// Site header: actions on the right, links in the middle, logo on the left.
// Translucent over the page, gains a hairline once the page scrolls; links fold into a menu on phones.
function SiteHeader() {
  const { user, unread, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const home = user?.role === 'company' ? '/company' : user?.role === 'admin' ? '/admin' : null;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { to: '/', label: 'الرئيسية', end: true },
    { to: '/search', label: 'تصفّح السيارات' },
    { to: '/assistant', label: 'المساعد الذكي' },
    ...(user?.role === 'renter' ? [{ to: '/rentals', label: 'حجوزاتي' }] : []),
    ...(home ? [{ to: home, label: 'لوحة التحكم' }] : []),
  ];

  return (
    <header className={`site-header ${scrolled ? 'scrolled' : ''}`}>
      <div className="container bar">
        <div className="actions">
          <button type="button" className="nav-link icon menu-btn" aria-expanded={open} aria-controls="site-menu" aria-label={open ? 'سكّر القائمة' : 'افتح القائمة'} onClick={() => setOpen(!open)}>
            <Icon name={open ? 'close' : 'menu'} size={22} />
          </button>
          {!user && (
            <>
              <Link to="/login" className="btn sm">تسجيل الدخول</Link>
              <Link to="/register?role=renter" className="text-link hide-sm">إنشاء حساب</Link>
            </>
          )}
          {user && (
            <>
              <Link to="/profile" className="avatar" aria-label="حسابي">{user.name[0]}</Link>
              <Link to="/notifications" className="nav-link icon" aria-label={unread > 0 ? `الإشعارات، ${unread} جداد` : 'الإشعارات'}>
                <Icon name="bell" size={22} />{unread > 0 && <span className="dot" aria-hidden="true">{unread}</span>}
              </Link>
              {user.role === 'renter' && <Link to="/favorites" className="nav-link icon" aria-label="المفضلة"><Icon name="heart" /></Link>}
              <button type="button" className="text-link hide-sm" onClick={() => { logout(); navigate('/'); }}>خروج</button>
            </>
          )}
        </div>
        <nav id="site-menu" className={`main-nav ${open ? 'open' : ''}`} aria-label="القائمة الرئيسية">
          {links.map((l) => <NavLink key={l.to} to={l.to} end={l.end} onClick={() => setOpen(false)}>{l.label}</NavLink>)}
        </nav>
        <Logo />
      </div>
    </header>
  );
}

// Legal pages don't exist yet, so those entries are plain text until they do.
const FOOTER = [
  { title: 'Redrive', links: [['/', 'عن المنصة'], ['/assistant', 'تواصل معنا'], ['/assistant', 'الأسئلة الشائعة']] },
  { title: 'للمستأجرين', links: [['/search', 'تصفّح السيارات'], ['/#how', 'كيف بتستأجر'], ['/register?role=renter', 'توثيق الحساب']] },
  { title: 'للشركات', links: [['/register?role=company', 'بوابة الشركات'], ['/login', 'دخول الشركات']] },
  { title: 'قانوني', links: [[null, 'الشروط والأحكام'], [null, 'سياسة الخصوصية'], [null, 'سياسة الإلغاء']] },
];

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Logo />
          <p>المنصة الفلسطينية لتأجير السيارات. سيارات من شركات مرخّصة وموثّقة، والدفع أونلاين بأمان.</p>
        </div>
        {FOOTER.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h3>{col.title}</h3>
            <ul>{col.links.map(([to, label]) => <li key={label}>{to ? <Link to={to}>{label}</Link> : <span>{label}</span>}</li>)}</ul>
          </nav>
        ))}
      </div>
      <div className="container footer-bottom">
        <span>© 2026 Redrive · المنصة الفلسطينية لتأجير السيارات</span>
        <span>صور السيارات: Alexander Migl و Alexander-93، ويكيميديا كومنز · CC BY-SA 4.0</span>
      </div>
    </footer>
  );
}

// Trust points scrolling in a strip above the header (moving rightward, as Arabic tickers do).
// The list repeats so the loop is seamless; copies after the first are hidden from screen readers.
const PERKS = [['shield', 'شركات مرخّصة وموثّقة من الإدارة'], ['card', 'دفع آمن أونلاين وبتسترجع فلوسك'], ['star', 'تقييمات من الطرفين']];

function PerksTicker() {
  const run = [...PERKS, ...PERKS, ...PERKS];
  return (
    <div className="ticker" role="region" aria-label="مزايا Redrive">
      <ul className="ticker-track">
        {[...run, ...run].map(([icon, text], i) => (
          <li key={i} aria-hidden={i >= PERKS.length ? true : undefined}><Icon name={icon} size={16} color="#8FB4FF" />{text}</li>
        ))}
      </ul>
    </div>
  );
}

export function PublicLayout() {
  return (
    <>
      <PerksTicker />
      <SiteHeader />
      <Page />
      <SiteFooter />
    </>
  );
}

export function RequireAuth({ roles, children }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <Loading />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function Side({ links, subtitle }) {
  const { user, logout, unread } = useAuth();
  const navigate = useNavigate();
  return (
    <aside className="side">
      <Logo to={user.role === 'admin' ? '/admin' : '/company'} label="Redrive، لوحة التحكم" />
      <div className="who">
        <span className="avatar">{user.name[0]}</span>
        <div className="col" style={{ gap: 0, minWidth: 0 }}>
          <b style={{ fontSize: 15, fontWeight: 600 }}>{user.name}</b>
          <span className="small muted">{subtitle}</span>
        </div>
      </div>
      {links.map((l) => (
        <NavLink key={l.to} to={l.to} end={l.end}>
          <span>{l.label}</span>{l.count > 0 && <span className="count">{l.count}</span>}
        </NavLink>
      ))}
      <NavLink to="/notifications"><span>الإشعارات</span>{unread > 0 && <span className="count">{unread}</span>}</NavLink>
      <div style={{ flex: 1 }} />
      <button type="button" className="link" onClick={() => { logout(); navigate('/'); }}>تسجيل الخروج</button>
    </aside>
  );
}

export function CompanyLayout() {
  const { user } = useAuth();
  const { data } = useLoad(() => api('/rentals/mine?status=pending'), [useLocation().pathname]);
  if (user.status !== 'verified') {
    return (
      <div className="container" style={{ paddingBlock: 48 }}>
        <Logo />
        <div className="card col" style={{ marginTop: 24, maxWidth: 560 }}>
          <h2>حسابك لسا مش موثّق</h2>
          <p className="muted">
            {user.status === 'rejected' ? `انرفض التوثيق: ${user.rejectionReason}. ارفع الوثائق من جديد.` : user.status === 'pending' ? 'الإدارة بتراجع وثائق شركتك، وبيوصلك إشعار وإيميل بالقرار.' : 'كمّل خطوات التسجيل وارفع وثائق الشركة.'}
          </p>
          {user.status !== 'pending' && <Link to="/register?resume=1" className="btn">كمّل التسجيل</Link>}
        </div>
      </div>
    );
  }
  const links = [
    { to: '/company', label: 'لوحة التحكم', end: true },
    { to: '/company/cars', label: 'سياراتي', end: true },
    { to: '/company/cars/new', label: 'أضف سيارة' },
    { to: '/company/requests', label: 'طلبات الإيجار', count: data?.rentals?.length },
    { to: '/company/rentals', label: 'الحجوزات' },
    { to: '/company/finance', label: 'التقارير المالية' },
    { to: '/company/settings', label: 'إعدادات الشركة' },
  ];
  return (
    <div className="portal">
      <Side links={links} subtitle="شركة موثّقة" />
      <main><Page /></main>
    </div>
  );
}

export function AdminLayout() {
  const { data } = useLoad(() => api('/admin/dashboard'), [useLocation().pathname]);
  const links = [
    { to: '/admin', label: 'نظرة عامة', end: true },
    { to: '/admin/verify', label: 'توثيق الحسابات', count: data?.pendingUsers },
    { to: '/admin/cars', label: 'اعتماد السيارات', count: data?.pendingCars },
    { to: '/admin/users', label: 'المستخدمين' },
  ];
  return (
    <div className="portal">
      <Side links={links} subtitle="مدير المنصة" />
      <main><Page /></main>
    </div>
  );
}

export function PageTitle({ title, sub, children }) {
  return (
    <div className="page-title">
      <div className="col" style={{ gap: 2 }}>
        <h1>{title}</h1>
        {sub && <span className="muted">{sub}</span>}
      </div>
      {children && <div className="row">{children}</div>}
    </div>
  );
}
