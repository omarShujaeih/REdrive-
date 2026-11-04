import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { ErrorBox, Field, Logo } from '../components/ui.jsx';

export function homeFor(user) {
  if (user.role === 'admin') return '/admin';
  if (user.role === 'company') return '/company';
  return '/search';
}

export default function Login() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [mode, setMode] = useState('email');
  const [identifier, setIdentifier] = useState('');
  const [prefix, setPrefix] = useState('+970');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const id = mode === 'email' ? identifier.trim() : `${prefix}${identifier.replace(/^0/, '').replace(/\s/g, '')}`;
      const { token, user } = await api('/auth/login', { method: 'POST', body: { identifier: id, password, remember } });
      login(token, user);
      if (user.status === 'unverified') return navigate('/register?resume=1');
      navigate(params.get('next') || homeFor(user));
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <main className="container" style={{ paddingBlock: 32, maxWidth: 480 }}>
      <div className="col" style={{ gap: 20 }}>
        <Logo />
        <div className="col" style={{ gap: 4 }}><h1>أهلاً فيك من جديد</h1><span className="muted">سجّل دخولك عشان تكمل حجزك وتتابع طلباتك.</span></div>
        <form className="card col" onSubmit={submit}>
          <div className="chips">
            <button type="button" className={`chip ${mode === 'email' ? 'on' : ''}`} onClick={() => setMode('email')}>البريد الإلكتروني</button>
            <button type="button" className={`chip ${mode === 'phone' ? 'on' : ''}`} onClick={() => setMode('phone')}>رقم الجوال</button>
          </div>
          <ErrorBox error={error} />
          {mode === 'email' ? (
            <Field label="البريد الإلكتروني"><input className="input ltr" type="email" autoComplete="email" required value={identifier} onChange={(e) => setIdentifier(e.target.value)} /></Field>
          ) : (
            <Field label="رقم الجوال">
              <div className="row ltr" style={{ flexWrap: 'nowrap' }}>
                <select className="input" style={{ width: 100 }} value={prefix} onChange={(e) => setPrefix(e.target.value)}><option>+970</option><option>+972</option></select>
                <input className="input" inputMode="tel" required value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="59X XXX XXX" />
              </div>
            </Field>
          )}
          <Field label="كلمة المرور"><input className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          <div className="row between">
            <label className="row" style={{ gap: 6 }}><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />تذكّرني على هاد الجهاز</label>
            <Link to="/forgot-password">نسيت كلمة المرور؟</Link>
          </div>
          <button className="btn" disabled={busy}>تسجيل الدخول</button>
        </form>
        <div className="card soft col" style={{ gap: 6 }}>
          <span>ما عندك حساب؟ <Link to="/register?role=renter">أنشئ حساب مستأجر</Link></span>
          <span>عندك شركة تأجير مرخّصة؟ <Link to="/register?role=company">سجّل شركتك</Link></span>
        </div>
      </div>
    </main>
  );
}
