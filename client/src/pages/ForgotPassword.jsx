import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { ErrorBox, Field, Icon, Stepper } from '../components/ui.jsx';
import AuthShell from '../components/AuthShell.jsx';

const HEAD = {
  1: ['نسيت كلمة المرور؟', 'اكتب إيميلك المسجّل، وبنبعتلك كود عشان تعمل كلمة مرور جديدة.'],
  2: ['اعمل كلمة مرور جديدة', 'اكتب الكود اللي وصلك وكلمة المرور الجديدة.'],
  3: ['تغيّرت كلمة المرور', 'صار فيك تسجّل دخولك بكلمة المرور الجديدة.'],
};

export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [pw, setPw] = useState({ a: '', b: '' });
  const [devCode, setDevCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async (e) => {
    e.preventDefault(); setError(''); setBusy(true);
    try { const r = await api('/auth/forgot-password', { method: 'POST', body: { email } }); setDevCode(r.devCode || ''); setStep(2); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  const reset = async (e) => {
    e.preventDefault(); setError('');
    if (pw.a !== pw.b) return setError('كلمتين المرور مش متطابقات');
    setBusy(true);
    try { await api('/auth/reset-password', { method: 'POST', body: { email, code, password: pw.a } }); setStep(3); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const [title, sub] = HEAD[step];
  return (
    <AuthShell labelledBy="reset-title" title="رجّع حسابك بخطوتين" text="بنبعتلك كود على إيميلك المسجّل، وبتعمل كلمة مرور جديدة خلال دقيقة.">
      <div className="auth-head">
        <h1 id="reset-title">{title}</h1>
        <p>{sub}</p>
      </div>
      <Stepper steps={['الإيميل', 'كلمة مرور جديدة', 'تم']} current={step - 1} label="خطوات استرجاع الحساب" />
      <ErrorBox error={error} />

      {step === 1 && (
        <form className="col" style={{ gap: 16 }} onSubmit={send}>
          <Field label="البريد الإلكتروني"><input className="input ltr" type="email" autoComplete="email" placeholder="name@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <button type="submit" className="btn lg block" disabled={busy}>{busy ? 'عم نبعت…' : 'ابعت الكود'}</button>
        </form>
      )}
      {step === 2 && (
        <form className="col" style={{ gap: 16 }} onSubmit={reset}>
          <p className="muted">إذا الإيميل مسجّل عنا، بعتنا كود على <b className="ltr" style={{ color: 'var(--ink)' }}>{email}</b>. الكود صالح لمدة 15 دقيقة.</p>
          {devCode && <div className="dev-code"><Icon name="info" size={18} />وضع التجربة: الكود هو <b className="ltr">{devCode}</b></div>}
          <Field label="الكود"><input className="input ltr otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} /></Field>
          <div className="form-grid">
            <Field label="كلمة المرور الجديدة" hint="8 أحرف على الأقل."><input className="input" type="password" autoComplete="new-password" minLength={8} required value={pw.a} onChange={(e) => setPw({ ...pw, a: e.target.value })} /></Field>
            <Field label="أكّد كلمة المرور"><input className="input" type="password" autoComplete="new-password" required value={pw.b} onChange={(e) => setPw({ ...pw, b: e.target.value })} /></Field>
          </div>
          <button type="submit" className="btn lg block" disabled={busy}>{busy ? 'عم نحفظ…' : 'احفظ كلمة المرور'}</button>
        </form>
      )}
      {step === 3 && (
        <div className="col" style={{ gap: 16, alignItems: 'flex-start' }}>
          <span className="done-mark"><Icon name="check" size={30} /></span>
          <Link className="btn lg block" to="/login">سجّل دخولك</Link>
        </div>
      )}

      <div className="auth-alt">
        <p>تذكّرت كلمة المرور؟ <Link to="/login">رجوع لتسجيل الدخول</Link></p>
      </div>
    </AuthShell>
  );
}
