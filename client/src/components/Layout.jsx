import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, useLiveRefresh } from '../auth.jsx';
import { Icon, Logo, Loading, useLoad } from './ui.jsx';
import { api } from '../api.js';
import { initial } from '../labels.js';

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
              <Link to="/login" className="btn sm"><span className="lbl-long">تسجيل الدخول</span><span className="lbl-short">دخول</span></Link>
              <Link to="/register?role=renter" className="text-link hide-sm">إنشاء حساب</Link>
            </>
          )}
          {user && (
            <>
              <Link to="/profile" className="avatar" aria-label="حسابي">{initial(user.name)}</Link>
              <Link to="/notifications" className="nav-link icon" aria-label={unread > 0 ? `الإشعارات، ${unread} جداد` : 'الإشعارات'}>
                <Icon name="bell" size={22} />{unread > 0 && <span className="dot" aria-hidden="true">{unread}</span>}
              </Link>
              {user.role === 'renter' && <Link to="/favorites" className="nav-link icon hide-xs" aria-label="المفضلة"><Icon name="heart" /></Link>}
              <button type="button" className="text-link hide-sm" onClick={() => { logout(); navigate('/'); }}>خروج</button>
            </>
          )}
        </div>
        <nav id="site-menu" className={`main-nav ${open ? 'open' : ''}`} aria-label="القائمة الرئيسية">
          {links.map((l) => <NavLink key={l.to} to={l.to} end={l.end} onClick={() => setOpen(false)}>{l.label}</NavLink>)}
          {user?.role === 'renter' && <NavLink to="/favorites" className="menu-only" onClick={() => setOpen(false)}>المفضلة</NavLink>}
          {user && <button type="button" className="menu-only menu-logout" onClick={() => { setOpen(false); logout(); navigate('/'); }}>تسجيل الخروج</button>}
        </nav>
        <Logo />
      </div>
    </header>
  );
}

const FOOTER = [
  { title: 'Redrive', links: [['/', 'عن المنصة'], ['/assistant', 'تواصل معنا'], ['/assistant', 'الأسئلة الشائعة']] },
  { title: 'للمستأجرين', links: [['/search', 'تصفّح السيارات'], ['/#how', 'كيف بتستأجر'], ['/register?role=renter', 'توثيق الحساب']] },
  { title: 'للشركات', links: [['/register?role=company', 'بوابة الشركات'], ['/login', 'دخول الشركات']] },
  { title: 'قانوني', links: [['/terms', 'الشروط والأحكام'], ['/terms#privacy', 'سياسة الخصوصية'], ['/terms#cancel', 'سياسة الإلغاء']] },
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

// Renters who can't book yet (documents missing, under review or rejected) see why, on every page.
function AccountBanner() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  if (!user || user.role !== 'renter' || user.status === 'verified' || pathname.startsWith('/register')) return null;
  const [icon, text, action] = user.status === 'pending'
    ? ['clock', 'وثائقك قيد المراجعة عند الإدارة. بتقدر تتصفح هلأ، والحجز بيصير متاح بعد التوثيق.', null]
    : user.status === 'rejected'
      ? ['alert', `انرفض توثيق حسابك: ${user.rejectionReason || 'راجع الوثائق'}.`, 'ارفع الوثائق من جديد']
      : user.status === 'blocked'
        ? ['alert', 'حسابك محظور. تواصل مع الدعم من صفحة المساعد.', null]
        : ['info', 'كمّل توثيق حسابك (الجوال والإيميل والوثائق) عشان تقدر تحجز.', 'كمّل التسجيل'];
  return (
    <div className={`acct-banner ${user.status}`} role="status">
      <div className="container"><Icon name={icon} size={18} /><span>{text}</span>{action && <Link to="/register?resume=1">{action}</Link>}</div>
    </div>
  );
}

