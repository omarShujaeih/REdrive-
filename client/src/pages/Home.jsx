import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { CarCard, Icon, Loading, useLoad } from '../components/ui.jsx';
import HeroFleet from '../components/HeroFleet.jsx';
import { CITIES, isoDay } from '../labels.js';

export default function Home() {
  const navigate = useNavigate();
  const [city, setCity] = useState('ramallah');
  const [start, setStart] = useState(isoDay(Date.now() + 86400000));
  const [end, setEnd] = useState(isoDay(Date.now() + 4 * 86400000));
  const suv = useLoad(() => api('/cars?city=ramallah&seats=5&sort=rating'));
  const eco = useLoad(() => api('/cars?city=nablus&sort=price'));

  const search = (e) => {
    e.preventDefault();
    if (city === 'near') return navigate(`/search?near=1&start=${start}&end=${end}`);
    navigate(`/search?city=${city}&start=${start}&end=${end}`);
  };

  return (
    <main className="stack-lg">
      <section className="hero" aria-labelledby="hero-title">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow"><i aria-hidden="true" />المنصة الفلسطينية لتأجير السيارات</span>
            <h1 id="hero-title" className="hero-title">استأجر سيارتك<br /><span className="nowrap">من شركات <span className="accent">موثوقة</span></span></h1>
            <p className="hero-lead">سيارات من شركات مرخّصة وموثّقة بكل فلسطين. اختار السيارة والتواريخ اللي بتناسبك، وادفع أونلاين بأمان.</p>
            <div className="row hero-cta">
              <Link to="/search" className="btn lg">تصفّح السيارات</Link>
              <a href="#how" className="btn secondary lg">كيف بتشتغل</a>
            </div>
            <ul className="hero-proof">
              {[['shield', 'شركات مرخّصة', 'موثّقة من الإدارة'], ['card', 'دفع آمن', 'أونلاين وبتسترجع'], ['star', 'تقييمات', 'من الطرفين']].map(([icon, t, s]) => (
                <li key={t}><span className="proof-icon"><Icon name={icon} size={22} color="var(--blue)" /></span><span><b>{t}</b><small>{s}</small></span></li>
              ))}
            </ul>
          </div>
          <div className="hero-stage">
            <HeroFleet />
            <p className="photo-credit">صور: Alexander Migl و Alexander-93 · CC BY-SA 4.0</p>
          </div>
        </div>
      </section>

      <section className="container search-dock" aria-label="ابحث عن سيارة">
        <form onSubmit={search} className="search-card">
          <div className="field grow">
            <label htmlFor="city"><Icon name="pin" size={18} color="var(--blue)" />وين؟</label>
            <select id="city" className="input" value={city} onChange={(e) => setCity(e.target.value)}>
              <option value="near">قريب مني (الخريطة)</option>
              {Object.entries(CITIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="field"><label htmlFor="s"><Icon name="calendar" size={18} color="var(--blue)" />الاستلام</label><input id="s" type="date" className="input" value={start} min={isoDay(Date.now())} onChange={(e) => setStart(e.target.value)} /></div>
          <div className="field"><label htmlFor="e"><Icon name="calendar" size={18} color="var(--blue)" />التسليم</label><input id="e" type="date" className="input" value={end} min={start} onChange={(e) => setEnd(e.target.value)} /></div>
          <button className="btn lg" type="submit"><Icon name="search" />ابحث</button>
        </form>
      </section>

      {[{ title: 'سيارات في رام الله', q: suv, link: '/search?city=ramallah' }, { title: 'سيارات اقتصادية في نابلس', q: eco, link: '/search?city=nablus&sort=price' }].map((s) => (
        <section className="container col" key={s.title}>
          <div className="row between"><h2>{s.title}</h2><Link to={s.link}>عرض الكل</Link></div>
          {s.q.loading ? <Loading /> : (
            <div className="grid cards">{s.q.data?.cars.slice(0, 4).map((c) => <CarCard key={c._id} car={c} />)}</div>
          )}
        </section>
      ))}

      <section className="container" id="how" style={{ scrollMarginTop: 96 }}>
        <div className="card soft col">
          <h2>كيف بتستأجر من Redrive</h2>
          <p className="muted">لازم يكون حسابك موثّق بالهوية ورخصة السواقة قبل أول حجز.</p>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            {[
              ['ابحث وقارن', 'دوّر حسب المدينة أو على الخريطة، وفلتر حسب السعر وناقل الحركة وعدد المقاعد.'],
              ['احجز وادفع أونلاين', 'اختار تاريخ الاستلام والتسليم وادفع. طلبك بيوصل للشركة بعد ما يتم الدفع.'],
              ['استلم السيارة', 'لما الشركة توافق بيوصلك إشعار بتفاصيل الاستلام. بتوقّع عقد الإيجار عند الشركة وبتستلم السيارة.'],
            ].map(([t, d], i) => (
              <div key={t} className="card col" style={{ gap: 6 }}>
                <span className="avatar">{i + 1}</span><b>{t}</b><span className="muted small">{d}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container">
        <div className="card row between" style={{ background: 'var(--hero)', borderColor: 'transparent', borderRadius: 'var(--r-xl)', padding: 24 }}>
          <div className="col" style={{ gap: 4 }}>
            <h2>مساعد ذكي بجاوبك على أسئلتك</h2>
            <span className="muted">بساعدك تلاقي السيارة المناسبة وتكمل الحجز.</span>
          </div>
          <Link to="/assistant" className="btn">ابدأ محادثة</Link>
        </div>
      </section>
    </main>
  );
}
