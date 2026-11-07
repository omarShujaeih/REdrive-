import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { ErrorBox, Field, Icon, StatusBadge } from '../components/ui.jsx';
import { CITIES, ROLE, USER_STATUS, companyHours, initial } from '../labels.js';
import { HoursEditor } from '../components/Hours.jsx';
import LocationField, { locationError } from '../components/LocationField.jsx';

export default function Profile() {
  const { user, setUser, setToast } = useAuth();
  const isCompany = user.role === 'company';
  const loc = user.company?.location || {};
  const [f, setF] = useState({
    name: user.name, city: user.city || '', description: user.company?.description || '', companyPhone: user.company?.phone || '',
    ...(isCompany && { hours: companyHours(user), address: user.company?.address || '', lat: loc.lat ?? '', lng: loc.lng ?? '' }),
  });
  const [pw, setPw] = useState({ current: '', next: '' });
  const [error, setError] = useState('');

  const save = async (e) => {
    e.preventDefault(); setError('');
    if (isCompany && locationError(f)) { setError(locationError(f)); return; }
    try { const r = await api('/auth/me', { method: 'PATCH', body: f }); setUser(r.user); setToast('انحفظت التغييرات'); } catch (err) { setError(err.message); }
  };
  const changePw = async (e) => {
    e.preventDefault(); setError('');
    try { await api('/auth/change-password', { method: 'POST', body: pw }); setPw({ current: '', next: '' }); setToast('تغيّرت كلمة المرور'); } catch (err) { setError(err.message); }
  };

  const head = (
    <div className="page-head">
      {!isCompany && <nav className="crumbs" aria-label="مسار الصفحة"><ol><li><Link to="/">الرئيسية</Link></li><li><span aria-current="page">حسابي</span></li></ol></nav>}
      <div className="profile-head">
        <span className="avatar xl" aria-hidden="true">{initial(user.name)}</span>
        <div className="page-head-copy">
          <span className="kicker">{isCompany ? 'إعدادات الشركة' : ROLE[user.role]}</span>
          <h1>{user.name}</h1>
          <div className="row" style={{ gap: 8 }}><StatusBadge map={USER_STATUS} value={user.status} /><span className="muted small ltr">{user.email}</span></div>
        </div>
      </div>
    </div>
  );

  const body = (
    <div className="narrow-col">
      {user.status === 'verified' ? (
        <div className="alert green row" style={{ gap: 8 }}><Icon name="shield" size={18} />حسابك موثّق. الجوال والإيميل متأكدين، والإدارة وافقت على الوثائق.</div>
      ) : (
        <div className="alert amber">
          {user.status === 'pending' ? 'وثائقك قيد المراجعة عند الإدارة.' : user.status === 'rejected' ? `انرفض التوثيق: ${user.rejectionReason}` : 'حسابك مش مكتمل.'}
          {user.status !== 'pending' && <> <Link to="/register?resume=1">كمّل التوثيق</Link></>}
        </div>
      )}
      <ErrorBox error={error} />
      <form className="panel" onSubmit={save} aria-labelledby="info-title">
        <h2 id="info-title" className="panel-title"><span className="ic-tile sm"><Icon name={isCompany ? 'building' : 'user'} size={16} /></span>{isCompany ? 'معلومات الشركة' : 'معلوماتك'}</h2>
        <Field label={isCompany ? 'اسم الشركة' : 'الاسم الكامل'}><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <div className="form-grid">
          <Field label="البريد الإلكتروني" hint="لتغيير الإيميل أو الجوال تواصل مع الدعم."><input className="input ltr" value={user.email} disabled /></Field>
          <Field label="الجوال"><input className="input ltr" value={user.phone} disabled /></Field>
        </div>
        <Field label="المدينة"><select className="input" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })}><option value="">—</option>{Object.entries(CITIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        {isCompany && (
          <>
            <Field label="عنوان الفرع" hint="بيظهر للزبائن بصفحة الشركة وبتفاصيل الحجز."><input className="input" required autoComplete="street-address" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
            <LocationField
              label="موقع الفرع على الخريطة"
              hint="بيساعد الزبائن يلاقوا سياراتك بالبحث على الخريطة. اتركه فاضي إذا ما بدك تحدد موقع."
              value={{ lat: f.lat, lng: f.lng }}
              onChange={(v) => setF({ ...f, ...v })}
            />
            <Field label="هاتف الشركة"><input className="input ltr" inputMode="tel" value={f.companyPhone} onChange={(e) => setF({ ...f, companyPhone: e.target.value })} /></Field>
            <Field label="نبذة عن الشركة"><textarea className="input" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
            <div className="field">
              <span className="bold">ساعات دوام الفرع</span>
              <span className="hint">الزبون بيقدر يختار وقت الاستلام والتسليم بس ضمن هالساعات.</span>
              <HoursEditor value={f.hours} onChange={(hours) => setF({ ...f, hours })} />
            </div>
          </>
        )}
        <button type="submit" className="btn" style={{ alignSelf: 'flex-start' }}>احفظ التغييرات</button>
      </form>
      <form className="panel" onSubmit={changePw} aria-labelledby="pw-title">
        <h2 id="pw-title" className="panel-title"><span className="ic-tile sm"><Icon name="lock" size={16} /></span>كلمة المرور</h2>
        <div className="form-grid">
          <Field label="الحالية"><input className="input" type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></Field>
          <Field label="الجديدة" hint="8 أحرف على الأقل."><input className="input" type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></Field>
        </div>
        <button type="submit" className="btn secondary" style={{ alignSelf: 'flex-start' }}>غيّر كلمة المرور</button>
      </form>
    </div>
  );

  if (isCompany) return <div className="col" style={{ gap: 8 }}>{head}{body}</div>;
  return (
    <main>
      <div className="page-band"><div className="container">{head}</div></div>
      <div className="container page-body">{body}</div>
    </main>
  );
}
