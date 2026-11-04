import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { CancelModal, RenterReviewModal, canRenterCancel } from '../components/RentalActions.jsx';
import { Empty, ErrorBox, Loading, StatusBadge, useLoad } from '../components/ui.jsx';
import { RENTAL_STATUS, carName, daysWord, fmtDateTime, money } from '../labels.js';

const TABS = [
  { k: 'current', label: 'الحالية', s: ['pending', 'confirmed', 'active'] },
  { k: 'past', label: 'السابقة', s: ['completed'] },
  { k: 'cancelled', label: 'الملغية والمرفوضة', s: ['cancelled', 'rejected', 'no_show'] },
];

export default function MyRentals() {
  const [tab, setTab] = useState('current');
  const [cancel, setCancel] = useState(null);
  const [review, setReview] = useState(null);
  const { data, loading, error, reload } = useLoad(() => api('/rentals/mine'));
  const all = data?.rentals || [];
  const list = all.filter((r) => TABS.find((t) => t.k === tab).s.includes(r.status));

  return (
    <main className="container col" style={{ gap: 20 }}>
      <div className="col" style={{ gap: 2 }}><h1>حجوزاتي</h1><span className="muted">تابع حالة حجوزاتك، والغِ أو قيّم رحلاتك من هون.</span></div>
      <div className="chips">{TABS.map((t) => <button type="button" key={t.k} className={`chip ${tab === t.k ? 'on' : ''}`} onClick={() => setTab(t.k)}>{t.label} ({all.filter((r) => t.s.includes(r.status)).length})</button>)}</div>
      <ErrorBox error={error} />
      {loading ? <Loading /> : list.length === 0 ? <Empty title="ما في حجوزات هون" action={<Link className="btn" to="/search">دوّر على سيارة</Link>} /> : (
        <div className="col">
          {list.map((r) => (
            <div key={r._id} className="card row between">
              <div className="col" style={{ gap: 4 }}>
                <div className="row"><StatusBadge map={RENTAL_STATUS} value={r.status} /><span className="muted small ltr">{r.code}</span></div>
                <b>{carName(r.car)}</b>
                <span className="muted small">{r.company?.name}</span>
                <span className="small">{fmtDateTime(r.startDate)} ← {fmtDateTime(r.endDate)} · {daysWord(r.days)} · {money(r.total)}</span>
              </div>
              <div className="row">
                <Link className="btn secondary sm" to={`/rentals/${r._id}`}>التفاصيل</Link>
                {canRenterCancel(r) && <button type="button" className="btn danger outline sm" onClick={() => setCancel(r)}>إلغاء الحجز</button>}
                {r.status === 'completed' && !r.renterReviewed && <button type="button" className="btn sm" onClick={() => setReview(r)}>قيّم الرحلة</button>}
                {r.renterReviewed && <span className="badge green">قيّمتها ✓</span>}
              </div>
            </div>
          ))}
        </div>
      )}
      {cancel && <CancelModal rental={cancel} onClose={() => setCancel(null)} onDone={() => { setCancel(null); reload(); }} />}
      {review && <RenterReviewModal rental={review} onClose={() => setReview(null)} onDone={() => { setReview(null); reload(); }} />}
    </main>
  );
}
