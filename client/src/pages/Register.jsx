import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { ErrorBox, Field, Logo } from '../components/ui.jsx';
import { CITIES, DOC_LABEL } from '../labels.js';

const DOCS = { renter: ['nationalId', 'drivingLicense'], company: ['commercialRegister', 'companyLicense'] };

export default function Register() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, login, setUser } = useAuth();
  const [step, setStep] = useState('info');
  const [role, setRole] = useState(params.get('role') === 'company' ? 'company' : 'renter');
  const [f, setF] = useState({ name: '', email: '', prefix: '+970', phone: '', password: '', password2: '', city: 'ramallah', dateOfBirth: '', gender: '' });
  const [company, setCompany] = useState({ address: '', companyPhone: '', description: '' });
  const [files, setFiles] = useState({});
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Resume an unfinished registration after login
  useEffect(() => {
    if (!user) return;
    setRole(user.role);
    if (!user.phoneVerified) setStep('phone');
    else if (!user.emailVerified) setStep('email');
    else if (['unverified', 'rejected'].includes(user.status)) setStep('docs');
    else setStep('done');
  }, [user?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = (fn) => async (e) => {
    e?.preventDefault();
    setBusy(true); setError('');
    try { await fn(); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const submitInfo = run(async () => {
    if (f.password !== f.password2) throw new Error('كلمتين المرور مش متطابقات');
    if (role === 'renter' && f.dateOfBirth && (Date.now() - new Date(f.dateOfBirth)) / (365.25 * 864e5) < 18) throw new Error('لازم يكون عمرك 18 سنة أو أكثر');
    const r = await api('/auth/register', {
      method: 'POST',
      body: { role, name: f.name, email: f.email, phone: `${f.prefix}${f.phone.replace(/^0/, '').replace(/\s/g, '')}`, password: f.password, city: f.city, dateOfBirth: f.dateOfBirth || undefined, gender: f.gender || undefined },
    });
    login(r.token, r.user); setDevCode(r.devCode || ''); setCode(''); setStep('phone');
  });
  const verifyPhone = run(async () => { const r = await api('/auth/verify-phone', { method: 'POST', body: { code } }); setUser(r.user); setDevCode(r.devCode || ''); setCode(''); setStep('email'); });
  const verifyEmail = run(async () => { const r = await api('/auth/verify-email', { method: 'POST', body: { code } }); setUser(r.user); setCode(''); setStep('docs'); });
  const resend = (channel) => run(async () => { const r = await api('/auth/resend-code', { method: 'POST', body: { channel } }); setDevCode(r.devCode || ''); })();
  const submitDocs = run(async () => {
    const fd = new FormData();
    DOCS[role].forEach((k) => files[k] && fd.append(k, files[k]));
    if (role === 'company') Object.entries(company).forEach(([k, v]) => fd.append(k, v));
    const r = await api('/auth/documents', { method: 'POST', form: fd });
    setUser(r.user); setStep('done');
  });

  const steps = ['info', 'phone', 'email', 'docs', 'done'];
  return (
    <main className="container" style={{ paddingBlock: 32, maxWidth: 620 }}>
      <div className="col" style={{ gap: 20 }}>
        <div className="row between"><Logo />{!user && <span>عندك حساب؟ <Link to="/login">سجّل دخولك</Link></span>}</div>
        <div className="steps">{['المعلومات', 'الجوال', 'الإيميل', 'الوثائق', 'المراجعة'].map((s, i) => <span key={s} className={steps.indexOf(step) === i ? 'on' : ''}>{s}</span>)}</div>
        <ErrorBox error={error} />
        {devCode && ['phone', 'email'].includes(step) && <div className="alert">وضع التطوير: الكود هو <b className="ltr">{devCode}</b></div>}

        {step === 'info' && (
          <form className="card col" onSubmit={submitInfo}>
            <h1 style={{ fontSize: 26 }}>أنشئ حسابك</h1>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              {[['renter', 'مستأجر', 'بدي أستأجر سيارات'], ['company', 'شركة تأجير', 'بدي أعرض سيارات شركتي']].map(([k, t, d]) => (
                <button type="button" key={k} className="card col" style={{ cursor: 'pointer', textAlign: 'start', borderColor: role === k ? 'var(--blue)' : undefined, boxShadow: role === k ? '0 0 0 3px var(--blue-soft)' : undefined, gap: 2 }} onClick={() => setRole(k)}>
                  <b>{t}</b><span className="muted small">{d}</span>
                </button>
              ))}
            </div>
            <Field label={role === 'company' ? 'اسم الشركة' : 'الاسم الكامل'}><input className="input" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
            <Field label="البريد الإلكتروني"><input className="input ltr" type="email" required autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
            <Field label="رقم الجوال">
              <div className="row ltr" style={{ flexWrap: 'nowrap' }}>
                <select className="input" style={{ width: 100 }} value={f.prefix} onChange={(e) => setF({ ...f, prefix: e.target.value })}><option>+970</option><option>+972</option></select>
                <input className="input" inputMode="tel" required placeholder="59X XXX XXX" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
              </div>
            </Field>
            <Field label="المدينة"><select className="input" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })}>{Object.entries(CITIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
            {role === 'renter' && (
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <Field label="تاريخ الميلاد"><input className="input" type="date" required value={f.dateOfBirth} onChange={(e) => setF({ ...f, dateOfBirth: e.target.value })} /></Field>
                <Field label="الجنس"><select className="input" required value={f.gender} onChange={(e) => setF({ ...f, gender: e.target.value })}><option value="">اختار</option><option value="male">ذكر</option><option value="female">أنثى</option></select></Field>
              </div>
            )}
            <Field label="كلمة المرور" hint="8 أحرف على الأقل. استخدم أرقام وحروف عشان تكون أقوى."><input className="input" type="password" required minLength={8} autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
            <Field label="تأكيد كلمة المرور"><input className="input" type="password" required autoComplete="new-password" value={f.password2} onChange={(e) => setF({ ...f, password2: e.target.value })} /></Field>
            <button className="btn" disabled={busy}>أنشئ الحساب</button>
          </form>
        )}

        {(step === 'phone' || step === 'email') && (
          <form className="card col" onSubmit={step === 'phone' ? verifyPhone : verifyEmail}>
            <h2>{step === 'phone' ? 'أكّد رقم جوالك' : 'أكّد إيميلك'}</h2>
            <p className="muted">بعتنالك كود من 6 أرقام على <b className="ltr">{step === 'phone' ? user?.phone : user?.email}</b>. الكود صالح لمدة 15 دقيقة.</p>
            <Field label="كود التحقق"><input className="input ltr" inputMode="numeric" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} style={{ letterSpacing: 8, fontSize: 20, textAlign: 'center' }} /></Field>
            <button className="btn" disabled={busy || code.length !== 6}>تأكيد</button>
            <button type="button" className="btn ghost" onClick={() => resend(step)}>أعد إرسال الكود</button>
          </form>
        )}

        {step === 'docs' && (
          <form className="card col" onSubmit={submitDocs}>
            <h2>{role === 'company' ? 'وثائق الشركة' : 'وثّق هويتك'}</h2>
            {user?.status === 'rejected' && <div className="alert red">انرفض التوثيق: {user.rejectionReason}</div>}
            <p className="muted small">وثائقك بتشوفها إدارة Redrive بس، عشان توثيق الحساب.</p>
            {DOCS[role].map((k) => (
              <Field key={k} label={DOC_LABEL[k]} hint="صورة أو PDF، لحد 5MB">
                <input className="input" style={{ paddingTop: 8 }} type="file" accept="image/*,application/pdf" required onChange={(e) => setFiles({ ...files, [k]: e.target.files[0] })} />
              </Field>
            ))}
            {role === 'company' && (
              <>
                <Field label="عنوان الشركة الرسمي"><input className="input" required value={company.address} onChange={(e) => setCompany({ ...company, address: e.target.value })} /></Field>
                <Field label="هاتف الشركة"><input className="input ltr" value={company.companyPhone} onChange={(e) => setCompany({ ...company, companyPhone: e.target.value })} /></Field>
                <Field label="نبذة عن الشركة"><textarea className="input" value={company.description} onChange={(e) => setCompany({ ...company, description: e.target.value })} /></Field>
              </>
            )}
            <button className="btn" disabled={busy}>أرسل للمراجعة</button>
          </form>
        )}

        {step === 'done' && (
          <div className="card col">
            <h2>حسابك جاهز، وقيد المراجعة</h2>
            <p className="muted">الإدارة بتراجع وثائقك عادة خلال يوم عمل، وبيوصلك إشعار وإيميل بالقرار. {role === 'renter' ? 'بتقدر تتصفح السيارات هلأ، والحجز بيصير متاح بعد التوثيق.' : 'بعد التوثيق بتقدر تضيف سياراتك.'}</p>
            <button type="button" className="btn" onClick={() => navigate(role === 'company' ? '/company' : '/search')}>{role === 'company' ? 'روح للوحة التحكم' : 'تصفّح السيارات'}</button>
          </div>
        )}
      </div>
    </main>
  );
}
