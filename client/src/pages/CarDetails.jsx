import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import Calendar from '../components/Calendar.jsx';
import { Badge, CarImage, ErrorBox, Loading, Stars, useLoad } from '../components/ui.jsx';
import { CITIES, FUEL, TRANSMISSION, daysWord, isoDay, money, fmtDate } from '../labels.js';

export function bookedDays(bookings, statuses = ['confirmed', 'active']) {
  const set = new Set();
  bookings.filter((b) => statuses.includes(b.status)).forEach((b) => {
    for (let t = new Date(b.startDate).getTime(); t < new Date(b.endDate).getTime(); t += 86400000) set.add(isoDay(t));
  });
  return set;
}

export default function CarDetails() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, loading, error } = useLoad(() => api(`/cars/${id}`), [id]);
  const [start, setStart] = useState(params.get('start') || '');
  const [end, setEnd] = useState(params.get('end') || '');
  const [fav, setFav] = useState(null);

  if (loading) return <Loading />;
  if (error) return <main className="container"><ErrorBox error={error} /></main>;
  const { car, bookings, reviews, companyTrips } = data;
  const isFav = fav ?? data.favorite;
  const booked = bookedDays(bookings);
  const blocked = new Set(car.blockedDates.map(isoDay));
  const from = isoDay(car.availableFrom); const to = isoDay(car.availableTo); const today = isoDay(Date.now());
  const unavailable = (k) => k < today || k < from || k > to || booked.has(k) || blocked.has(k);
  const days = start && end ? Math.round((new Date(end) - new Date(start)) / 86400000) : 0;

  const pick = (k) => {
    if (!start || end || k <= start) { setStart(k); setEnd(''); return; }
    // the range must not cross unavailable days (the return day itself can be booked from 10:00)
    for (let t = new Date(start).getTime(); t < new Date(k).getTime(); t += 86400000) if (unavailable(isoDay(t))) { setStart(k); setEnd(''); return; }
    setEnd(k);
  };
  const dayClass = (k) => (k === start || k === end ? 'sel' : start && end && k > start && k < end ? 'range' : booked.has(k) ? 'booked' : blocked.has(k) ? 'blocked' : '');
  const toggleFav = async () => {
    if (!user) return navigate(`/login?next=/cars/${id}`);
    const r = await api(`/cars/${id}/favorite`, { method: 'POST' });
    setFav(r.favorite);
  };

  return (
    <main className="container col" style={{ gap: 20 }}>
      <div className="row muted small"><Link to="/">الرئيسية</Link> ‹ <Link to={`/search?city=${car.city}`}>{CITIES[car.city]}</Link> ‹ <span>{car.brand} {car.model}</span></div>
      <div className="split">
        <div className="col" style={{ gap: 20 }}>
          <div className="row between">
            <div className="col" style={{ gap: 2 }}>
              <h1 style={{ fontSize: 30 }}>{car.brand} {car.model} {car.year}</h1>
              <span className="muted"><Stars value={car.ratingAvg} /> · {car.ratingCount} تقييم · {CITIES[car.city]}</span>
            </div>
            {user?.role !== 'company' && user?.role !== 'admin' && <button type="button" className="btn secondary" onClick={toggleFav} aria-pressed={isFav}>{isFav ? '♥ بالمفضلة' : '♡ احفظ'}</button>}
          </div>
          <div style={{ borderRadius: 20, overflow: 'hidden' }}><CarImage car={car} /></div>
          {car.photos.length > 1 && <div className="row">{car.photos.slice(1, 6).map((p) => <img key={p} src={p} alt="" style={{ width: 110, height: 72, objectFit: 'cover', borderRadius: 10 }} />)}</div>}

          <Link to={`/companies/${car.company._id}`} className="card row" style={{ color: 'var(--ink)' }}>
            <span className="avatar">{car.company.name[0]}</span>
            <div className="col grow" style={{ gap: 0 }}>
              <b>{car.company.name} <Badge tone="green">شركة موثّقة</Badge></b>
              <span className="muted small"><Stars value={car.company.ratingAvg} /> · {companyTrips} رحلة مكتملة</span>
            </div>
            <span>صفحة الشركة ‹</span>
          </Link>

          <section className="card col">
            <h3>المواصفات</h3>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
              {[['ناقل الحركة', TRANSMISSION[car.transmission]], ['الوقود', FUEL[car.fuel]], ['المقاعد', `${car.seats} مقاعد`], ['سنة الصنع', car.year]].map(([k, v]) => (
                <div key={k} className="card soft" style={{ padding: 12 }}><span className="muted small">{k}</span><div className="bold">{v}</div></div>
              ))}
            </div>
            {car.features.length > 0 && <><b>مزايا إضافية</b><div className="chips">{car.features.map((f) => <span key={f} className="badge">{f}</span>)}</div></>}
          </section>

          <section className="card col">
            <h3>شروط الإيجار</h3>
            <ul style={{ margin: 0, paddingInlineStart: 18 }} className="col">
              <li>الإلغاء مجاني قبل موافقة الشركة، ولأول 6 ساعات بعد الموافقة. بعدها بينخصم 60% من المبلغ.</li>
              <li>إذا ما وصلت خلال ساعتين من موعد الاستلام، الشركة بتقدر تسجّل عدم حضور وبينخصم 60%.</li>
              <li>بتوقّع عقد الإيجار عند الشركة وقت الاستلام، وشروط الوقود والتأمين حسب سياسة الشركة.</li>
            </ul>
          </section>

          <section className="card col">
            <h3>الأيام المتاحة</h3>
            <span className="muted small">اختار يوم الاستلام، وبعدين يوم التسليم.</span>
            <Calendar dayClass={dayClass} disabled={(k) => unavailable(k) && !(start && !end && k > start)} onPick={pick} initial={start || undefined} />
            <div className="legend"><span><i className="sel" />اختيارك</span><span><i className="range" />ضمن المدة</span><span><i className="booked" />محجوز</span><span><i className="blocked" />مسكّر</span></div>
          </section>

          <section className="card col">
            <h3>مكان الاستلام والتسليم</h3>
            <span>{car.pickupLocation?.address}</span>
            <span className="muted small">بتستلم السيارة وبترجّعها على نفس الفرع الساعة 10:00 صباحاً.</span>
          </section>

          <section className="card col">
            <h3>التقييمات ({reviews.length})</h3>
            {reviews.length === 0 && <span className="muted">لسا ما في تقييمات.</span>}
            {reviews.map((r) => (
              <div key={r._id} className="row" style={{ alignItems: 'flex-start' }}>
                <span className="avatar">{r.author?.name?.[0]}</span>
                <div className="col" style={{ gap: 2 }}><b className="small">{r.author?.name} · {'★'.repeat(r.stars)}</b><span>{r.comment}</span><span className="muted small">{fmtDate(r.createdAt)}</span></div>
              </div>
            ))}
          </section>
        </div>

        <aside className="card col sticky">
          <div><span className="price" style={{ fontSize: 26 }}>{money(car.dailyPrice)}</span> <span className="muted">باليوم</span></div>
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div className="card soft" style={{ padding: 10 }}><span className="muted small">الاستلام</span><div className="bold small">{start ? fmtDate(start) : 'اختار من التقويم'}</div></div>
            <div className="card soft" style={{ padding: 10 }}><span className="muted small">التسليم</span><div className="bold small">{end ? fmtDate(end) : '—'}</div></div>
          </div>
          {days > 0 && (
            <>
              <div className="row between"><span>{money(car.dailyPrice)} × {daysWord(days)}</span><span>{money(car.dailyPrice * days)}</span></div>
              <div className="row between bold" style={{ borderTop: '1px solid var(--line)', paddingTop: 10 }}><span>المجموع</span><span>{money(car.dailyPrice * days)}</span></div>
            </>
          )}
          {user?.role === 'company' || user?.role === 'admin' ? <div className="alert">الحجز متاح لحسابات المستأجرين بس.</div> : (
            <button type="button" className="btn block" disabled={!days} onClick={() => navigate(`/checkout/${car._id}?start=${start}&end=${end}`)}>اطلب الحجز</button>
          )}
          {!days && <span className="muted small">اختار يوم التسليم من التقويم عشان نحسبلك المجموع.</span>}
          <span className="muted small">بتدفع المبلغ كامل أونلاين، وبيضل محجوز لحد ما الشركة توافق. إذا رفضت أو ما ردّت خلال 12 ساعة، بترجعلك المصاري كاملة.</span>
        </aside>
      </div>
    </main>
  );
}
