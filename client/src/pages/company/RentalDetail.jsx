import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import { PageTitle } from '../../components/Layout.jsx';
import { ErrorBox, Field, Loading, Modal, StarInput, Stars, StatusBadge, useLoad } from '../../components/ui.jsx';
import { RENTAL_STATUS, carName, daysWord, fmtDateTime, money } from '../../labels.js';

export default function RentalDetail() {
  const { id } = useParams();
  const { setToast } = useAuth();
  const { data, loading, error: loadError, reload } = useLoad(() => api(`/rentals/${id}`), [id]);
  const [error, setError] = useState('');
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);
  if (loading) return <Loading />;
  if (loadError) return <ErrorBox error={loadError} />;
  const { rental: r, payment, commissionRate } = data;
  const now = Date.now();
  const start = new Date(r.startDate).getTime();
  const canPickup = r.status === 'confirmed' && now >= start - 2 * 3600000;
  const canNoShow = r.status === 'confirmed' && now >= start + 2 * 3600000;

  const act = async (action, body, msg) => {
    setError('');
    try { await api(`/rentals/${id}/${action}`, { method: 'POST', body }); setToast(msg); setConfirmCancel(false); reload(); } catch (e) { setError(e.message); }
  };
  const fee = r.total * commissionRate;

  return (
    <>
      <Link to="/company/rentals">‹ الحجوزات</Link>
      <PageTitle title={carName(r.car)} sub={`${fmtDateTime(r.startDate)} ← ${fmtDateTime(r.endDate)} · ${daysWord(r.days)} · ${money(r.total)}`}>
        <StatusBadge map={RENTAL_STATUS} value={r.status} /><span className="muted ltr">{r.code}</span>
      </PageTitle>
      <ErrorBox error={error} />
      <div className="split" style={{ marginTop: 12 }}>
        <div className="col">
          {r.status === 'confirmed' && (
            <section className="card col">
              <h3>{canPickup ? 'الزبون جاي يستلم' : 'حجز مؤكد'}</h3>
              <ul style={{ margin: 0, paddingInlineStart: 18 }} className="col">
                <li>الهوية ورخصة السواقة موثّقين على Redrive. طابقهم مع الأصل.</li>
                <li>وقّع عقد الإيجار مع الزبون عندك.</li>
                <li>لما تأكد الاستلام، المبلغ بيتحوّل لحسابك بعد خصم عمولة المنصة.</li>
              </ul>
              <div className="row">
                <button type="button" className="btn" disabled={!canPickup} onClick={() => act('pickup', null, 'تأكد الاستلام، والمبلغ انحوّل لحسابك')}>أكّد إنه الزبون استلم السيارة</button>
                <button type="button" className="btn danger outline" disabled={!canNoShow} onClick={() => act('no-show', null, 'انسجّل عدم حضور')}>ما إجا (عدم حضور)</button>
                <button type="button" className="btn ghost" onClick={() => setConfirmCancel(true)}>إلغاء الحجز</button>
              </div>
              <span className="muted small">{!canPickup ? 'زر الاستلام بيتفعّل قبل الموعد بساعتين. ' : ''}بتقدر تسجّل عدم حضور إذا ما إجا الزبون خلال ساعتين من الموعد، وبينخصم منه 60% من المبلغ.</span>
            </section>
          )}
          {r.status === 'active' && (
            <section className="card col">
              <h3>السيارة مع الزبون</h3>
              <p>موعد التسليم {fmtDateTime(r.endDate)}. لما ترجع السيارة أكّد الإرجاع.</p>
              <button type="button" className="btn" onClick={() => act('return', null, 'تأكد الإرجاع')}>أكّد إرجاع السيارة</button>
            </section>
          )}
          {r.status === 'completed' && (
            <section className="card col">
              <h3>كيف كان الزبون؟</h3>
              {r.companyReviewed ? <div className="alert green">قيّمت الزبون، والتقييم انضاف لملفه.</div> : (
                <>
                  <StarInput value={stars} onChange={setStars} label="تقييم الزبون" />
                  <Field label="تعليقك (بيشوفه باقي الشركات بملف الزبون)"><textarea className="input" value={comment} onChange={(e) => setComment(e.target.value)} /></Field>
                  <button type="button" className="btn" disabled={!stars} onClick={() => act('review', { stars, comment }, 'انضاف التقييم لملف الزبون')}>أرسل التقييم</button>
                </>
              )}
            </section>
          )}
          {['cancelled', 'rejected', 'no_show'].includes(r.status) && (
            <section className="card"><b>{RENTAL_STATUS[r.status].label}</b>{r.cancelledBy && <span className="muted"> · {r.cancelledBy === 'renter' ? 'لغاه المستأجر' : r.cancelledBy === 'company' ? 'لغيته إنت' : 'تلقائياً'}</span>}</section>
          )}
        </div>
        <aside className="col">
          <section className="card col">
            <h3>الزبون</h3>
            <div className="row"><span className="avatar">{r.renter.name[0]}</span><div className="col" style={{ gap: 0 }}><b>{r.renter.name}</b><span className="muted small"><Stars value={r.renter.ratingAvg} /> · {r.renter.ratingCount} تقييم</span></div></div>
            {['confirmed', 'active'].includes(r.status) && <span className="ltr" style={{ textAlign: 'end' }}>{r.renter.phone}</span>}
            <Link className="btn secondary sm" to={`/company/renters/${r.renter._id}`}>ملف الزبون</Link>
          </section>
          <section className="card col">
            <h3>المبلغ</h3>
            <div className="row between"><span>{money(r.dailyPrice)} × {daysWord(r.days)}</span><span>{money(r.total)}</span></div>
            <div className="row between"><span>عمولة المنصة (10%)</span><span>−{money(fee)}</span></div>
            <div className="row between bold"><span>صافي إلك</span><span>{money(payment?.transferAmount || r.total - fee)}</span></div>
            <span className="muted small">{payment?.status === 'held' ? 'المبلغ محجوز، وبيتحوّل لحسابك لما تأكد الاستلام.' : payment?.transferAmount ? `انحوّل ${money(payment.transferAmount)} لحسابك.` : 'ما في تحويل على هالحجز.'}</span>
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
