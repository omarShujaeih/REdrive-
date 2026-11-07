import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import Calendar from '../../components/Calendar.jsx';
import { PageTitle } from '../../components/Layout.jsx';
import { ErrorBox, Field, Icon, Loading, StatusBadge } from '../../components/ui.jsx';
import { bookedDays } from '../CarDetails.jsx';
import { BRANDS, CAR_STATUS, CITIES, FEATURES, FUEL, TRANSMISSION, isoDay, money, fmtDateTime } from '../../labels.js';

const EMPTY = {
  brand: '', model: '', year: '2023', transmission: 'automatic', fuel: 'petrol', seats: '5', city: 'ramallah',
  pickupAddress: '', dailyPrice: '', plateNumber: '', availableFrom: isoDay(Date.now()), availableTo: isoDay(Date.now() + 180 * 864e5), features: [],
};

// Styled file picker: shows the chosen file name (or how many photos were picked).
function FilePick({ label, hint, accept, multiple = false, files, onChange }) {
  const count = multiple ? files.length : files ? 1 : 0;
  const name = multiple ? (count ? `${count} صور مختارة` : '') : files?.name;
  return (
    <div className="field">
      <span className="bold">{label}</span>
      <label className={`file-drop${count ? ' has' : ''}`}>
        <input type="file" accept={accept} multiple={multiple} aria-label={label} onChange={(e) => onChange(multiple ? [...e.target.files] : e.target.files[0])} />
        <span className={`ic-tile sm ${count ? '' : 'soft'}`}><Icon name={count ? 'check' : 'upload'} size={16} /></span>
        <span className="fd-text"><b>{name || 'اختار ملف'}</b><small>{hint}</small></span>
      </label>
    </div>
  );
}

