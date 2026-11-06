import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { CarCard, Icon, Loading, useLoad } from '../components/ui.jsx';
import HeroFleet from '../components/HeroFleet.jsx';
import Reveal from '../components/Reveal.jsx';
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

      {[
        { title: 'الأعلى تقييماً في رام الله', sub: 'سيارات من شركات موثّقة، مرتبة حسب تقييم الزبائن.', q: suv, link: '/search?city=ramallah&sort=rating' },
        { title: 'سيارات اقتصادية في نابلس', sub: 'أوفر الأسعار باليوم للمشاوير داخل المدينة وبينها.', q: eco, link: '/search?city=nablus&sort=price' },
      ].map((s) => (
        <Reveal className="container home-block" key={s.title}>
          <div className="section-head rv">
            <div><h2>{s.title}</h2><p>{s.sub}</p></div>
            <Link to={s.link} className="see-all">عرض الكل<Icon name="arrowLeft" size={18} /></Link>
          </div>
          {s.q.loading ? <Loading /> : (
            <div className="grid cards three">{s.q.data?.cars.slice(0, 3).map((c, i) => <CarCard key={c._id} car={c} style={{ '--i': i + 1 }} />)}</div>
          )}
        </Reveal>
      ))}

      <Reveal className="band" id="how">
        <div className="container home-block">
          <div className="section-head rv">
            <div><h2>كيف بتستأجر من Redrive</h2><p>لازم يكون حسابك موثّق بالهوية ورخصة السواقة قبل أول حجز.</p></div>
          </div>
          <ol className="steps-grid">
            {[
              ['search', 'ابحث وقارن', 'دوّر حسب المدينة أو على الخريطة، وفلتر حسب السعر وناقل الحركة وعدد المقاعد.'],
              ['card', 'احجز وادفع أونلاين', 'اختار تاريخ الاستلام والتسليم وادفع. طلبك بيوصل للشركة بعد ما يتم الدفع.'],
              ['key', 'استلم السيارة', 'لما الشركة توافق بيوصلك إشعار بتفاصيل الاستلام. بتوقّع عقد الإيجار عند الشركة وبتستلم السيارة.'],
            ].map(([icon, t, d], i) => (
              <li key={t} className="glass step rv" style={{ '--i': i + 1 }}>
                <span className="step-icon"><Icon name={icon} size={24} color="var(--blue)" /></span>
                <span className="step-n">0{i + 1}</span>
                <h3>{t}</h3>
                <p>{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </Reveal>

      <Reveal className="container home-block">
        <div className="duo">
          <div className="glass map-card rv" style={{ '--i': 1 }}>
            <div className="map-art" aria-hidden="true">
              <svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice">
                <path d="M-10 160 C80 120 140 190 230 140 S360 70 420 100" />
                <path d="M40 -10 C70 60 60 120 120 230" />
                <path d="M250 -10 C240 70 300 120 290 230" />
                <path d="M-10 60 C100 80 200 30 420 50" />
              </svg>
              {[['₪150', '22%', '30%'], ['₪230', '58%', '52%'], ['₪120', '78%', '24%']].map(([p, x, y], i) => (
                <span key={p} className="map-pin" style={{ insetInlineStart: x, top: y, '--i': i }}>{p}</span>
              ))}
              <span className="map-me" style={{ insetInlineStart: '44%', top: '62%' }} />
            </div>
            <div className="duo-body">
              <h2>السيارات القريبة منك</h2>
              <p>شوف السيارات المتاحة على الخريطة، واختار الأقرب لموقعك.</p>
              <Link to={`/search?near=1&start=${start}&end=${end}`} className="btn"><Icon name="map" />افتح الخريطة</Link>
            </div>
          </div>
          <div className="glass assistant-card rv" style={{ '--i': 2 }}>
            <div className="chat-demo" aria-hidden="true">
              <p className="bubble user">بدي سيارة عائلية 7 ركاب بالخليل من الجمعة للأحد</p>
              <p className="bubble assistant">في 4 سيارات 7 ركاب متاحة بهديك التواريخ. أرخصها كيا كارنفال بـ ₪260 باليوم. بدك أعرضهم؟</p>
            </div>
            <div className="duo-body">
              <h2>اسأل Redrive</h2>
              <p>مساعد ذكي بجاوبك على أسئلتك، وبساعدك تلاقي السيارة المناسبة وتكمل الحجز.</p>
              <Link to="/assistant" className="btn"><Icon name="chat" />ابدأ محادثة</Link>
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal className="container home-block">
        <div className="section-head rv"><div><h2>تأجير سيارات حسب المدينة</h2><p>اختار مدينتك وشوف السيارات المتاحة فيها.</p></div></div>
        <ul className="city-grid">
          {Object.entries(CITIES).map(([k, v], i) => (
            <li key={k} className="rv" style={{ '--i': i % 5 + 1 }}>
              <Link to={`/search?city=${k}`} className="glass city"><Icon name="pin" size={20} color="var(--blue)" /><span>{v}</span><Icon name="arrowLeft" size={18} /></Link>
            </li>
          ))}
        </ul>
      </Reveal>
    </main>
  );
}
