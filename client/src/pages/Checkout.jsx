import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { CarImage, ErrorBox, Field, Icon, Loading, PageHead, Stepper, useLoad } from '../components/ui.jsx';
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

  if (loading) return <Loading lines={4} />;
  if (error) return <main className="container page-body"><ErrorBox error={error} /></main>;
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

  const head = step === 3
    ? ['انبعت طلب الحجز', `طلبك وصل لـ${car.company.name}. رح يوصلك إشعار وإيميل أول ما الشركة ترد.`]
    : ['راجع حجزك وادفع', 'تأكد من التفاصيل، وافق على الشروط، وادفع أونلاين بأمان.'];

  return (
    <main>
      <div className="page-band">
        <div className="container">
          <PageHead crumbs={[['/', 'الرئيسية'], [`/cars/${car._id}`, `${car.brand} ${car.model}`], [null, 'إتمام الحجز']]} kicker="إتمام الحجز" title={head[0]} sub={head[1]} />
          <div className="band-stepper"><Stepper steps={['مراجعة الطلب', 'الدفع', 'تم الإرسال']} current={step - 1} label="خطوات الحجز" /></div>
        </div>
      </div>

      <div className="container page-body">
        <div className="split">
          <div className="col" style={{ gap: 20 }}>
            {step === 1 && (
              <section className="panel" aria-labelledby="trip-title">
                <h2 id="trip-title">تفاصيل الرحلة</h2>
                {!verified && <div className="alert amber">حسابك لسا مش موثّق. بتقدر تطلب الحجز بس لما الإدارة توثّق هويتك ورخصة السواقة.</div>}
                <div className="info-grid">
                  <div className="info-tile"><Icon name="calendar" /><div><span>الاستلام</span><b>{fmtDateTime(start)}</b></div></div>
                  <div className="info-tile"><Icon name="calendar" /><div><span>التسليم</span><b>{fmtDateTime(end)}</b></div></div>
                  <div className="info-tile"><Icon name="pin" /><div><span>المكان</span><b>{car.pickupLocation?.address}</b></div></div>
                  <div className="info-tile"><Icon name="clock" /><div><span>المدة</span><b>{daysWord(days)}</b></div></div>
                </div>
                <div className="alert small">
                  الاستلام والتسليم بالساعة اللي اخترتها. في ساعة سماح بالتسليم، وبعدها كل 24 ساعة تأخير بتنحسب يوم كامل.
                  وبتقدر تطلب تمديد بعد الاستلام، قبل موعد التسليم بـ{policies.extensionMinHoursBefore} ساعة على الأقل.
                </div>
                <button type="button" className="btn lg block" disabled={!verified} onClick={() => (agree ? setStep(2) : setShowTerms(true))}>كمّل للدفع</button>
                <span className="muted small">قبل الدفع بتقرأ <Link to="/terms" target="_blank" rel="noreferrer">الشروط والسياسات</Link> وبتوافق عليها.</span>
              </section>
            )}
            {showTerms && <TermsModal onClose={() => setShowTerms(false)} onAccept={() => { setAgree(true); setShowTerms(false); setStep(2); }} />}

            {step === 2 && (
              <section className="panel" aria-labelledby="pay-title">
                <div className="panel-head">
                  <h2 id="pay-title">الدفع</h2>
                  <span className="secure"><Icon name="lock" size={16} />دفع آمن ومشفّر</span>
                </div>
                <p className="muted">بتدفع {money(total)} هلأ، وبيضلوا محجوزين عند بوابة الدفع لحد ما الشركة توافق. إذا رفضت أو ما ردّت، بيرجعولك كاملين.</p>
                {data.mode === 'stripe' ? (
                  <StripePay booking={{ carId, startDate: start, endDate: end, acceptTerms: agree }} total={total} onPaid={(r) => { setRental(r); setStep(3); }} />
                ) : (
                  <form className="col" style={{ gap: 14 }} onSubmit={pay} noValidate>
                    <ErrorBox error={payError} />
                    <Field label="رقم البطاقة" error={errs.number}><input className="input ltr" inputMode="numeric" autoComplete="cc-number" value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value })} placeholder="4242 4242 4242 4242" /></Field>
                    <Field label="الاسم على البطاقة" error={errs.name}><input className="input" autoComplete="cc-name" value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} /></Field>
                    <div className="form-grid">
                      <Field label="تاريخ الانتهاء" error={errs.exp}><input className="input ltr" autoComplete="cc-exp" placeholder="MM/YY" value={card.exp} onChange={(e) => setCard({ ...card, exp: e.target.value })} /></Field>
                      <Field label="رمز الأمان (CVV)" error={errs.cvv}><input className="input ltr" inputMode="numeric" autoComplete="cc-csc" value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value })} /></Field>
                    </div>
                    <span className="muted small">وضع التجربة: استعمل أي رقم تجريبي مثل 4242 4242 4242 4242. الرقم اللي بيخلص بـ 0002 بيترفض.</span>
                    <button type="submit" className="btn lg block" disabled={busy}>{busy ? 'عم نتأكد من الدفع…' : `ادفع ${money(total)}`}</button>
                  </form>
                )}
                <button type="button" className="btn ghost" onClick={() => setStep(1)}>رجوع لمراجعة الطلب</button>
              </section>
            )}

            {step === 3 && rental && (
              <section className="panel" aria-labelledby="sent-title">
                <div className="success-head">
                  <span className="done-mark"><Icon name="check" size={30} /></span>
                  <h2 id="sent-title">الدفع تم، وطلبك عند الشركة</h2>
                  <span className="code-pill"><span className="muted small">رقم الحجز</span><span className="ltr">{rental.code}</span><span className="badge status amber">قيد الانتظار</span></span>
                </div>
                <ol className="timeline">
                  <li className="done"><span className="b on"><Icon name="check" size={16} /></span><div><b>الدفع تم</b><div className="muted small">{money(total)} محجوزين عند بوابة الدفع لحد ما الشركة توافق.</div></div></li>
                  <li><span className="b">2</span><div><b>بانتظار موافقة الشركة</b><div className="muted small">إذا ما ردّت خلال 12 ساعة، الطلب بينرفض تلقائياً وبيرجعلك المبلغ كامل. وبعد ما توافق، عندك 6 ساعات تلغي فيهم مجاناً.</div></div></li>
                  <li><span className="b">3</span><div><b>استلام السيارة</b><div className="muted small">{fmtDateTime(start)} · خد هويتك ورخصتك معك، وبتوقّع عقد الإيجار عند الشركة.</div></div></li>
                </ol>
                <div className="row"><Link className="btn" to={`/rentals/${rental._id}`}>تابع الحجز</Link><Link className="btn secondary" to="/search">تصفّح سيارات ثانية</Link></div>
              </section>
            )}
          </div>

          <aside className="panel stick" aria-labelledby="summary-title">
            <h2 id="summary-title" style={{ fontSize: 'var(--fs-4)' }}>ملخص الحجز</h2>
            <div className="summary-car">
              <div className="thumb"><CarImage car={car} alt="" /></div>
              <div className="col" style={{ gap: 2, minWidth: 0 }}>
                <b>{carName(car)}</b>
                <span className="muted small">{TRANSMISSION[car.transmission]} · {FUEL[car.fuel]} · {car.seats} مقاعد</span>
                <span className="small"><span className="verified"><Icon name="shield" size={14} />{car.company.name}</span></span>
              </div>
            </div>
            <div className="sum-line"><span>{money(car.dailyPrice)} × {daysWord(days)}</span><span>{money(total)}</span></div>
            <div className="sum-total"><span>المجموع</span><span>{money(total)}</span></div>
            <ul className="note-list">
              <li><Icon name="info" size={16} /><span>إلغاء مجاني قبل موافقة الشركة، ولأول {policies.freeCancelHoursAfterAccept} ساعات بعد الموافقة. بعدها بينخصم {Math.round(policies.lateCancelChargeRate * 100)}% ({money(total * policies.lateCancelChargeRate)}) وبيرجعلك {money(total * (1 - policies.lateCancelChargeRate))}.</span></li>
              <li><Icon name="clock" size={16} /><span>التأخير بالتسليم بعد ساعة السماح: {money(car.dailyPrice)} عن كل 24 ساعة أو جزء منها.</span></li>
            </ul>
          </aside>
        </div>
      </div>
    </main>
  );
}