export default function CarForm() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { user, setToast } = useAuth();
  const [f, setF] = useState({ ...EMPTY, city: user.city || 'ramallah', pickupAddress: user.company?.address || '' });
  const [blocked, setBlocked] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [car, setCar] = useState(null);
  const [files, setFiles] = useState({ photos: [], registration: null, insurance: null });
  const [ai, setAi] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(!isNew);

  useEffect(() => {
    if (isNew) return;
    api(`/cars/${id}`).then(({ car: c, bookings: b }) => {
      setCar(c); setBookings(b);
      setF({
        brand: c.brand, model: c.model, year: String(c.year), transmission: c.transmission, fuel: c.fuel, seats: String(c.seats), city: c.city,
        pickupAddress: c.pickupLocation?.address || '', dailyPrice: String(c.dailyPrice), plateNumber: c.plateNumber,
        availableFrom: isoDay(c.availableFrom), availableTo: isoDay(c.availableTo), features: c.features,
      });
      setBlocked(c.blockedDates.map(isoDay));
    }).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [id, isNew]);

  if (loading) return <Loading />;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const booked = bookedDays(bookings);
  const pending = bookedDays(bookings, ['pending']);

  const suggest = async () => {
    setError('');
    try { setAi(await api('/cars/estimate-price', { method: 'POST', body: { ...f, year: Number(f.year), seats: Number(f.seats) } })); } catch (e) { setError(e.message); }
  };
  const toggleDay = (k) => {
    if (booked.has(k) || k < f.availableFrom || k > f.availableTo) return;
    setBlocked((b) => (b.includes(k) ? b.filter((x) => x !== k) : [...b, k]));
  };

  const submit = async (e) => {
    e.preventDefault(); setError('');
    const missing = [];
    if (!f.brand) missing.push('الماركة');
    if (!f.model) missing.push('الموديل');
    if (!f.dailyPrice) missing.push('السعر اليومي');
    if (!f.plateNumber) missing.push('رقم اللوحة');
    if (isNew && !files.photos.length) missing.push('الصور');
    if (isNew && !files.registration) missing.push('رخصة المركبة');
    if (isNew && !files.insurance) missing.push('التأمين');
    if (missing.length) { setError(`في معلومات ناقصة: ${missing.join('، ')}`); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    const fd = new FormData();
    Object.entries(f).forEach(([k, v]) => fd.append(k, k === 'features' ? JSON.stringify(v) : v));
    if (ai) fd.append('aiSuggestedPrice', ai.price);
    fd.append('blockedDates', JSON.stringify(blocked));
    files.photos.forEach((p) => fd.append('photos', p));
    if (files.registration) fd.append('registration', files.registration);
    if (files.insurance) fd.append('insurance', files.insurance);
    setBusy(true);
    try {
      const r = await api(isNew ? '/cars' : `/cars/${id}`, { method: isNew ? 'POST' : 'PATCH', form: fd });
      setToast(r.car.status === 'pending' ? 'انبعتت السيارة لمراجعة الإدارة' : 'انحفظت التغييرات');
      navigate('/company/cars');
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} noValidate>
      <PageTitle back={['/company/cars', 'سياراتي']} title={isNew ? 'أضف سيارة' : `تعديل ${f.brand} ${f.model}`} sub="السيارة بتنعرض بالبحث بعد ما الإدارة تراجع معلوماتها ووثائقها.">
        {car && <StatusBadge map={CAR_STATUS} value={car.status} />}
      </PageTitle>
      <div className="col" style={{ gap: 16, maxWidth: 920 }}>
        <ErrorBox error={error} />
        <section className="panel" aria-labelledby="info-title">
          <h2 id="info-title" className="panel-title"><span className="ic-tile sm"><Icon name="car" size={16} /></span>معلومات السيارة</h2>
          <div className="kv-grid">
            <Field label="الماركة"><select className="input" value={f.brand} onChange={set('brand')}><option value="">اختار</option>{BRANDS.map((b) => <option key={b}>{b}</option>)}</select></Field>
            <Field label="الموديل"><input className="input" value={f.model} onChange={set('model')} placeholder="مثلاً Tucson" /></Field>
            <Field label="سنة الصنع"><select className="input" value={f.year} onChange={set('year')}>{Array.from({ length: 12 }, (_, i) => 2026 - i).map((y) => <option key={y}>{y}</option>)}</select></Field>
            <Field label="ناقل الحركة"><select className="input" value={f.transmission} onChange={set('transmission')}>{Object.entries(TRANSMISSION).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
            <Field label="الوقود"><select className="input" value={f.fuel} onChange={set('fuel')}>{Object.entries(FUEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
            <Field label="عدد المقاعد"><select className="input" value={f.seats} onChange={set('seats')}>{['2', '4', '5', '7', '8'].map((s) => <option key={s}>{s}</option>)}</select></Field>
            <Field label="المدينة"><select className="input" value={f.city} onChange={set('city')}>{Object.entries(CITIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
            <Field label="مكان الاستلام"><input className="input" value={f.pickupAddress} onChange={set('pickupAddress')} /></Field>
            <Field label="رقم اللوحة" hint="بتشوفه إنت والإدارة بس."><input className="input ltr" value={f.plateNumber} onChange={set('plateNumber')} /></Field>
          </div>
        </section>

        <section className="panel" aria-labelledby="price-title">
          <h2 id="price-title" className="panel-title"><span className="ic-tile sm"><Icon name="card" size={16} /></span>السعر اليومي</h2>
          <p className="muted small">النموذج بيقترحلك سعر حسب الماركة والموديل والسنة والوقود وناقل الحركة والمقاعد والمدينة.</p>
          {ai ? (
            <div className="ai-card">
              <div className="col" style={{ gap: 0 }}>
                <small>السعر المقترح</small>
                <span><span className="v">{money(ai.price)}</span> <small>باليوم</small></span>
                <small>سيارات شبهها بـ{CITIES[f.city]}: {money(ai.low)}–{money(ai.high)}</small>
              </div>
              <div className="row" style={{ gap: 8 }}>
                <button type="button" className="btn inverse sm" onClick={() => setF({ ...f, dailyPrice: String(ai.price) })}>استخدم هالسعر</button>
                <button type="button" className="btn ghost sm" style={{ color: '#fff' }} onClick={suggest}>احسب من جديد</button>
              </div>
            </div>
          ) : (
            <button type="button" className="btn secondary" style={{ alignSelf: 'flex-start' }} onClick={suggest} disabled={!f.brand}><Icon name="sparkle" size={18} color="var(--electric)" />اقترح سعر</button>
          )}
          <Field label="سعرك باليوم (₪)" hint="بتقدر تقبل السعر المقترح أو تكتب سعرك."><input className="input" type="number" min="1" inputMode="numeric" value={f.dailyPrice} onChange={set('dailyPrice')} style={{ maxWidth: 220 }} /></Field>
        </section>

        <section className="panel" aria-labelledby="cal-title">
          <h2 id="cal-title" className="panel-title"><span className="ic-tile sm"><Icon name="calendar" size={16} /></span>فترة التوفر والتقويم</h2>
          <p className="muted small">حدد من أي تاريخ لأي تاريخ السيارة متاحة. الأيام اللي بتنحجز بتنسجّل لحالها، وبتقدر تضغط على أي يوم عشان تسكّره للصيانة أو للاستعمال الخاص.</p>
          <div className="form-grid" style={{ maxWidth: 460 }}>
            <Field label="متاحة من"><input className="input" type="date" value={f.availableFrom} onChange={set('availableFrom')} /></Field>
            <Field label="لـ"><input className="input" type="date" value={f.availableTo} min={f.availableFrom} onChange={set('availableTo')} /></Field>
          </div>
          <div className="cal-wrap">
            <Calendar
              tone="company"
              dayClass={(k) => (booked.has(k) ? 'booked' : pending.has(k) ? 'pending' : blocked.includes(k) ? 'blocked' : '')}
              disabled={(k) => k < f.availableFrom || k > f.availableTo}
              onPick={toggleDay}
            />
          </div>
          <div className="legend company"><span><i className="booked" />محجوزة</span><span><i className="pending" />طلب بيستنى ردّك</span><span><i className="blocked" />مسكّرة من عندك</span></div>
          {bookings.length > 0 && (
            <>
              <h3 style={{ fontSize: 'var(--fs-5)' }}>حجوزات هالسيارة</h3>
              <div className="list-rows">
                {bookings.map((b) => (
                  <Link key={b._id} to={`/company/rentals/${b._id}`} className="list-row">
                    <span className="ic-tile sm soft"><Icon name="calendar" size={16} /></span>
                    <div className="grow"><b>{fmtDateTime(b.startDate)} ← {fmtDateTime(b.endDate)}</b><small>{b.renter?.name} · <span className="ltr">{b.code}</span></small></div>
                    <Icon name="arrowLeft" size={18} />
                  </Link>
                ))}
              </div>
            </>
          )}
        </section>

        <section className="panel" aria-labelledby="feat-title">
          <h2 id="feat-title" className="panel-title"><span className="ic-tile sm"><Icon name="sparkle" size={16} /></span>المزايا</h2>
          <div className="chips">
            {FEATURES.map((x) => <button type="button" key={x} className={`chip ${f.features.includes(x) ? 'on' : ''}`} aria-pressed={f.features.includes(x)} onClick={() => setF({ ...f, features: f.features.includes(x) ? f.features.filter((y) => y !== x) : [...f.features, x] })}>{x}</button>)}
          </div>
        </section>

        <section className="panel" aria-labelledby="docs-title">
          <h2 id="docs-title" className="panel-title"><span className="ic-tile sm"><Icon name="doc" size={16} /></span>الصور والوثائق</h2>
          <p className="muted small">الوثائق بتشوفها إنت والإدارة بس، وما بتظهر للمستأجرين. {!isNew && 'تغيير الماركة أو الموديل أو السنة أو اللوحة أو الوثائق بيرجّع السيارة لمراجعة الإدارة.'}</p>
          {car?.photos?.length > 0 && <div className="thumbs-row">{car.photos.map((p, i) => <img key={p} src={p} alt={`صورة ${i + 1} لـ${f.brand} ${f.model}`} />)}</div>}
          <FilePick label={isNew ? 'صور السيارة' : 'أضف صور'} hint="لحد 12 صورة" accept="image/*" multiple files={files.photos} onChange={(photos) => setFiles({ ...files, photos })} />
          <div className="form-grid">
            <FilePick label="رخصة المركبة" hint="صورة أو PDF" accept="image/*,application/pdf" files={files.registration} onChange={(registration) => setFiles({ ...files, registration })} />
            <FilePick label="التأمين الشامل" hint="صورة أو PDF" accept="image/*,application/pdf" files={files.insurance} onChange={(insurance) => setFiles({ ...files, insurance })} />
          </div>
        </section>

        <div className="form-actions">
          <button type="submit" className="btn" disabled={busy}>{busy ? 'عم نحفظ…' : isNew ? 'ابعت السيارة للمراجعة' : 'احفظ التغييرات'}</button>
          <Link className="btn secondary" to="/company/cars">رجوع لسياراتي</Link>
        </div>
      </div>
    </form>
  );
}
