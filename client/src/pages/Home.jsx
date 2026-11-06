import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { CarCard, Loading, useLoad } from '../components/ui.jsx';
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
      <section className="container">
        <div style={{ borderRadius: 28, background: 'var(--hero)', padding: 'clamp(24px, 5vw, 56px)' }} className="col">
          <h1 style={{ fontSize: 'clamp(30px, 4vw, 46px)' }}>المنصة الفلسطينية لتأجير السيارات</h1>
          <p className="muted" style={{ fontSize: 17, maxWidth: '46ch' }}>سيارات من شركات مرخّصة وموثّقة. اختار السيارة والتواريخ اللي بتناسبك، وادفع أونلاين.</p>
          <div className="row" style={{ gap: '6px 18px' }}>
            {['شركات مرخّصة', 'دفع آمن أونلاين', 'تقييمات من الطرفين'].map((t) => <span key={t} className="bold"><span style={{ color: 'var(--blue)' }}>✓</span> {t}</span>)}
          </div>
          <form onSubmit={search} className="card row" style={{ marginTop: 12, alignItems: 'flex-end' }}>
            <div className="field grow" style={{ minWidth: 180 }}>
              <label htmlFor="city">وين؟</label>
              <select id="city" className="input" value={city} onChange={(e) => setCity(e.target.value)}>
                <option value="near">قريب مني (الخريطة)</option>
                {Object.entries(CITIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="field"><label htmlFor="s">الاستلام</label><input id="s" type="date" className="input" value={start} min={isoDay(Date.now())} onChange={(e) => setStart(e.target.value)} /></div>
            <div className="field"><label htmlFor="e">التسليم</label><input id="e" type="date" className="input" value={end} min={start} onChange={(e) => setEnd(e.target.value)} /></div>
            <button className="btn" type="submit">ابحث</button>
          </form>
        </div>
      </section>

      {[{ title: 'سيارات في رام الله', q: suv, link: '/search?city=ramallah' }, { title: 'سيارات اقتصادية في نابلس', q: eco, link: '/search?city=nablus&sort=price' }].map((s) => (
        <section className="container col" key={s.title}>
          <div className="row between"><h2>{s.title}</h2><Link to={s.link}>عرض الكل</Link></div>
          {s.q.loading ? <Loading /> : (
            <div className="grid cards">{s.q.data?.cars.slice(0, 4).map((c) => <CarCard key={c._id} car={c} />)}</div>
          )}
        </section>
      ))}

      <section className="container">
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