export function PublicLayout() {
  return (
    <>
      <PerksTicker />
      <SiteHeader />
      <AccountBanner />
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

// Portal sidebar: navy, icon links with counts, account card, notifications and log out at the bottom.
// Under 960px it becomes a top bar whose menu opens below it.
function Side({ links, subtitle, home }) {
  const { user, logout, unread } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <aside className={`side${open ? ' open' : ''}`} aria-label="قائمة لوحة التحكم">
      <div className="side-top">
        <Logo to={home} label="Redrive، لوحة التحكم" />
        <button type="button" className="side-menu-btn" aria-expanded={open} aria-controls="side-body" aria-label={open ? 'سكّر القائمة' : 'افتح القائمة'} onClick={() => setOpen(!open)}>
          <Icon name={open ? 'close' : 'menu'} size={22} />
        </button>
      </div>
      <div className="side-body" id="side-body">
        <div className="who">
          <span className="avatar" aria-hidden="true">{initial(user.name)}</span>
          <div className="grow" style={{ minWidth: 0 }}><b>{user.name}</b><small>{subtitle}</small></div>
        </div>
        <nav className="side-nav col" style={{ gap: 2 }} aria-label="أقسام لوحة التحكم">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className="nav" onClick={close}>
              <Icon name={l.icon} size={20} /><span className="l">{l.label}</span>{l.count > 0 && <span className="count">{l.count}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="side-foot">
          <NavLink to="/notifications" className="nav" onClick={close}><Icon name="bell" size={20} /><span className="l">الإشعارات</span>{unread > 0 && <span className="count">{unread}</span>}</NavLink>
          <Link to="/" className="nav"><Icon name="external" size={20} /><span className="l">الموقع العام</span></Link>
          <button type="button" className="nav logout" onClick={() => { logout(); navigate('/'); }}><Icon name="logout" size={20} /><span className="l">تسجيل الخروج</span></button>
        </div>
      </div>
    </aside>
  );
}

// A company that is not verified yet sees this instead of the portal.
function CompanyGate({ user }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const text = user.status === 'rejected'
    ? `انرفض التوثيق: ${user.rejectionReason}. ارفع الوثائق من جديد.`
    : user.status === 'pending'
      ? 'الإدارة بتراجع وثائق شركتك، عادة خلال يوم عمل. بيوصلك إشعار وإيميل بالقرار، وبعدها بتقدر تضيف سياراتك.'
      : 'كمّل خطوات التسجيل وارفع وثائق الشركة عشان تبدأ تعرض سياراتك.';
  return (
    <div className="gate">
      <div className="panel gate-card">
        <div className="gate-top"><Logo label="Redrive، الصفحة الرئيسية" /></div>
        <div className="gate-body">
          <span className={`ic-tile ${user.status === 'rejected' ? 'bad' : 'warn'}`}><Icon name={user.status === 'rejected' ? 'alert' : 'clock'} size={18} /></span>
          <h1 style={{ fontSize: 'var(--fs-3)', color: 'var(--navy)' }}>{user.status === 'pending' ? 'حساب شركتك قيد المراجعة' : 'حساب شركتك لسا مش موثّق'}</h1>
          <p className="muted">{text}</p>
          <div className="row">
            {user.status !== 'pending' && <Link to="/register?resume=1" className="btn">كمّل التسجيل</Link>}
            <Link to="/notifications" className="btn secondary"><Icon name="bell" size={18} />الإشعارات</Link>
            <button type="button" className="btn ghost" onClick={() => { logout(); navigate('/'); }}>تسجيل الخروج</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CompanyLayout() {
  const { user } = useAuth();
  const { data, refresh } = useLoad(() => api('/rentals/mine?status=pending'), [useLocation().pathname]);
  useLiveRefresh(refresh, ['rental']);
  if (user.status !== 'verified') return <CompanyGate user={user} />;
  const links = [
    { to: '/company', label: 'لوحة التحكم', icon: 'home', end: true },
    { to: '/company/cars', label: 'سياراتي', icon: 'car', end: true },
    { to: '/company/cars/new', label: 'أضف سيارة', icon: 'plus' },
    { to: '/company/requests', label: 'طلبات الإيجار', icon: 'inbox', count: data?.rentals?.length },
    { to: '/company/rentals', label: 'الحجوزات', icon: 'calendar' },
    { to: '/company/finance', label: 'التقارير المالية', icon: 'chart' },
    { to: '/company/settings', label: 'إعدادات الشركة', icon: 'settings' },
  ];
  return (
    <div className="portal">
      <Side links={links} subtitle="شركة موثّقة" home="/company" />
      <main><Page /></main>
    </div>
  );
}

export function AdminLayout() {
  const { data, refresh } = useLoad(() => api('/admin/dashboard'), [useLocation().pathname]);
  useLiveRefresh(refresh);
  const links = [
    { to: '/admin', label: 'نظرة عامة', icon: 'home', end: true },
    { to: '/admin/verify', label: 'توثيق الحسابات', icon: 'shield', count: data?.pendingUsers },
    { to: '/admin/cars', label: 'اعتماد السيارات', icon: 'car', count: data?.pendingCars },
    { to: '/admin/users', label: 'المستخدمين', icon: 'users' },
  ];
  return (
    <div className="portal">
      <Side links={links} subtitle="مدير المنصة" home="/admin" />
      <main><Page /></main>
    </div>
  );
}

// Portal page header: optional back link and kicker, the title, a line under it, and actions.
export function PageTitle({ title, sub, children, kicker, back }) {
  return (
    <div className="page-title">
      <div className="col" style={{ gap: 2, minWidth: 0 }}>
        {back && <Link to={back[0]} className="page-back"><Icon name="arrowRight" size={16} />{back[1]}</Link>}
        {kicker && <span className="kicker">{kicker}</span>}
        <h1>{title}</h1>
        {sub && <span className="sub">{sub}</span>}
      </div>
      {children && <div className="row">{children}</div>}
    </div>
  );
}
