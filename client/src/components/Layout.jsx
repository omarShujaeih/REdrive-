import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { Icon, Logo, Loading, useLoad } from './ui.jsx';
import { api } from '../api.js';

// Re-mounts on every route change so each page plays the enter animation.
function Page() {
  const { pathname } = useLocation();
  return <div className="page" key={pathname}><Outlet /></div>;
}

export function PublicLayout() {
  const { user, unread, logout } = useAuth();
  const navigate = useNavigate();
  const home = user?.role === 'company' ? '/company' : user?.role === 'admin' ? '/admin' : null;
  return (
    <>
      <header className="header">
        <div className="container">
          <Logo />
          <nav className="row" aria-label="القائمة الرئيسية" style={{ gap: 8 }}>
            <Link to="/assistant" className="nav-link"><Icon name="sparkle" color="var(--blue)" />اسأل Redrive</Link>
            {!user && <Link to="/login" className="nav-link">تسجيل الدخول</Link>}
            {user && home && <Link to={home} className="nav-link">لوحة التحكم</Link>}
            {user?.role === 'renter' && (
              <>
                <Link to="/rentals" className="nav-link">حجوزاتي</Link>
                <Link to="/favorites" className="nav-link icon" aria-label="المفضلة"><Icon name="heart" /></Link>
              </>
            )}
            {user && (
              <>
                <Link to="/notifications" className="nav-link icon" aria-label={unread > 0 ? `الإشعارات، ${unread} جداد` : 'الإشعارات'}>
                  <Icon name="bell" size={22} />{unread > 0 && <span className="dot" aria-hidden="true">{unread}</span>}
                </Link>
                <Link to="/profile" className="avatar" aria-label="حسابي">{user.name[0]}</Link>
                <button type="button" className="btn ghost sm" onClick={() => { logout(); navigate('/'); }}>خروج</button>
              </>
            )}
          </nav>
        </div>
      </header>
      <Page />
      <footer className="footer">
        <div className="container row between">
          <span>© {new Date().getFullYear()} Redrive · المنصة الفلسطينية لتأجير السيارات</span>
          <span className="row"><Link to="/assistant">الأسئلة الشائعة</Link><Link to="/register?role=company">بوابة الشركات</Link></span>
        </div>
      </footer>
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
