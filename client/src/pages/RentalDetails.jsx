import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { CancelModal, ExtensionModal, LateFeeModal, RenterReviewModal, canRenterCancel } from '../components/RentalActions.jsx';
import { Badge, CarImage, ErrorBox, Icon, Loading, StatusBadge, useLoad } from '../components/ui.jsx';
import { EXTENSION_STATUS, RENTAL_STATUS, carName, initial, daysWord, fmtDateTime, lateText, money, timeLeft } from '../labels.js';

const PAY = { due: 'مستحقة عليك', held: 'محجوز عند بوابة الدفع', transferred: 'انحوّل للشركة', refunded: 'رجع لحسابك كامل', partially_refunded: 'رجعلك جزء' };
const KIND = { extension: 'تمديد', late_fee: 'رسوم تأخير' };

export default function RentalDetails() {
  const { id } = useParams();
  const { data, loading, error, reload } = useLoad(() => api(`/rentals/${id}`), [id]);
  const [modal, setModal] = useState('');
  if (loading) return <Loading lines={5} />;
  if (error) return <main className="container page-body"><ErrorBox error={error} /></main>;
  const { rental: r, payment, extras = [], cancellation, extension, late } = data;
  const order = ['pending', 'confirmed', 'active', 'completed'];
  const idx = order.indexOf(r.status);
  const steps = [
    ['انبعت الطلب وتم الدفع', `${money(r.total)} محجوزين عند بوابة الدفع.`],
    ['الشركة وافقت', r.status === 'pending' ? `بانتظار رد الشركة · ${timeLeft(r.respondBy)}` : 'الحجز مؤكد.'],
    ['استلمت السيارة', 'بتوقّع عقد الإيجار عند الشركة وبتستلم السيارة.'],
    ['خلصت الرحلة', 'قيّم الشركة والسيارة.'],
  ];
  const dueFee = extras.find((p) => p.kind === 'late_fee' && p.status === 'due');
  const paidFee = extras.find((p) => p.kind === 'late_fee' && p.status !== 'due');
  const history = (r.extensions || []).filter((e) => e.status !== 'pending').slice().reverse();

  return (
    <main>
      <div className="page-band">
        <div className="container page-head">
          <nav className="crumbs" aria-label="مسار الصفحة">
            <ol><li><Link to="/">الرئيسية</Link></li><li><Link to="/rentals">حجوزاتي</Link></li><li><span aria-current="page" className="ltr">{r.code}</span></li></ol>
          </nav>
          <div className="rd-head">
            <div className="thumb"><CarImage car={r.car} alt="" /></div>
            <div className="page-head-copy">
              <div className="rr-top"><StatusBadge map={RENTAL_STATUS} value={r.status} /><span className="muted small ltr">{r.code}</span></div>
              <h1>{carName(r.car)}</h1>
              <div className="rr-meta">
                <span><Icon name="building" size={15} />{r.company.name}</span>
                <span><Icon name="calendar" size={15} />{fmtDateTime(r.startDate)} ← {fmtDateTime(r.endDate)}</span>
              </div>
            </div>
            <div className="page-head-actions">
              {canRenterCancel(r) && <button type="button" className="btn danger outline sm" onClick={() => setModal('cancel')}>إلغاء الحجز</button>}
              {r.status === 'completed' && !r.renterReviewed && <button type="button" className="btn sm" onClick={() => setModal('review')}><Icon name="star" size={18} />قيّم الشركة والسيارة</button>}
            </div>
          </div>
        </div>
      </div>

      <div className="container page-body">
        {dueFee && (
          <div className="alert amber row between">
            <span>رجّعت السيارة متأخر، فانحسب {daysWord(r.lateDays)} تأخير: <b>{money(dueFee.amount)}</b>.</span>
            <button type="button" className="btn sm" onClick={() => setModal('late')}>ادفع رسوم التأخير</button>
          </div>
        )}
        {r.status === 'active' && late?.lateMinutes > 0 && (
          <div className={`alert ${late.lateDays ? 'red' : 'amber'}`}>
            {late.lateDays
              ? `إنت متأخر ${lateText(late.lateMinutes)} عن موعد التسليم. رسوم التأخير لحد هلأ: ${money(late.fee)} (${daysWord(late.lateDays)}).`
              : `فات موعد التسليم بـ${lateText(late.lateMinutes)}. إنت لسا ضمن ساعة السماح لحد ${fmtDateTime(late.graceUntil)}.`}
          </div>
        )}

        <div className="split">
          <div className="col" style={{ gap: 20 }}>
            {['rejected', 'cancelled', 'no_show'].includes(r.status) ? (
              <section className="panel">
                <h2>{RENTAL_STATUS[r.status].label}</h2>
                {r.status === 'rejected' && <p>{r.cancelledBy === 'system' ? 'الشركة ما ردّت خلال 12 ساعة، فالطلب انرفض تلقائياً.' : `الشركة رفضت الطلب${r.rejectionReason ? `: ${r.rejectionReason}` : ''}.`}</p>}
                {r.status === 'cancelled' && <p>{r.cancelledBy === 'company' ? 'الشركة لغت الحجز.' : 'إنت لغيت الحجز.'}</p>}
                {r.status === 'no_show' && <p>ما وصلت خلال ساعتين من موعد الاستلام، فانسجّل عدم حضور.</p>}
                <Link to="/search" className="btn secondary" style={{ alignSelf: 'flex-start' }}>دوّر على سيارة ثانية</Link>
              </section>
            ) : (
              <section className="panel" aria-labelledby="status-title">
                <h2 id="status-title">حالة الحجز</h2>
                <ol className="timeline">
                  {steps.map(([t, s], i) => (
                    <li key={t} className={i < idx ? 'done' : ''}>
                      <span className={`b ${i <= idx ? 'on' : ''}`}>{i <= idx ? <Icon name="check" size={16} /> : i + 1}</span>
                      <div><b>{t}</b><div className="muted small">{s}</div></div>
                    </li>
                  ))}
                </ol>
                {r.status === 'confirmed' && cancellation && (
                  <div className={`alert ${cancellation.free ? 'green' : 'amber'}`}>
                    {cancellation.free ? `بتقدر تلغي مجاناً لحد ${fmtDateTime(cancellation.freeUntil)}.` : 'فاتت فترة الإلغاء المجاني. إذا لغيت بينخصم 60%.'}
                  </div>
                )}
                {r.status === 'completed' && r.returnedAt && (
                  <span className="muted small">رجّعت السيارة {fmtDateTime(r.returnedAt)}{r.lateDays ? ` · متأخر ${daysWord(r.lateDays)}` : ' · بالوقت'}.</span>
                )}
              </section>
            )}

            {r.status === 'active' && (
              <section className="panel" aria-labelledby="ext-title">
                <div className="panel-head">
                  <h2 id="ext-title" className="panel-title"><span className="ic-tile sm"><Icon name="clock" size={16} /></span>تمديد الحجز</h2>
                  {extension?.allowed && <button type="button" className="btn sm" onClick={() => setModal('extend')}>اطلب تمديد</button>}
                </div>
                {extension?.pending ? (
                  <div className="alert">
                    طلبت تمديد لحد <b>{fmtDateTime(extension.pending.requestedEnd)}</b> ({daysWord(extension.pending.extraDays)} · {money(extension.pending.amount)} محجوزين).
                    بستنى رد الشركة · {timeLeft(extension.pending.respondBy)}.
                  </div>
                ) : extension?.allowed ? (
                  <span className="muted small">بتقدر تطلب تمديد لحد {fmtDateTime(extension.deadline)} (قبل التسليم بـ{extension.minHoursBefore} ساعة). بتدفع الأيام الإضافية وقت الطلب، وبترجعلك إذا الشركة رفضت.</span>
                ) : <span className="muted small">{extension?.reason}</span>}
                {history.length > 0 && (
                  <ul className="col" style={{ margin: 0, padding: 0, listStyle: 'none', gap: 8 }}>
                    {history.map((e) => (
                      <li key={e._id} className="row between small">
                        <span>لحد {fmtDateTime(e.requestedEnd)} · {money(e.amount)}{e.reason ? ` · ${e.reason}` : ''}</span>
                        <StatusBadge map={EXTENSION_STATUS} value={e.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {['confirmed', 'active'].includes(r.status) && (
              <section className="panel" aria-labelledby="pickup-title">
                <h2 id="pickup-title">الاستلام والتسليم</h2>
                <ul className="check-list">
                  <li><Icon name="doc" size={18} /><span><b>خد هويتك ورخصة السواقة</b>: نفس الوثائق اللي وثّقت فيها حسابك.</span></li>
                  <li><Icon name="key" size={18} /><span><b>بتوقّع عقد الإيجار عند الشركة</b>: الشركة بتجهّز العقد وبتشرحلك شروطها.</span></li>
                  <li><Icon name="pin" size={18} /><span><b>{r.car.pickupLocation?.address}</b> · استلام {fmtDateTime(r.startDate)}. إذا ما وصلت خلال ساعتين من الموعد، الشركة بتقدر تسجّل عدم حضور.</span></li>
                  <li><Icon name="clock" size={18} /><span><b>التسليم {fmtDateTime(r.endDate)}</b> على نفس الفرع. في ساعة سماح، وبعدها كل 24 ساعة تأخير بتنحسب يوم كامل ({money(r.dailyPrice)}).</span></li>
                </ul>
              </section>
            )}
          </div>

          <aside className="col stick" style={{ gap: 20 }}>
            <section className="panel" aria-labelledby="pay-title">
              <h2 id="pay-title" style={{ fontSize: 'var(--fs-4)' }}>الدفع</h2>
              <div className="sum-line"><span>{money(r.dailyPrice)} × {daysWord(r.days)}</span><span>{money(r.total)}</span></div>
              {payment && <span className="muted small">الحجز: {PAY[payment.status]}{payment.refundAmount > 0 ? ` · رجعلك ${money(payment.refundAmount)}` : ''}</span>}
              {extras.map((p) => (
                <div key={p._id} className="row between small">
                  <span>{KIND[p.kind]} · {money(p.amount)}</span>
                  <Badge tone={p.status === 'due' ? 'amber' : p.status === 'refunded' ? '' : 'green'}>{PAY[p.status]}</Badge>
                </div>
              ))}
              {paidFee && <span className="muted small">دفعت رسوم التأخير.</span>}
            </section>
            <section className="panel" aria-labelledby="co-title">
              <h2 id="co-title" style={{ fontSize: 'var(--fs-4)' }}>الشركة</h2>
              <Link to={`/companies/${r.company._id}`} className="company-card">
                <span className="co-avatar">{initial(r.company.name)}</span>
                <span className="col grow" style={{ gap: 2, minWidth: 0 }}>
                  <b>{r.company.name}</b>
                  <span className="small muted">{r.company.company?.address}</span>
                </span>
                <span className="go"><Icon name="arrowLeft" size={20} /></span>
              </Link>
              {['confirmed', 'active'].includes(r.status) && r.company.company?.phone && (
                <span className="kv"><span>هاتف الشركة</span><span className="ltr">{r.company.company.phone}</span></span>
              )}
            </section>
            <Link to="/terms" className="small" target="_blank" rel="noreferrer">الشروط والسياسات اللي وافقت عليها{r.termsVersion ? <> (نسخة <span className="ltr">{r.termsVersion}</span>)</> : null}</Link>
          </aside>
        </div>
      </div>
      {modal === 'cancel' && <CancelModal rental={r} onClose={() => setModal('')} onDone={() => { setModal(''); reload(); }} />}
      {modal === 'review' && <RenterReviewModal rental={r} onClose={() => setModal('')} onDone={() => { setModal(''); reload(); }} />}
      {modal === 'extend' && <ExtensionModal rental={r} minHoursBefore={extension?.minHoursBefore} onClose={() => setModal('')} onDone={() => { setModal(''); reload(); }} />}
      {modal === 'late' && dueFee && <LateFeeModal rental={r} amount={dueFee.amount} onClose={() => setModal('')} onDone={() => { setModal(''); reload(); }} />}
    </main>
  );
}
