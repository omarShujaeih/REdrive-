import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api.js';
import { useAuth, useLiveRefresh } from '../../auth.jsx';
import { PageTitle } from '../../components/Layout.jsx';
import { Badge, CarImage, ErrorBox, Field, Icon, Loading, Modal, StarInput, Stars, StatusBadge, useLoad } from '../../components/ui.jsx';
import { usePolicies } from '../../components/Policies.jsx';
import { EXTENSION_STATUS, RENTAL_STATUS, carName, daysWord, extraDaysText, fmtDateTime, initial, lateText, localStamp, money, timeLeft } from '../../labels.js';

const KIND = { extension: 'تمديد', late_fee: 'رسوم تأخير' };
const PAY = { due: 'مستحقة على الزبون', held: 'محجوز', transferred: 'انحوّل لحسابك', refunded: 'رجع للزبون', partially_refunded: 'جزء رجع للزبون' };

export default function RentalDetail() {
  const { id } = useParams();
  const { setToast } = useAuth();
  const policies = usePolicies();
  const { data, loading, error: loadError, reload, refresh } = useLoad(() => api(`/rentals/${id}`), [id]);
  useLiveRefresh(refresh, ['rental', 'payment']);
  const [error, setError] = useState('');
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [returnedAt, setReturnedAt] = useState(() => localStamp(Date.now()));
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  if (loading) return <Loading />;
  if (loadError) return <ErrorBox error={loadError} />;
  const { rental: r, payment, extras = [], commissionRate, late } = data;
  const pendingExt = (r.extensions || []).find((e) => e.status === 'pending');
  const history = (r.extensions || []).filter((e) => e.status !== 'pending').slice().reverse();
  // Same rule as the API: free within the grace period, then a full day per started 24h of lateness.
  const lateMs = new Date(returnedAt) - new Date(r.endDate);
  const previewDays = lateMs > policies.lateGraceHours * 3600000 ? Math.ceil(lateMs / 86400000) : 0;
  const lateFeePay = extras.find((p) => p.kind === 'late_fee');
  const now = Date.now();
  const start = new Date(r.startDate).getTime();
  const canPickup = r.status === 'confirmed' && now >= start - 2 * 3600000;
  const canNoShow = r.status === 'confirmed' && now >= start + 2 * 3600000;

  const act = async (action, body, msg) => {
    setError('');
    try { await api(`/rentals/${id}/${action}`, { method: 'POST', body }); setToast(msg); setConfirmCancel(false); reload(); } catch (e) { setError(e.message); }
  };
  const fee = r.total * commissionRate;
  const net = [payment, ...extras].filter((p) => p && ['transferred', 'partially_refunded'].includes(p.status)).reduce((s, p) => s + p.transferAmount, 0) || r.total - fee;

  return (
    <>
      <PageTitle back={['/company/rentals', 'الحجوزات']} title={carName(r.car)} sub={`${fmtDateTime(r.startDate)} ← ${fmtDateTime(r.endDate)} · ${daysWord(r.days)} · ${money(r.total)}`}>
        <StatusBadge map={RENTAL_STATUS} value={r.status} /><span className="muted small ltr">{r.code}</span>
      </PageTitle>
      <ErrorBox error={error} />
      <div className="split" style={{ marginTop: 4 }}>
        <div className="col" style={{ gap: 16 }}>
          {r.status === 'confirmed' && (
            <section className="panel" aria-labelledby="pickup-title">
              <h2 id="pickup-title" className="panel-title"><span className="ic-tile sm"><Icon name="key" size={16} /></span>{canPickup ? 'الزبون جاي يستلم' : 'حجز مؤكد'}</h2>
              <ul className="check-list">
                <li><Icon name="shield" size={18} /><span>الهوية ورخصة السواقة موثّقين على Redrive. طابقهم مع الأصل.</span></li>
                <li><Icon name="doc" size={18} /><span>وقّع عقد الإيجار مع الزبون عندك.</span></li>
                <li><Icon name="card" size={18} /><span>لما تأكد الاستلام، المبلغ بيتحوّل لحسابك بعد خصم عمولة المنصة.</span></li>
              </ul>
              <div className="row">
                <button type="button" className="btn" disabled={!canPickup} onClick={() => act('pickup', null, 'تأكد الاستلام، والمبلغ انحوّل لحسابك')}><Icon name="check" size={18} />أكّد إنه الزبون استلم السيارة</button>
                <button type="button" className="btn danger outline" disabled={!canNoShow} onClick={() => act('no-show', null, 'انسجّل عدم حضور')}>ما إجا (عدم حضور)</button>
                <button type="button" className="btn ghost" onClick={() => setConfirmCancel(true)}>إلغاء الحجز</button>
              </div>
              <span className="muted small">{!canPickup ? 'زر الاستلام بيتفعّل قبل الموعد بساعتين. ' : ''}بتقدر تسجّل عدم حضور إذا ما إجا الزبون خلال ساعتين من الموعد، وبينخصم منه 60% من المبلغ.</span>
            </section>
          )}
          {r.status === 'active' && pendingExt && (
            <section className="panel" aria-labelledby="ext-title">
              <div className="panel-head">
                <h2 id="ext-title" className="panel-title"><span className="ic-tile sm warn"><Icon name="clock" size={16} /></span>طلب تمديد</h2>
                <span className="badge amber">{timeLeft(pendingExt.respondBy)}</span>
              </div>
              <p>الزبون بدّه يرجّع السيارة <b>{fmtDateTime(pendingExt.requestedEnd)}</b> بدل {fmtDateTime(pendingExt.previousEnd)}: {extraDaysText(pendingExt.extraDays)} · <b>{money(pendingExt.amount)}</b> مدفوعين ومحجوزين.</p>
              <span className="muted small">إذا وافقت بيتعدّل موعد التسليم وبيتحوّل المبلغ لحسابك بعد العمولة. إذا رفضت أو ما رديت قبل الموعد، بيرجع للزبون.</span>
              {rejecting ? (
                <>
                  <Field label="سبب الرفض (بيوصل للزبون)"><textarea className="input" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} /></Field>
                  <div className="row">
                    <button type="button" className="btn danger" onClick={() => { setRejecting(false); act(`extensions/${pendingExt._id}/reject`, { reason: rejectReason }, 'رفضت التمديد، والمبلغ رجع للزبون'); }}>ارفض التمديد</button>
                    <button type="button" className="btn secondary" onClick={() => setRejecting(false)}>تراجع</button>
                  </div>
                </>
              ) : (
                <div className="row">
                  <button type="button" className="btn" onClick={() => act(`extensions/${pendingExt._id}/approve`, null, 'وافقت على التمديد، والمبلغ انحوّل لحسابك')}><Icon name="check" size={18} />وافق على التمديد</button>
                  <button type="button" className="btn danger outline" onClick={() => setRejecting(true)}>ارفض</button>
                </div>
              )}
            </section>
          )}
          {r.status === 'active' && (
            <section className="panel" aria-labelledby="return-title">
              <h2 id="return-title" className="panel-title"><span className="ic-tile sm good"><Icon name="car" size={16} /></span>السيارة مع الزبون</h2>
              <p>موعد التسليم {fmtDateTime(r.endDate)}.{late?.lateMinutes > 0 ? ` الزبون متأخر ${lateText(late.lateMinutes)}.` : ''}</p>
              <Field label="وقت الإرجاع الفعلي" hint={`في ساعة سماح بعد الموعد، وبعدها كل 24 ساعة تأخير أو جزء منها بتنحسب يوم (${money(r.dailyPrice)}).`}>
                <input className="input" type="datetime-local" value={returnedAt} max={localStamp(Date.now() + 5 * 60000)} onChange={(e) => setReturnedAt(e.target.value)} style={{ maxWidth: 320 }} />
              </Field>
              <div className={`alert ${previewDays ? 'amber' : 'green'} small`}>
                {previewDays ? `تأخير ${daysWord(previewDays)}: بتنسجّل رسوم ${money(previewDays * r.dailyPrice)} على الزبون، وبيدفعها أونلاين.` : 'بالوقت أو ضمن ساعة السماح: ما في رسوم تأخير.'}
              </div>
              <button type="button" className="btn" style={{ alignSelf: 'flex-start' }} onClick={() => act('return', { returnedAt: new Date(returnedAt) }, previewDays ? 'تأكد الإرجاع، وانسجّلت رسوم التأخير على الزبون' : 'تأكد الإرجاع')}><Icon name="check" size={18} />أكّد إرجاع السيارة</button>
            </section>
          )}
          {history.length > 0 && (
            <section className="panel" aria-labelledby="hist-title">
              <h2 id="hist-title" className="panel-title"><span className="ic-tile sm soft"><Icon name="clock" size={16} /></span>طلبات التمديد</h2>
              {history.map((e) => (
                <div key={e._id} className="row between small">
                  <span>لحد {fmtDateTime(e.requestedEnd)} · {daysWord(e.extraDays)} · {money(e.amount)}{e.reason ? ` · ${e.reason}` : ''}</span>
                  <StatusBadge map={EXTENSION_STATUS} value={e.status} />
                </div>
              ))}
            </section>
          )}
          {r.status === 'completed' && r.lateFee > 0 && (
            <section className="panel" aria-labelledby="late-title">
              <h2 id="late-title" className="panel-title"><span className="ic-tile sm warn"><Icon name="alert" size={16} /></span>رسوم التأخير</h2>
              <p>رجعت السيارة {fmtDateTime(r.returnedAt)}، والموعد كان {fmtDateTime(r.endDate)}: {daysWord(r.lateDays)} · {money(r.lateFee)}.</p>
              <span className="muted small">{lateFeePay?.status === 'due' ? 'بستنى الزبون يدفعها أونلاين.' : `انْدفعت، وانحوّل ${money(lateFeePay?.transferAmount || 0)} لحسابك بعد العمولة.`}</span>
            </section>
          )}
          {r.status === 'completed' && (
            <section className="panel" aria-labelledby="rate-title">
              <h2 id="rate-title" className="panel-title"><span className="ic-tile sm"><Icon name="star" size={16} /></span>كيف كان الزبون؟</h2>
              {r.companyReviewed ? <div className="alert green">قيّمت الزبون، والتقييم انضاف لملفه.</div> : (
                <>
                  <StarInput value={stars} onChange={setStars} label="تقييم الزبون" />
                  <Field label="تعليقك (بيشوفه باقي الشركات بملف الزبون)"><textarea className="input" value={comment} onChange={(e) => setComment(e.target.value)} /></Field>
                  <button type="button" className="btn" style={{ alignSelf: 'flex-start' }} disabled={!stars} onClick={() => act('review', { stars, comment }, 'انضاف التقييم لملف الزبون')}>أرسل التقييم</button>
                </>
              )}
            </section>
          )}
          {['cancelled', 'rejected', 'no_show'].includes(r.status) && (
            <section className="panel">
              <h2 className="panel-title"><span className="ic-tile sm bad"><Icon name="close" size={16} /></span>{RENTAL_STATUS[r.status].label}</h2>
              {r.cancelledBy && <span className="muted">{r.cancelledBy === 'renter' ? 'لغاه المستأجر' : r.cancelledBy === 'company' ? 'لغيته إنت' : 'تلقائياً'}</span>}
            </section>
          )}
        </div>

        <aside className="col stick" style={{ gap: 16 }}>
          <section className="panel" aria-labelledby="car-title">
            <div className="thumb" style={{ borderRadius: 14 }}><CarImage car={r.car} alt="" /></div>
            <h2 id="car-title" style={{ fontSize: 'var(--fs-4)' }}>{carName(r.car)}</h2>
          </section>
          <section className="panel" aria-labelledby="renter-title">
            <h2 id="renter-title" style={{ fontSize: 'var(--fs-4)' }}>الزبون</h2>
            <div className="row" style={{ gap: 12 }}>
              <span className="avatar" aria-hidden="true">{initial(r.renter.name)}</span>
              <div className="col" style={{ gap: 0 }}><b>{r.renter.name}</b><span className="muted small"><Stars value={r.renter.ratingAvg} /> · {r.renter.ratingCount} تقييم</span></div>
            </div>
            {['confirmed', 'active'].includes(r.status) && <span className="kv"><span>الجوال</span><span className="ltr">{r.renter.phone}</span></span>}
            <Link className="btn secondary sm" to={`/company/renters/${r.renter._id}`}><Icon name="user" size={16} />ملف الزبون</Link>
          </section>
          <section className="panel" aria-labelledby="money-title">
            <h2 id="money-title" style={{ fontSize: 'var(--fs-4)' }}>المبلغ</h2>
            <div className="sum-line"><span>{money(r.dailyPrice)} × {daysWord(r.days)}</span><span>{money(r.total)}</span></div>
            <div className="sum-line"><span>عمولة المنصة (10%)</span><span>−{money(fee)}</span></div>
            <div className="sum-total"><span>صافي إلك</span><span>{money(net)}</span></div>
            <span className="muted small">{payment?.status === 'held' ? 'المبلغ محجوز، وبيتحوّل لحسابك لما تأكد الاستلام.' : payment?.transferAmount ? `انحوّل ${money(payment.transferAmount)} لحسابك.` : 'ما في تحويل على هالحجز.'}</span>
            {extras.map((p) => (
              <div key={p._id} className="row between small">
                <span>{KIND[p.kind]} · {money(p.amount)}</span>
                <Badge tone={p.status === 'due' || p.status === 'held' ? 'amber' : p.status === 'refunded' ? '' : 'green'}>{PAY[p.status]}</Badge>
              </div>
            ))}
          </section>
        </aside>
      </div>
      {confirmCancel && (
        <Modal title="تلغي هالحجز؟" onClose={() => setConfirmCancel(false)}>
          <p>المبلغ كامل ({money(r.total)}) بيرجع للمستأجر، وبيوصله إشعار وإيميل.</p>
          <div className="row"><button type="button" className="btn danger" onClick={() => act('cancel', null, 'انلغى الحجز، والمبلغ رجع للمستأجر')}>ألغِ الحجز</button><button type="button" className="btn secondary" onClick={() => setConfirmCancel(false)}>تراجع</button></div>
        </Modal>
      )}
    </>
  );
}
