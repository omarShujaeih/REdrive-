import { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { ErrorBox, Field, Modal, StarInput } from './ui.jsx';
import { HOURS, carName, countDays, daysWord, extraDaysText, fmtDateTime, isoDay, money } from '../labels.js';

// Sandbox card fields shared by the extension and late-fee payments.
function useCard() {
  const [card, setCard] = useState({ number: '', exp: '', cvv: '' });
  const [errs, setErrs] = useState({});
  const validate = () => {
    const n = card.number.replace(/\s/g, '');
    const v = {
      number: /^\d{13,19}$/.test(n) ? '' : 'رقم البطاقة غير صحيح',
      exp: /^(0[1-9]|1[0-2])\/\d{2}$/.test(card.exp) ? '' : 'بصيغة MM/YY',
      cvv: /^\d{3,4}$/.test(card.cvv) ? '' : '3 أو 4 أرقام',
    };
    setErrs(v);
    return Object.values(v).some(Boolean) ? null : { number: n };
  };
  const fields = (
    <>
      <Field label="رقم البطاقة" error={errs.number}><input className="input ltr" inputMode="numeric" autoComplete="cc-number" value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value })} placeholder="4242 4242 4242 4242" /></Field>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <Field label="تاريخ الانتهاء" error={errs.exp}><input className="input ltr" autoComplete="cc-exp" placeholder="MM/YY" value={card.exp} onChange={(e) => setCard({ ...card, exp: e.target.value })} /></Field>
        <Field label="رمز الأمان (CVV)" error={errs.cvv}><input className="input ltr" inputMode="numeric" autoComplete="cc-csc" value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value })} /></Field>
      </div>
      <span className="muted small">وضع التجربة: أي رقم تجريبي مثل 4242 4242 4242 4242. الرقم اللي بيخلص بـ 0002 بيترفض.</span>
    </>
  );
  return { fields, validate };
}

const payError = (err) => (err.status === 402 ? 'البنك رفض العملية، فما انخصم منك إشي. تأكد من بيانات البطاقة وجرّب مرة ثانية.' : err.message);

// Renter asks to return the car later; the extra days are paid now and held until the company decides.
export function ExtensionModal({ rental, minHoursBefore, onClose, onDone }) {
  const { setToast } = useAuth();
  const currentEnd = new Date(rental.endDate);
  const [day, setDay] = useState(isoDay(currentEnd.getTime() + 86400000));
  const [time, setTime] = useState(`${String(currentEnd.getHours()).padStart(2, '0')}:00`);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { fields, validate } = useCard();
  const newEnd = new Date(`${day}T${time}:00`);
  const valid = newEnd > currentEnd;
  const extraDays = valid ? countDays(currentEnd, newEnd) : 0;
  const amount = extraDays * rental.dailyPrice;

  const send = async (e) => {
    e.preventDefault();
    const card = validate();
    if (!card || !valid) return;
    setBusy(true); setError('');
    try {
      await api(`/rentals/${rental._id}/extensions`, { method: 'POST', body: { endDate: newEnd, card } });
      setToast('انبعت طلب التمديد للشركة'); onDone();
    } catch (err) { setError(payError(err)); } finally { setBusy(false); }
  };

  return (
    <Modal title="اطلب تمديد" onClose={onClose}>
      <form className="col" onSubmit={send} noValidate>
        <span className="muted small">موعد التسليم الحالي: <b>{fmtDateTime(currentEnd)}</b>. التمديد لازم ينطلب قبل التسليم بـ{minHoursBefore} ساعة على الأقل.</span>
        <div className="time-row">
          <Field label="يوم التسليم الجديد"><input className="input" type="date" value={day} min={isoDay(currentEnd)} onChange={(e) => setDay(e.target.value)} /></Field>
          <Field label="الساعة"><select className="input" value={time} onChange={(e) => setTime(e.target.value)}>{HOURS.map((h) => <option key={h} value={h}>{h}</option>)}</select></Field>
        </div>
        {valid ? (
          <div className="alert small">{extraDaysText(extraDays)} · <b>{money(amount)}</b>. بتدفعها هلأ، وإذا الشركة رفضت أو ما ردّت بترجعلك كاملة.</div>
        ) : <div className="alert amber small">الموعد الجديد لازم يكون بعد موعد التسليم الحالي.</div>}
        {fields}
        <ErrorBox error={error} />
        <div className="row">
          <button className="btn" disabled={busy || !valid}>{busy ? 'عم نبعت الطلب…' : `ادفع ${money(amount)} وابعث الطلب`}</button>
          <button type="button" className="btn secondary" onClick={onClose}>تراجع</button>
        </div>
      </form>
    </Modal>
  );
}

