import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import Calendar from '../components/Calendar.jsx';
import { CarImage, ErrorBox, Icon, Loading, Stars, useLoad } from '../components/ui.jsx';
import { CITIES, FUEL, TRANSMISSION, carName, initial, countDays, dayName, daysWord, isoDay, money, fmtDate, slotsForDay } from '../labels.js';
import { OpeningHours } from '../components/Hours.jsx';

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
  // Links may carry "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm"; the calendar works on days, the time is picked separately.
  const [start, setStart] = useState((params.get('start') || '').slice(0, 10));
  const [end, setEnd] = useState((params.get('end') || '').slice(0, 10));
  const [startTime, setStartTime] = useState((params.get('start') || '').slice(11, 16) || '10:00');
  const [endTime, setEndTime] = useState((params.get('end') || '').slice(11, 16) || '10:00');
  const [fav, setFav] = useState(null);
  const [photo, setPhoto] = useState(0);
  const [bookInView, setBookInView] = useState(false);
  const bookRef = useRef(null);
  const calRef = useRef(null);

  // Phones: the booking bar at the bottom hides while the booking box itself is on screen.
  useEffect(() => {
    const el = bookRef.current;
    if (!el || !('IntersectionObserver' in window)) return undefined;
    const io = new IntersectionObserver(([entry]) => setBookInView(entry.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, [loading]);

  if (loading) return <Loading lines={5} />;
  if (error) return <main className="container page-body"><ErrorBox error={error} /></main>;
  const { car, bookings, reviews, companyTrips } = data;
  const isFav = fav ?? data.favorite;
  const canBook = user?.role !== 'company' && user?.role !== 'admin';
  const booked = bookedDays(bookings);
  const blocked = new Set(car.blockedDates.map(isoDay));
  const from = isoDay(car.availableFrom); const to = isoDay(car.availableTo); const today = isoDay(Date.now());
  const unavailable = (k) => k < today || k < from || k > to || booked.has(k) || blocked.has(k);
  // Hours come from the branch's opening hours on each day; today only offers hours still ahead.
  const nowHour = new Date().getHours();
  const startSlots = slotsForDay(car.company, start).filter((h) => start !== today || Number(h.slice(0, 2)) > nowHour);
  const endSlots = slotsForDay(car.company, end);
  const st = startSlots.includes(startTime) ? startTime : startSlots[0];
  const et = endSlots.includes(endTime) ? endTime : endSlots[0];
  const pickupAt = start && st ? new Date(`${start}T${st}:00`) : null;
  const returnAt = end && et ? new Date(`${end}T${et}:00`) : null;
  const tooSoon = pickupAt && pickupAt < new Date();
  const days = pickupAt && returnAt && returnAt > pickupAt && !tooSoon ? countDays(pickupAt, returnAt) : 0;
  const photos = car.photos.slice(0, 6);

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
  const goBook = () => (days ? bookRef : calRef).current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <main className={canBook ? 'has-mobile-book' : ''}>
      <div className="page-band">
        <div className="container page-head">
          <nav className="crumbs" aria-label="مسار الصفحة">
            <ol>
              <li><Link to="/">الرئيسية</Link></li>
              <li><Link to={`/search?city=${car.city}`}>{CITIES[car.city]}</Link></li>
              <li><span aria-current="page">{car.brand} {car.model}</span></li>
            </ol>
          </nav>
          <div className="cd-title">
            <div>
              <h1>{car.brand} {car.model} <span className="car-year">{car.year}</span></h1>
              <div className="cd-meta">
                <span><Stars value={car.ratingAvg} />{car.ratingCount > 0 && ` · ${car.ratingCount} تقييم`}</span>
                <span><Icon name="pin" size={16} />{CITIES[car.city]}</span>
                <span><Icon name="building" size={16} />{car.company.name}</span>
              </div>
            </div>
            {canBook && (
              <button type="button" className="btn secondary sm fav-btn" onClick={toggleFav} aria-pressed={!!isFav}>
                <Icon name="heart" size={18} />{isFav ? 'بالمفضلة' : 'احفظ'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="container page-body">
        <div className="split">
          <div className="col" style={{ gap: 20 }}>
            <div className="cd-gallery">
              <div className="cd-main"><CarImage car={car} src={photos[photo]} alt={`${carName(car)}، صورة ${photo + 1}`} /></div>
              {photos.length > 1 && (
                <div className="cd-thumbs" role="group" aria-label="صور السيارة">
                  {photos.map((p, i) => (
                    <button type="button" key={p} aria-pressed={i === photo} aria-label={`الصورة ${i + 1}`} onClick={() => setPhoto(i)}><img src={p} alt="" /></button>
                  ))}
                </div>
              )}
            </div>

            <section className="panel" aria-labelledby="specs-title">
              <h2 id="specs-title">المواصفات</h2>
              <div className="spec-grid">
                {[['gear', 'ناقل الحركة', TRANSMISSION[car.transmission]], ['fuel', 'الوقود', FUEL[car.fuel]], ['seat', 'المقاعد', `${car.seats} مقاعد`], ['calendar', 'سنة الصنع', car.year]].map(([icon, k, v]) => (
                  <div key={k} className="spec"><Icon name={icon} size={20} /><span>{k}</span><b>{v}</b></div>
                ))}
              </div>
              {car.features.length > 0 && (
                <>
                  <h3>مزايا إضافية</h3>
                  <div className="chips">{car.features.map((f) => <span key={f} className="badge">{f}</span>)}</div>
                </>
              )}
            </section>

            <section className="panel" ref={calRef} aria-labelledby="dates-title">
              <div className="panel-head">
                <h2 id="dates-title">اختار التواريخ</h2>
                {(start || end) && <button type="button" className="btn ghost sm" onClick={() => { setStart(''); setEnd(''); }}>امسح الاختيار</button>}
              </div>
              <span className="muted small">اضغط على يوم الاستلام، وبعدين على يوم التسليم. الساعة بتختارها من صندوق الحجز.</span>
              <div className="cal-wrap"><Calendar dayClass={dayClass} disabled={(k) => unavailable(k) && !(start && !end && k > start)} onPick={pick} initial={start || undefined} /></div>
              <div className="legend"><span><i className="sel" />اختيارك</span><span><i className="range" />ضمن المدة</span><span><i className="booked" />محجوز</span><span><i className="blocked" />مسكّر</span></div>
            </section>

            <section className="panel" aria-labelledby="pickup-title">
              <h2 id="pickup-title">الاستلام والتسليم</h2>
              <Link to={`/companies/${car.company._id}`} className="company-card">
                <span className="co-avatar">{initial(car.company.name)}</span>
                <span className="col grow" style={{ gap: 2 }}>
                  <b>{car.company.name}</b>
                  <span className="small muted"><span className="verified"><Icon name="shield" size={14} />شركة موثّقة</span> · <Stars value={car.company.ratingAvg} /> · {companyTrips} رحلة مكتملة</span>
                </span>
                <span className="go"><Icon name="arrowLeft" size={20} /></span>
              </Link>
              <ul className="check-list">
                <li><Icon name="pin" size={18} /><span><b>{car.pickupLocation?.address}</b><br /><span className="small muted">بتستلم السيارة وبترجّعها على نفس الفرع.</span></span></li>
                <li><Icon name="clock" size={18} /><span>الاستلام والتسليم بالساعة اللي بتختارها، ضمن ساعات دوام الفرع.</span></li>
              </ul>
              <h3>ساعات دوام الفرع</h3>
              <OpeningHours company={car.company} />
            </section>

            <section className="panel" aria-labelledby="terms-title">
              <h2 id="terms-title">شروط الإيجار</h2>
              <ul className="check-list">
                <li><Icon name="check" size={18} /><span>الإلغاء مجاني قبل موافقة الشركة، ولأول 6 ساعات بعد الموافقة. بعدها بينخصم 60% من المبلغ.</span></li>
                <li><Icon name="check" size={18} /><span>إذا ما وصلت خلال ساعتين من موعد الاستلام، الشركة بتقدر تسجّل عدم حضور وبينخصم 60%.</span></li>
                <li><Icon name="check" size={18} /><span>بتوقّع عقد الإيجار عند الشركة وقت الاستلام، وشروط الوقود والتأمين حسب سياسة الشركة.</span></li>
              </ul>
              <Link to="/terms" className="small">اقرأ الشروط والسياسات كاملة</Link>
            </section>

            <section className="panel" aria-labelledby="reviews-title">
              <h2 id="reviews-title">التقييمات ({reviews.length})</h2>
              {reviews.length === 0 && <span className="muted">لسا ما في تقييمات لهالسيارة.</span>}
              {reviews.map((r) => (
                <div key={r._id} className="review">
                  <span className="avatar">{r.author?.name?.[0]}</span>
                  <div className="col" style={{ gap: 2 }}>
                    <b className="small">{r.author?.name} <span className="stars-row" aria-label={`${r.stars} من 5`}>{'★'.repeat(r.stars)}</span></b>
                    <span>{r.comment}</span>
                    <span className="muted small">{fmtDate(r.createdAt)}</span>
                  </div>
                </div>
              ))}
            </section>
          </div>

          <aside className="panel book-box stick" ref={bookRef} aria-label="الحجز">
            <div className="book-top">
              <div><span className="amount">{money(car.dailyPrice)}</span> <small>باليوم</small></div>
              <small><span className="verified"><Icon name="shield" size={14} />{car.company.name}</span></small>
            </div>
            <div className="book-body">
              <div className="date-tiles">
                <div className={`date-tile${start ? ' set' : ''}`}><span>الاستلام</span><b>{start ? fmtDate(start) : 'اختار من التقويم'}</b></div>
                <div className={`date-tile${end ? ' set' : ''}`}><span>التسليم</span><b>{end ? fmtDate(end) : '—'}</b></div>
              </div>
              <div className="time-row">
                <label className="field"><span className="small bold">ساعة الاستلام</span>
                  <select className="input" value={st || ''} onChange={(e) => setStartTime(e.target.value)} disabled={!start || !startSlots.length}>
                    {startSlots.length ? startSlots.map((h) => <option key={h} value={h}>{h}</option>) : <option value="">—</option>}
                  </select>
                </label>
                <label className="field"><span className="small bold">ساعة التسليم</span>
                  <select className="input" value={et || ''} onChange={(e) => setEndTime(e.target.value)} disabled={!end || !endSlots.length}>
                    {endSlots.length ? endSlots.map((h) => <option key={h} value={h}>{h}</option>) : <option value="">—</option>}
                  </select>
                </label>
              </div>
              {start && !startSlots.length && <div className="alert amber small">{start === today ? 'خلص دوام الفرع اليوم.' : `الفرع مسكّر يوم ${dayName(start)}.`} اختار يوم استلام ثاني.</div>}
              {end && !endSlots.length && <div className="alert amber small">الفرع مسكّر يوم {dayName(end)}. اختار يوم تسليم ثاني.</div>}
              {tooSoon && <div className="alert amber small">ساعة الاستلام فاتت. اختار ساعة بعد الساعة هلأ.</div>}
              {days > 0 && (
                <>
                  <div className="sum-line"><span>{money(car.dailyPrice)} × {daysWord(days)}</span><span>{money(car.dailyPrice * days)}</span></div>
                  <div className="sum-total"><span>المجموع</span><span>{money(car.dailyPrice * days)}</span></div>
                  <span className="muted small">كل 24 ساعة من ساعة الاستلام بتنحسب يوم، وأي جزء من يوم بينحسب يوم كامل.</span>
                </>
              )}
              {canBook ? (
                <button type="button" className="btn lg block" disabled={!days} onClick={() => navigate(`/checkout/${car._id}?start=${start}T${st}&end=${end}T${et}`)}>اطلب الحجز</button>
              ) : <div className="alert">الحجز متاح لحسابات المستأجرين بس.</div>}
              {!end && <span className="muted small">اختار يوم التسليم من التقويم عشان نحسبلك المجموع.</span>}
              <ul className="note-list">
                <li><Icon name="lock" size={16} />بتدفع المبلغ كامل أونلاين، وبيضل محجوز لحد ما الشركة توافق.</li>
                <li><Icon name="clock" size={16} />إذا رفضت أو ما ردّت خلال 12 ساعة، بترجعلك المصاري كاملة.</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>

      {canBook && (
        <div className={`mobile-book${bookInView ? ' away' : ''}`}>
          <div className="col" style={{ gap: 0 }}>
            <span><b>{money(car.dailyPrice)}</b> <span className="muted small">باليوم</span></span>
            {days > 0 && <span className="small muted">المجموع {money(car.dailyPrice * days)} · {daysWord(days)}</span>}
          </div>
          <button type="button" className="btn" onClick={goBook}>{days ? 'كمّل الحجز' : 'اختار التواريخ'}</button>
        </div>
      )}
    </main>
  );
}
