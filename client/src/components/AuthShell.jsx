import { Link } from 'react-router-dom';
import { Icon, Logo } from './ui.jsx';
import { Leds } from './HeroFleet.jsx';
import loginCar from '../assets/hero/login-sportage.webp';

// Real photo of a Kia Sportage GT-line (assets/hero/CREDITS.md) with its LEDs traced in the photo's pixel space,
// lit and blinking the same way as the cars in the home hero.
const LOGIN_CAR = {
  key: 'login', w: 3624, h: 2304, width: 27,
  drl: ['M1691 1035 L1903 1126 L2079 1185 L2209 1244 L2315 1326 L2397 1421 L2374 1491 L2279 1609 L2162 1703 L2091 1726', 'M2039 2113 L2194 2013'],
  bars: ['M1832 1303 L2244 1291', 'M1821 1338 L2256 1326', 'M1832 1374 L2256 1368'],
  lamps: [{ cx: 2056, cy: 1444, rx: 230, ry: 120 }, { cx: 2117, cy: 2067, rx: 95, ry: 60 }, { cx: 3505, cy: 1060, rx: 30, ry: 95, far: true }],
};

// Shell shared by login, register and password reset: form on the right,
// the navy card with the lit car on the left (it stacks under the form on phones).
export default function AuthShell({
  labelledBy, wide = false, children, extra,
  title = 'المنصة الفلسطينية لتأجير السيارات',
  text = 'سيارات من شركات مرخّصة في رام الله، نابلس، الخليل، بيت لحم وجنين. احجز بالتواريخ اللي بتناسبك وادفع أونلاين.',
}) {
  return (
    <div className="auth-page">
      <header className="container auth-top">
        <Link to="/assistant" className="nav-link" aria-label="اسأل Redrive"><Icon name="sparkle" color="var(--electric)" /><span className="lbl-long">اسأل Redrive</span></Link>
        <Logo />
      </header>

      <main className="container auth-main">
        <section className={`auth-form${wide ? ' wide' : ''}`} aria-labelledby={labelledBy}>
          {children}
        </section>

        <aside className="auth-visual navy" aria-label="عن Redrive">
          <div className="auth-visual-copy">
            <span className="eyebrow"><i aria-hidden="true" />Redrive</span>
            <h2>{title}</h2>
            <p>{text}</p>
          </div>
          {extra}
          <span className="auth-floor" aria-hidden="true" />
          <div className="auth-car" style={{ '--d': '0.5s' }}>
            <img className="fleet-reflection" src={loginCar} alt="" aria-hidden="true" />
            <img className="fleet-photo" src={loginCar} alt="كيا سبورتاج بيضاء وأضويتها شغّالة" width={LOGIN_CAR.w} height={LOGIN_CAR.h} />
            <Leds car={LOGIN_CAR} />
          </div>
        </aside>
      </main>

      <footer className="container auth-foot">
        <span>© 2026 Redrive · المنصة الفلسطينية لتأجير السيارات</span>
        <span>صورة السيارة: Alexander Migl، ويكيميديا كومنز · CC BY-SA 4.0</span>
        <span className="row" style={{ gap: 16 }}><Link to="/terms">الشروط والسياسات</Link><Link to="/assistant">تواصل معنا</Link></span>
      </footer>
    </div>
  );
}
