import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { ErrorBox, Field, Loading, useLoad } from '../components/ui.jsx';
import StripePay from '../components/StripePay.jsx';
import { TermsModal, usePolicies } from '../components/Policies.jsx';
import { FUEL, TRANSMISSION, carName, countDays, daysWord, fmtDateTime, money, parseStamp } from '../labels.js';

export default function Checkout() {
  const { carId } = useParams();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const policies = usePolicies();
  const [showTerms, setShowTerms] = useState(false);
  const start = parseStamp(params.get('start')); const end = parseStamp(params.get('end'));
  const { data, loading, error } = useLoad(() => Promise.all([api(`/cars/${carId}`), api('/rentals/payment-mode')]).then(([c, m]) => ({ ...c, mode: m.mode })), [carId]);
  const [step, setStep] = useState(1);
  const [agree, setAgree] = useState(false);
  const [card, setCard] = useState({ number: '', name: '', exp: '', cvv: '' });
  const [errs, setErrs] = useState({});
  const [payError, setPayError] = useState('');
  const [busy, setBusy] = useState(false);
  const [rental, setRental] = useState(null);

  if (loading) return <Loading />;
  if (error) return <main className="container"><ErrorBox error={error} /></main>;
  const { car } = data;
  const days = countDays(start, end);
  const total = days * car.dailyPrice;
  const verified = user.status === 'verified';

  const pay = async (e) => {
    e.preventDefault();
    const n = card.number.replace(/\s/g, '');
    const v = {
      number: /^\d{13,19}$/.test(n) ? '' : 'رقم البطاقة غير صحيح',
      name: card.name.trim() ? '' : 'اكتب الاسم على البطاقة',
      exp: /^(0[1-9]|1[0-2])\/\d{2}$/.test(card.exp) ? '' : 'بصيغة MM/YY',
      cvv: /^\d{3,4}$/.test(card.cvv) ? '' : '3 أو 4 أرقام',
    };
    setErrs(v);
    if (Object.values(v).some(Boolean)) return;
    setBusy(true); setPayError('');
    try {
      const r = await api('/rentals', { method: 'POST', body: { carId, startDate: start, endDate: end, acceptTerms: agree, card: { number: n } } });
      setRental(r.rental); setStep(3);
    } catch (err) {
      setPayError(err.status === 402 ? 'البنك رفض العملية، فما انخصم منك إشي وما انبعت طلب الحجز. تأكد من بيانات البطاقة وجرّب مرة ثانية.' : err.message);
    } finally { setBusy(false); }
  };

  return (
    <main className="container col" style={{ gap: 20 }}>
      <div className="steps">{['مراجعة الطلب', 'الدفع', 'تم الإرسال'].map((s, i) => <span key={s} className={step === i + 1 ? 'on' : ''}>{i + 1}. {s}</span>)}</div>
      <div className="split">
        <div className="col">
          {step === 1 && (
            <div className="card col">
              <h2>راجع طلب الحجز</h2>
              {!verified && <div className="alert amber">حسابك لسا مش موثّق. بتقدر تطلب الحجز بس لما الإدارة توثّق هويتك ورخصة السواقة.</div>}
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div><span className="muted small">الاستلام</span><div className="bold">{fmtDateTime(start)}</div></div>
                <div><span className="muted small">التسليم</span><div className="bold">{fmtDateTime(end)}</div></div>
                <div><span className="muted small">المكان</span><div className="bold">{car.pickupLocation?.address}</div></div>
                <div><span className="muted small">المدة</span><div className="bold">{daysWord(days)}</div></div>
              </div>
              <div className="alert small">
                الاستلام والتسليم بالساعة اللي اخترتها. في ساعة سماح بالتسليم، وبعدها كل 24 ساعة تأخير بتنحسب يوم كامل.
                وبتقدر تطلب تمديد بعد الاستلام، قبل موعد التسليم بـ{policies.extensionMinHoursBefore} ساعة على الأقل.
              </div>
              <button type="button" className="btn" disabled={!verified} onClick={() => (agree ? setStep(2) : setShowTerms(true))}>كمّل للدفع</button>
              <span className="muted small">قبل الدفع بتقرأ <Link to="/terms" target="_blank" rel="noreferrer">الشروط والسياسات</Link> وبتوافق عليها.</span>
            </div>
          )}
          {showTerms && <TermsModal onClose={() => setShowTerms(false)} onAccept={() => { setAgree(true); setShowTerms(false); setStep(2); }} />}
          {step === 2 && (
            data.mode === 'stripe' ? (
              <div className="card col">
                <h2>الدفع</h2>
                <p className="muted">بتدفع المبلغ كامل هلأ، وبيضل محجوز لحد ما الشركة توافق. إذا رفضت، بيرجعلك كامل.</p>
                <StripePay booking={{ carId, startDate: start, endDate: end, acceptTerms: agree }} total={total} onPaid={(r) => { setRental(r); setStep(3); }} />
                <button type="button" className="btn ghost" onClick={() => setStep(1)}>رجوع لمراجعة الطلب</button>
              </div>
            ) : (
            <form className="card col" onSubmit={pay} noValidate>
              <h2>الدفع</h2>
              <p className="muted">بتدفع المبلغ كامل هلأ، وبيضل محجوز عند بوابة الدفع لحد ما الشركة توافق. إذا رفضت، بيرجعلك كامل.</p>
              <ErrorBox error={payError} />
              <Field label="رقم البطاقة" error={errs.number}><input className="input ltr" inputMode="numeric" autoComplete="cc-number" value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value })} placeholder="4242 4242 4242 4242" /></Field>
              <Field label="الاسم على البطاقة" error={errs.name}><input className="input" autoComplete="cc-name" value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} /></Field>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <Field label="تاريخ الانتهاء" error={errs.exp}><input className="input ltr" autoComplete="cc-exp" placeholder="MM/YY" value={card.exp} onChange={(e) => setCard({ ...card, exp: e.target.value })} /></Field>
                <Field label="رمز الأمان (CVV)" error={errs.cvv}><input className="input ltr" inputMode="numeric" autoComplete="cc-csc" value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value })} /></Field>
              </div>
              <span className="muted small">وضع التجربة (Sandbox): استعمل أي رقم تجريبي مثل 4242 4242 4242 4242. الرقم اللي بيخلص بـ 0002 بيترفض.</span>
              <button className="btn" disabled={busy}>{busy ? 'عم نتأكد من الدفع…' : `ادفع ${money(total)}`}</button>
              <button type="button" className="btn ghost" onClick={() => setStep(1)}>رجوع لمراجعة الطلب</button>
            </form>
            )
          )}
          {step === 3 && rental && (
            <div className="card col">
              <h2>انبعت طلب الحجز ✓</h2>
              <p>الدفع تم، وطلبك وصل لـ{car.company.name}. رح يوصلك إشعار وإيميل أول ما الشركة ترد.</p>
              <div className="row"><span className="muted">رقم الحجز</span><b className="ltr">{rental.code}</b><span className="badge amber">قيد الانتظار</span></div>
              <ol className="timeline">
                <li><span className="b on">1</span><div><b>الدفع تم</b><div className="muted small">{money(total)} محجوزين عند بوابة الدفع لحد ما الشركة توافق.</div></div></li>
                <li><span className="b">2</span><div><b>بانتظار موافقة الشركة</b><div className="muted small">إذا ما ردّت خلال 12 ساعة، الطلب بينرفض تلقائياً وبيرجعلك المبلغ كامل. وبعد ما توافق، عندك 6 ساعات تلغي فيهم مجاناً.</div></div></li>
                <li><span className="b">3</span><div><b>استلام السيارة</b><div className="muted small">{fmtDateTime(start)} · خد هويتك ورخصتك معك، وبتوقّع عقد الإيجار عند الشركة.</div></div></li>
              </ol>
              <div className="row"><Link className="btn" to={`/rentals/${rental._id}`}>تابع الحجز</Link><Link className="btn secondary" to="/">رجوع للرئيسية</Link></div>
            </div>
          )}
        </div>
        <aside className="card col sticky">
          <h3>ملخص الحجز</h3>
          <b>{carName(car)}</b>
          <span className="muted small">{TRANSMISSION[car.transmission]} · {FUEL[car.fuel]} · {car.seats} مقاعد</span>
          <span className="small">{car.company.name}</span>
          <div className="row between"><span>{money(car.dailyPrice)} × {daysWord(days)}</span><span>{money(total)}</span></div>
          <div className="row between bold" style={{ borderTop: '1px solid var(--line)', paddingTop: 10 }}><span>المجموع</span><span>{money(total)}</span></div>
          <span className="muted small">إلغاء مجاني قبل موافقة الشركة، ولأول {policies.freeCancelHoursAfterAccept} ساعات بعد الموافقة. بعدها بينخصم {Math.round(policies.lateCancelChargeRate * 100)}% ({money(total * policies.lateCancelChargeRate)}) وبيرجعلك {money(total * (1 - policies.lateCancelChargeRate))}.</span>
          <span className="muted small">التأخير بالتسليم بعد ساعة السماح: {money(car.dailyPrice)} عن كل 24 ساعة أو جزء منها.</span>
        </aside>
      </div>
    </main>
  );
}
