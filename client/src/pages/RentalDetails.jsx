import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { CancelModal, RenterReviewModal, canRenterCancel } from '../components/RentalActions.jsx';
import { ErrorBox, Loading, StatusBadge, useLoad } from '../components/ui.jsx';
import { RENTAL_STATUS, carName, daysWord, fmtDateTime, money, timeLeft } from '../labels.js';

const PAY = { held: 'محجوز عند بوابة الدفع', transferred: 'انحوّل للشركة', refunded: 'رجع لحسابك كامل', partially_refunded: 'رجعلك جزء' };

export default function RentalDetails() {
  const { id } = useParams();
  const { data, loading, error, reload } = useLoad(() => api(`/rentals/${id}`), [id]);
  const [modal, setModal] = useState('');
  if (loading) return <Loading />;
  if (error) return <main className="container"><ErrorBox error={error} /></main>;
  const { rental: r, payment, cancellation } = data;
  const order = ['pending', 'confirmed', 'active', 'completed'];
  const idx = order.indexOf(r.status);
  const steps = [
    ['انبعت الطلب وتم الدفع', `${money(r.total)} محجوزين عند بوابة الدفع.`],
    ['الشركة وافقت', r.status === 'pending' ? `بانتظار رد الشركة · ${timeLeft(r.respondBy)}` : 'الحجز مؤكد.'],
    ['استلمت السيارة', 'بتوقّع عقد الإيجار عند الشركة وبتستلم السيارة.'],
    ['خلصت الرحلة', 'قيّم الشركة والسيارة.'],
  ];

  return (
    <main className="container col" style={{ gap: 20 }}>
      <Link to="/rentals">‹ حجوزاتي</Link>
      <div className="row between">
        <div className="col" style={{ gap: 2 }}>
          <div className="row"><StatusBadge map={RENTAL_STATUS} value={r.status} /><span className="muted ltr">{r.code}</span></div>
          <h1 style={{ fontSize: 26 }}>{carName(r.car)}</h1>
          <span className="muted">{r.company.name} · {fmtDateTime(r.startDate)} ← {fmtDateTime(r.endDate)}</span>
        </div>
        <div className="row">
          {canRenterCancel(r) && <button type="button" className="btn danger outline" onClick={() => setModal('cancel')}>إلغاء الحجز</button>}
          {r.status === 'completed' && !r.renterReviewed && <button type="button" className="btn" onClick={() => setModal('review')}>قيّم الشركة والسيارة</button>}
        </div>
      </div>
      <div className="split">
        <div className="col">
          {['rejected', 'cancelled', 'no_show'].includes(r.status) ? (
            <div className="card col">
              <h3>{RENTAL_STATUS[r.status].label}</h3>
              {r.status === 'rejected' && <p>{r.cancelledBy === 'system' ? 'الشركة ما ردّت خلال 12 ساعة، فالطلب انرفض تلقائياً.' : `الشركة رفضت الطلب${r.rejectionReason ? `: ${r.rejectionReason}` : ''}.`}</p>}
              {r.status === 'cancelled' && <p>{r.cancelledBy === 'company' ? 'الشركة لغت الحجز.' : 'إنت لغيت الحجز.'}</p>}
              {r.status === 'no_show' && <p>ما وصلت خلال ساعتين من موعد الاستلام، فانسجّل عدم حضور.</p>}
            </div>
          ) : (
            <div className="card col">
              <h3>حالة الحجز</h3>
              <ol className="timeline">
                {steps.map(([t, s], i) => <li key={t}><span className={`b ${i <= idx ? 'on' : ''}`}>{i + 1}</span><div><b>{t}</b><div className="muted small">{s}</div></div></li>)}
              </ol>
              {r.status === 'confirmed' && cancellation && (
                <div className={`alert ${cancellation.free ? 'green' : 'amber'}`}>
                  {cancellation.free ? `بتقدر تلغي مجاناً لحد ${fmtDateTime(cancellation.freeUntil)}.` : 'فاتت فترة الإلغاء المجاني. إذا لغيت بينخصم 60%.'}
                </div>
              )}
            </div>
          )}
          {['confirmed', 'active'].includes(r.status) && (
            <div className="card col">
              <h3>وقت الاستلام</h3>
              <ul style={{ margin: 0, paddingInlineStart: 18 }} className="col">
                <li><b>خد هويتك ورخصة السواقة</b>: نفس الوثائق اللي وثّقت فيها حسابك.</li>
                <li><b>بتوقّع عقد الإيجار عند الشركة</b>: الشركة بتجهّز العقد وبتشرحلك شروطها.</li>
                <li><b>{r.car.pickupLocation?.address}</b> · {fmtDateTime(r.startDate)}. إذا ما وصلت خلال ساعتين من الموعد، الشركة بتقدر تسجّل عدم حضور.</li>
              </ul>
            </div>
          )}
        </div>
        <aside className="col">
          <div className="card col">
            <h3>الدفع</h3>
            <div className="row between"><span>{money(r.dailyPrice)} × {daysWord(r.days)}</span><span>{money(r.total)}</span></div>
            <div className="row between bold"><span>المدفوع</span><span>{money(r.total)}</span></div>
            {payment && <span className="muted small">{PAY[payment.status]}{payment.refundAmount > 0 ? ` · رجعلك ${money(payment.refundAmount)}` : ''}</span>}
          </div>
          <div className="card col">
            <h3>الشركة</h3>
            <Link to={`/companies/${r.company._id}`} className="bold">{r.company.name}</Link>
            <span className="muted small">{r.company.company?.address}</span>
            {['confirmed', 'active'].includes(r.status) && r.company.company?.phone && <span className="ltr" style={{ textAlign: 'end' }}>{r.company.company.phone}</span>}
          </div>
        </aside>
      </div>
      {modal === 'cancel' && <CancelModal rental={r} onClose={() => setModal('')} onDone={() => { setModal(''); reload(); }} />}
      {modal === 'review' && <RenterReviewModal rental={r} onClose={() => setModal('')} onDone={() => { setModal(''); reload(); }} />}
    </main>
  );
}