// Renter pays the late-return fee the company recorded.
export function LateFeeModal({ rental, amount, onClose, onDone }) {
  const { setToast } = useAuth();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { fields, validate } = useCard();
  const pay = async (e) => {
    e.preventDefault();
    const card = validate();
    if (!card) return;
    setBusy(true); setError('');
    try {
      await api(`/rentals/${rental._id}/late-fee/pay`, { method: 'POST', body: { card } });
      setToast('انْدفعت رسوم التأخير'); onDone();
    } catch (err) { setError(payError(err)); } finally { setBusy(false); }
  };
  return (
    <Modal title="ادفع رسوم التأخير" onClose={onClose}>
      <form className="col" onSubmit={pay} noValidate>
        <span className="muted small">رجّعت السيارة {fmtDateTime(rental.returnedAt)}، وموعد التسليم كان {fmtDateTime(rental.endDate)}. انحسب {daysWord(rental.lateDays)} تأخير.</span>
        {fields}
        <ErrorBox error={error} />
        <div className="row">
          <button className="btn" disabled={busy}>{busy ? 'عم نتأكد من الدفع…' : `ادفع ${money(amount)}`}</button>
          <button type="button" className="btn secondary" onClick={onClose}>بعدين</button>
        </div>
      </form>
    </Modal>
  );
}

export function cancelTerms(r) {
  if (r.status === 'pending') return { free: true };
  const freeUntil = new Date(new Date(r.acceptedAt).getTime() + 6 * 3600000);
  return { free: Date.now() <= freeUntil, freeUntil };
}
export const canRenterCancel = (r) => r.status === 'pending' || (r.status === 'confirmed' && new Date(r.startDate) > new Date());

export function CancelModal({ rental, onClose, onDone }) {
  const { setToast } = useAuth();
  const [error, setError] = useState('');
  const t = cancelTerms(rental);
  const go = async () => {
    try { await api(`/rentals/${rental._id}/cancel`, { method: 'POST' }); setToast('انلغى الحجز'); onDone(); } catch (e) { setError(e.message); }
  };
  return (
    <Modal title={`تلغي حجز ${carName(rental.car)}؟`} onClose={onClose}>
      <span className="muted small ltr" style={{ textAlign: 'end' }}>{rental.code}</span>
      {t.free ? (
        <div className="alert green">الإلغاء مجاني، وبيرجعلك المبلغ كامل ({money(rental.total)}).</div>
      ) : (
        <div className="alert amber">فاتت فترة الإلغاء المجاني. بينخصم 60% ({money(rental.total * 0.6)}) وبيرجعلك {money(rental.total * 0.4)}.</div>
      )}
      <ErrorBox error={error} />
      <div className="row"><button type="button" className="btn danger" onClick={go}>ألغِ الحجز</button><button type="button" className="btn secondary" onClick={onClose}>تراجع</button></div>
    </Modal>
  );
}

export function RenterReviewModal({ rental, onClose, onDone }) {
  const { setToast } = useAuth();
  const [companyStars, setCompanyStars] = useState(0);
  const [carStars, setCarStars] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const send = async () => {
    try {
      await api(`/rentals/${rental._id}/review`, { method: 'POST', body: { companyStars, carStars, comment } });
      setToast('شكراً! انضاف تقييمك'); onDone();
    } catch (e) { setError(e.message); }
  };
  return (
    <Modal title="كيف كانت رحلتك؟" onClose={onClose}>
      <span className="muted small">{carName(rental.car)} · {rental.company?.name}. بتقدر تقيّم مرة وحدة بس.</span>
      <Field label="قيّم الشركة"><StarInput value={companyStars} onChange={setCompanyStars} label="تقييم الشركة" /></Field>
      <Field label="قيّم السيارة"><StarInput value={carStars} onChange={setCarStars} label="تقييم السيارة" /></Field>
      <Field label="تعليقك" hint="تقييمك بيظهر بصفحة السيارة والشركة."><textarea className="input" value={comment} onChange={(e) => setComment(e.target.value)} /></Field>
      <ErrorBox error={error} />
      <div className="row"><button type="button" className="btn" disabled={!companyStars || !carStars} onClick={send}>أرسل التقييم</button><button type="button" className="btn secondary" onClick={onClose}>بعدين</button></div>
    </Modal>
  );
}
