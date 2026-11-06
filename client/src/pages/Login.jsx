import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { ErrorBox, Field, Icon, Logo } from '../components/ui.jsx';
import loginPhoto from '../assets/login-suv.webp';

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
  const [showPassword, setShowPassword] = useState(false);
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

  const switchMode = (m) => { setMode(m); setIdentifier(''); setError(''); };

  return (
    <div className="auth-page">
      <header className="container auth-top">
        <Link to="/assistant" className="nav-link"><Icon name="sparkle" color="var(--blue)" />اسأل Redrive</Link>
        <Logo />
      </header>

      <main className="container auth-main">
        <section className="auth-form" aria-labelledby="login-title">
          <div className="auth-head">
            <h1 id="login-title">أهلاً فيك من جديد</h1>
            <p>سجّل دخولك عشان تكمل حجزك وتتابع طلباتك.</p>
          </div>

          <form className="col" style={{ gap: 18 }} onSubmit={submit}>
            <div className="segmented" role="tablist" aria-label="طريقة الدخول">
              <button type="button" role="tab" aria-selected={mode === 'email'} onClick={() => switchMode('email')}><Icon name="mail" size={18} />البريد الإلكتروني</button>
              <button type="button" role="tab" aria-selected={mode === 'phone'} onClick={() => switchMode('phone')}><Icon name="phone" size={18} />رقم الجوال</button>
            </div>

            <ErrorBox error={error} />

            {mode === 'email' ? (
              <Field label="البريد الإلكتروني">
                <input className="input ltr" type="email" autoComplete="email" placeholder="name@example.com" required value={identifier} onChange={(e) => setIdentifier(e.target.value)} aria-invalid={!!error} />
              </Field>
            ) : (
              <Field label="رقم الجوال">
                <div className="row ltr" style={{ flexWrap: 'nowrap', gap: 8 }}>
                  <select className="input" style={{ width: 110 }} value={prefix} onChange={(e) => setPrefix(e.target.value)} aria-label="مقدمة الدولة"><option>+970</option><option>+972</option></select>
                  <input className="input" inputMode="tel" autoComplete="tel-national" required value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="59X XXX XXX" aria-invalid={!!error} />
                </div>
              </Field>
            )}

            <div className="field">
              <div className="row between" style={{ gap: 8 }}>
                <label htmlFor="password">كلمة المرور</label>
                <Link to="/forgot-password" className="small">نسيت كلمة المرور؟</Link>
              </div>
              <div className="input-wrap">
                <input id="password" className="input" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!error} />
                <button type="button" className="input-icon" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'خبّي كلمة المرور' : 'اعرض كلمة المرور'} aria-pressed={showPassword}>
                  <Icon name={showPassword ? 'eyeOff' : 'eye'} />
                </button>
              </div>
            </div>

            <label className="check">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              <span>تذكّرني على هاد الجهاز</span>
            </label>

            <button className="btn lg block" disabled={busy}>{busy ? 'عم نسجّل دخولك…' : 'تسجيل الدخول'}</button>
          </form>

          <div className="auth-alt">
            <p>ما عندك حساب؟ <Link to="/register?role=renter">أنشئ حساب مستأجر</Link></p>
            <p>عندك شركة تأجير مرخّصة؟ <Link to="/register?role=company">سجّل شركتك</Link></p>
          </div>
        </section>

        <aside className="auth-visual" aria-label="عن Redrive">
          <div className="auth-visual-copy">
            <span className="eyebrow"><i aria-hidden="true" />Redrive</span>
            <h2>المنصة الفلسطينية لتأجير السيارات</h2>
            <p>سيارات من شركات مرخّصة في رام الله، نابلس، الخليل، بيت لحم وجنين. احجز بالتواريخ اللي بتناسبك وادفع أونلاين.</p>
            <ul className="hero-proof">
              {[['shield', 'شركات مرخّصة'], ['card', 'دفع آمن أونلاين'], ['star', 'تقييمات من الطرفين']].map(([icon, t]) => (
                <li key={t}><span className="proof-icon"><Icon name={icon} size={20} color="var(--blue)" /></span><b>{t}</b></li>
              ))}
            </ul>
          </div>
          <img src={loginPhoto} alt="سيارة SUV بيضاء واقفة على طرف الطريق" />
        </aside>
      </main>

      <footer className="container auth-foot">
        <span>© 2026 Redrive · المنصة الفلسطينية لتأجير السيارات</span>
        <span className="row" style={{ gap: 16 }}><Link to="/assistant">تواصل معنا</Link></span>
      </footer>
    </div>
  );
}
