import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { ErrorBox, Field, Icon, Stepper } from '../components/ui.jsx';
import AuthShell from '../components/AuthShell.jsx';
import { CITIES, DOC_LABEL } from '../labels.js';

const DOCS = { renter: ['nationalId', 'drivingLicense'], company: ['commercialRegister', 'companyLicense'] };
const STEPS = ['info', 'phone', 'email', 'docs', 'done'];
const STEP_LABELS = ['المعلومات', 'الجوال', 'الإيميل', 'الوثائق', 'المراجعة'];
const HEAD = {
  info: ['أنشئ حسابك', 'دقيقتين وبتكون جاهز. بعدها بنأكد جوالك وإيميلك وبنراجع وثائقك.'],
  phone: ['أكّد رقم جوالك', 'بعتنالك كود من 6 أرقام برسالة نصية.'],
  email: ['أكّد إيميلك', 'بعتنالك كود من 6 أرقام على الإيميل.'],
  docs: ['ارفع وثائقك', 'وثائقك بتشوفها إدارة Redrive بس، عشان توثيق الحساب.'],
  done: ['حسابك جاهز، وقيد المراجعة', 'الإدارة بتراجع وثائقك عادة خلال يوم عمل، وبيوصلك إشعار وإيميل بالقرار.'],
};

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
  const [notice, setNotice] = useState('');
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
    setBusy(true); setError(''); setNotice('');
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
  const resend = (channel) => run(async () => {
    const r = await api('/auth/resend-code', { method: 'POST', body: { channel } });
    setDevCode(r.devCode || '');
    setNotice(channel === 'phone' ? 'بعتنالك كود جديد على جوالك.' : 'بعتنالك كود جديد على إيميلك.');
  })();
  const submitDocs = run(async () => {
    const fd = new FormData();
    DOCS[role].forEach((k) => files[k] && fd.append(k, files[k]));
    if (role === 'company') Object.entries(company).forEach(([k, v]) => fd.append(k, v));
    const r = await api('/auth/documents', { method: 'POST', form: fd });
    setUser(r.user); setStep('done');
  });

  const current = STEPS.indexOf(step);
  const [title, sub] = HEAD[step];
  const isCompany = role === 'company';

  return (
    <AuthShell
      labelledBy="register-title"
      wide
      title={isCompany ? 'اعرض سيارات شركتك على Redrive' : 'انضم لـ Redrive'}
      text={isCompany
        ? 'زبائن موثّقين بالهوية ورخصة السواقة، وطلبات حجز مدفوعة سلفاً. إنت بتوافق أو بترفض.'
        : 'وثّق حسابك مرة وحدة، واحجز من أي شركة موثّقة بكل فلسطين.'}
      extra={(
        <ol className="auth-steps" aria-hidden="true">
          {STEP_LABELS.map((s, i) => (
            <li key={s} className={i < current ? 'done' : i === current ? 'on' : ''}>
              <span className="n">{i < current ? <Icon name="check" size={15} /> : i + 1}</span>{s}
            </li>
          ))}
        </ol>
      )}
    >
      <div className="auth-head">
        <h1 id="register-title">{title}</h1>
        <p>{sub}</p>
      </div>
      <Stepper steps={STEP_LABELS} current={current} label="خطوات التسجيل" compact />

      <ErrorBox error={error} />
      {notice && <div className="alert green" role="status">{notice}</div>}
      {devCode && ['phone', 'email'].includes(step) && (
        <div className="dev-code"><Icon name="info" size={18} />وضع التجربة: الكود هو <b className="ltr">{devCode}</b></div>
      )}

      {step === 'info' && (
        <form className="col" style={{ gap: 16 }} onSubmit={submitInfo}>
          <div className="role-pick" role="group" aria-label="نوع الحساب">
            {[['renter', 'user', 'مستأجر', 'بدي أستأجر سيارات'], ['company', 'building', 'شركة تأجير', 'بدي أعرض سيارات شركتي']].map(([k, icon, t, d]) => (
              <button type="button" key={k} className="role-opt" aria-pressed={role === k} onClick={() => setRole(k)}>
                <span className={`ic-tile ${role === k ? '' : 'soft'}`}><Icon name={icon} size={18} /></span>
                <span><b>{t}</b><small>{d}</small></span>
              </button>
            ))}
          </div>
          <Field label={isCompany ? 'اسم الشركة' : 'الاسم الكامل'}><input className="input" required autoComplete={isCompany ? 'organization' : 'name'} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="البريد الإلكتروني"><input className="input ltr" type="email" required autoComplete="email" placeholder="name@example.com" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label="رقم الجوال">
            <div className="phone-row">
              <select className="input" value={f.prefix} onChange={(e) => setF({ ...f, prefix: e.target.value })} aria-label="مقدمة الدولة"><option>+970</option><option>+972</option></select>
              <input className="input" inputMode="tel" autoComplete="tel-national" required placeholder="59X XXX XXX" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} aria-label="رقم الجوال" />
            </div>
          </Field>
          <Field label="المدينة"><select className="input" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })}>{Object.entries(CITIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          {!isCompany && (
            <div className="form-grid">
              <Field label="تاريخ الميلاد"><input className="input" type="date" required value={f.dateOfBirth} onChange={(e) => setF({ ...f, dateOfBirth: e.target.value })} /></Field>
              <Field label="الجنس"><select className="input" required value={f.gender} onChange={(e) => setF({ ...f, gender: e.target.value })}><option value="">اختار</option><option value="male">ذكر</option><option value="female">أنثى</option></select></Field>
            </div>
          )}
          <div className="form-grid">
            <Field label="كلمة المرور" hint="8 أحرف على الأقل، أرقام وحروف."><input className="input" type="password" required minLength={8} autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
            <Field label="تأكيد كلمة المرور"><input className="input" type="password" required autoComplete="new-password" value={f.password2} onChange={(e) => setF({ ...f, password2: e.target.value })} /></Field>
          </div>
          <span className="muted small">لما تنشئ الحساب بتكون موافق على <Link to="/terms" target="_blank" rel="noreferrer">الشروط والسياسات</Link>.</span>
          <button type="submit" className="btn lg block" disabled={busy}>{busy ? 'عم ننشئ حسابك…' : 'أنشئ الحساب'}</button>
        </form>
      )}

      {(step === 'phone' || step === 'email') && (
        <form className="col" style={{ gap: 16 }} onSubmit={step === 'phone' ? verifyPhone : verifyEmail}>
          <p className="muted">الكود انبعت على <b className="ltr" style={{ color: 'var(--ink)' }}>{step === 'phone' ? user?.phone : user?.email}</b>، وصالح لمدة 15 دقيقة.</p>
          <Field label="كود التحقق"><input className="input ltr otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} /></Field>
          <button type="submit" className="btn lg block" disabled={busy || code.length !== 6}>{busy ? 'عم نتأكد…' : 'تأكيد'}</button>
          <button type="button" className="btn ghost" disabled={busy} onClick={() => resend(step)}>ما وصلني، ابعت كود جديد</button>
        </form>
      )}

      {step === 'docs' && (
        <form className="col" style={{ gap: 16 }} onSubmit={submitDocs}>
          {user?.status === 'rejected' && <div className="alert red">انرفض التوثيق: {user.rejectionReason}. ارفع الوثائق من جديد.</div>}
          {DOCS[role].map((k) => (
            <div className="field" key={k}>
              <span className="bold">{DOC_LABEL[k]}</span>
              <label className={`file-drop${files[k] ? ' has' : ''}`}>
                <input type="file" accept="image/*,application/pdf" required onChange={(e) => setFiles({ ...files, [k]: e.target.files[0] })} aria-label={DOC_LABEL[k]} />
                <span className={`ic-tile sm ${files[k] ? '' : 'soft'}`}><Icon name={files[k] ? 'check' : 'upload'} size={16} /></span>
                <span className="fd-text"><b>{files[k]?.name || 'اختار ملف'}</b><small>صورة أو PDF، لحد 5MB</small></span>
              </label>
            </div>
          ))}
          {isCompany && (
            <>
              <Field label="عنوان الشركة الرسمي"><input className="input" required autoComplete="street-address" value={company.address} onChange={(e) => setCompany({ ...company, address: e.target.value })} /></Field>
              <Field label="هاتف الشركة"><input className="input ltr" inputMode="tel" value={company.companyPhone} onChange={(e) => setCompany({ ...company, companyPhone: e.target.value })} /></Field>
              <Field label="نبذة عن الشركة"><textarea className="input" value={company.description} onChange={(e) => setCompany({ ...company, description: e.target.value })} /></Field>
            </>
          )}
          <button type="submit" className="btn lg block" disabled={busy}>{busy ? 'عم نرفع الوثائق…' : 'أرسل للمراجعة'}</button>
        </form>
      )}

      {step === 'done' && (
        <div className="col" style={{ gap: 16, alignItems: 'flex-start' }}>
          <span className="done-mark"><Icon name="check" size={30} /></span>
          <p className="muted">{isCompany ? 'بعد التوثيق بتقدر تضيف سياراتك وتستقبل طلبات الحجز.' : 'بتقدر تتصفح السيارات هلأ، والحجز بيصير متاح بعد التوثيق.'}</p>
          <button type="button" className="btn lg block" onClick={() => navigate(isCompany ? '/company' : '/search')}>{isCompany ? 'روح للوحة التحكم' : 'تصفّح السيارات'}</button>
        </div>
      )}

      {!user && (
        <div className="auth-alt">
          <p>عندك حساب؟ <Link to="/login">سجّل دخولك</Link></p>
        </div>
      )}
    </AuthShell>
  );
}
