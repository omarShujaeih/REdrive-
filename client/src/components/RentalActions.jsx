import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { ErrorBox, Field, Modal, StarInput } from './ui.jsx';
import StripePay from './StripePay.jsx';
import { carName, countDays, dayName, daysWord, extraDaysText, fmtDateTime, isoDay, money, slotsForDay } from '../labels.js';

// The server's payment mode: 'stripe' (real card form) or 'sim' (sandbox card fields); null while loading.
export function usePaymentMode() {
  const [mode, setMode] = useState(null);
  useEffect(() => {
    let alive = true;
    api('/rentals/payment-mode').then((r) => alive && setMode(r.mode)).catch(() => alive && setMode('sim'));
    return () => { alive = false; };
  }, []);
  return mode;
}

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
      <div className="form-grid">
        <Field label="تاريخ الانتهاء" error={errs.exp}><input className="input ltr" autoComplete="cc-exp" placeholder="MM/YY" value={card.exp} onChange={(e) => setCard({ ...card, exp: e.target.value })} /></Field>
        <Field label="رمز الأمان (CVV)" error={errs.cvv}><input className="input ltr" inputMode="numeric" autoComplete="cc-csc" value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value })} /></Field>
      </div>
      <span className="muted small">وضع التجربة: أي رقم تجريبي مثل 4242 4242 4242 4242. الرقم اللي بيخلص بـ 0002 بيترفض.</span>
    </>
  );
  return { fields, validate };
}

const payError = (err) => (err.status === 402 ? 'البنك رفض العملية، فما انخصم منك إشي. تأكد من بيانات البطاقة وجرّب مرة ثانية.' : err.message);

// Card step of a payment: the Stripe form in Stripe mode, the sandbox fields otherwise.
// submit(payment) sends the action with { card } (sandbox) or { paymentIntentId } (Stripe).
function PayStep({ mode, intentPath, intentBody, amount, label, disabled, submit, onClose, cancelLabel }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { fields, validate } = useCard();
  if (!mode) return <span className="muted small">عم نجهّز الدفع…</span>;
  if (mode === 'stripe') {
    return <StripePay intentPath={intentPath} intentBody={intentBody} total={amount} label={label} disabled={disabled} onConfirmed={(paymentIntentId) => submit({ paymentIntentId })} onCancel={onClose} cancelLabel={cancelLabel} />;
  }
  const send = async (e) => {
    e.preventDefault();
    const card = validate();
    if (!card || disabled) return;
    setBusy(true); setError('');
    try { await submit({ card }); } catch (err) { setError(payError(err)); } finally { setBusy(false); }
  };
  return (
    <form className="col" onSubmit={send} noValidate>
      {fields}
      <ErrorBox error={error} />
      <div className="row">
        <button type="submit" className="btn" disabled={busy || disabled}>{busy ? 'عم نتأكد من الدفع…' : label}</button>
        <button type="button" className="btn secondary" onClick={onClose}>{cancelLabel}</button>
      </div>
    </form>
  );
}

// Renter asks to return the car later; the extra days are paid now and held until the company decides.
export function ExtensionModal({ rental, minHoursBefore, onClose, onDone }) {
  const { setToast } = useAuth();
  const mode = usePaymentMode();
  const currentEnd = new Date(rental.endDate);
  const [day, setDay] = useState(isoDay(currentEnd.getTime() + 86400000));
  const [time, setTime] = useState(`${String(currentEnd.getHours()).padStart(2, '0')}:00`);
  const slots = slotsForDay(rental.company, day);
  const t = slots.includes(time) ? time : slots[0];
  const newEnd = t ? new Date(`${day}T${t}:00`) : null;
  const valid = Boolean(newEnd) && newEnd > currentEnd;
  const extraDays = valid ? countDays(currentEnd, newEnd) : 0;
  const amount = extraDays * rental.dailyPrice;

  const submit = async (payment) => {
    await api(`/rentals/${rental._id}/extensions`, { method: 'POST', body: { endDate: newEnd, ...payment } });
    setToast('انبعت طلب التمديد للشركة'); onDone();
  };

  return (
    <Modal title="اطلب تمديد" onClose={onClose}>
      <span className="muted small">موعد التسليم الحالي: <b>{fmtDateTime(currentEnd)}</b>. التمديد لازم ينطلب قبل التسليم بـ{minHoursBefore} ساعة على الأقل.</span>
      <div className="time-row">
        <Field label="يوم التسليم الجديد"><input className="input" type="date" value={day} min={isoDay(currentEnd)} onChange={(e) => setDay(e.target.value)} /></Field>
        <Field label="الساعة"><select className="input" value={t || ''} disabled={!slots.length} onChange={(e) => setTime(e.target.value)}>{slots.length ? slots.map((h) => <option key={h} value={h}>{h}</option>) : <option value="">—</option>}</select></Field>
      </div>
      {valid ? (
        <div className="alert small">{extraDaysText(extraDays)} · <b>{money(amount)}</b>. بتدفعها هلأ، وإذا الشركة رفضت أو ما ردّت بترجعلك كاملة.</div>
      ) : <div className="alert amber small">{slots.length ? 'الموعد الجديد لازم يكون بعد موعد التسليم الحالي.' : `الفرع مسكّر يوم ${dayName(day)}. اختار يوم ثاني للتسليم.`}</div>}
      <PayStep
        mode={mode}
        intentPath={`/rentals/${rental._id}/extensions/payment-intent`}
        intentBody={{ endDate: newEnd }}
        amount={amount}
        label={`ادفع ${money(amount)} وابعث الطلب`}
        disabled={!valid}
        submit={submit}
        onClose={onClose}
        cancelLabel="تراجع"
      />
    </Modal>
  );
}

// Renter pays the late-return fee the company recorded.
export function LateFeeModal({ rental, amount, onClose, onDone }) {
  const { setToast } = useAuth();
  const mode = usePaymentMode();
  const submit = async (payment) => {
    await api(`/rentals/${rental._id}/late-fee/pay`, { method: 'POST', body: payment });
    setToast('انْدفعت رسوم التأخير'); onDone();
  };
  return (
    <Modal title="ادفع رسوم التأخير" onClose={onClose}>
      <span className="muted small">رجّعت السيارة {fmtDateTime(rental.returnedAt)}، وموعد التسليم كان {fmtDateTime(rental.endDate)}. انحسب {daysWord(rental.lateDays)} تأخير.</span>
      <PayStep
        mode={mode}
        intentPath={`/rentals/${rental._id}/late-fee/payment-intent`}
        intentBody={{}}
        amount={amount}
        label={`ادفع ${money(amount)}`}
        submit={submit}
        onClose={onClose}
        cancelLabel="بعدين"
      />
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
