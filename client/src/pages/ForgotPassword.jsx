import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { ErrorBox, Field, Logo } from '../components/ui.jsx';

export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [pw, setPw] = useState({ a: '', b: '' });
  const [devCode, setDevCode] = useState('');
  const [error, setError] = useState('');

  const send = async (e) => {
    e.preventDefault(); setError('');
    try { const r = await api('/auth/forgot-password', { method: 'POST', body: { email } }); setDevCode(r.devCode || ''); setStep(2); } catch (err) { setError(err.message); }
  };
  const reset = async (e) => {
    e.preventDefault(); setError('');
    if (pw.a !== pw.b) return setError('كلمتين المرور مش متطابقات');
    try { await api('/auth/reset-password', { method: 'POST', body: { email, code, password: pw.a } }); setStep(3); } catch (err) { setError(err.message); }
  };

  return (
    <main className="container" style={{ paddingBlock: 32, maxWidth: 480 }}>
      <div className="col" style={{ gap: 20 }}>
        <Logo />
        <Link to="/login">‹ رجوع لتسجيل الدخول</Link>
        <ErrorBox error={error} />
        {step === 1 && (
          <form className="card col" onSubmit={send}>
            <h1 style={{ fontSize: 26 }}>نسيت كلمة المرور؟</h1>
            <p className="muted">اكتب إيميلك المسجّل، وبنبعتلك كود عشان تعمل كلمة مرور جديدة.</p>
            <Field label="البريد الإلكتروني"><input className="input ltr" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
            <button className="btn">ابعت الكود</button>
          </form>
        )}
        {step === 2 && (
          <form className="card col" onSubmit={reset}>
            <h2>اعمل كلمة مرور جديدة</h2>
            <p className="muted">إذا الإيميل مسجّل عنا، بعتنا كود على <b className="ltr">{email}</b>. الكود صالح لمدة 15 دقيقة.</p>
            {devCode && <div className="alert">وضع التطوير: الكود هو <b className="ltr">{devCode}</b></div>}
            <Field label="الكود"><input className="input ltr" inputMode="numeric" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value)} /></Field>
            <Field label="كلمة المرور الجديدة" hint="8 أحرف على الأقل."><input className="input" type="password" minLength={8} required value={pw.a} onChange={(e) => setPw({ ...pw, a: e.target.value })} /></Field>
            <Field label="أكّد كلمة المرور"><input className="input" type="password" required value={pw.b} onChange={(e) => setPw({ ...pw, b: e.target.value })} /></Field>
            <button className="btn">احفظ كلمة المرور</button>
          </form>
        )}
        {step === 3 && (
          <div className="card col">
            <h2>تغيّرت كلمة المرور</h2>
            <p className="muted">صار فيك تسجّل دخولك بكلمة المرور الجديدة.</p>
            <Link className="btn" to="/login">سجّل دخولك</Link>
          </div>
        )}
      </div>
    </main>
  );
}
