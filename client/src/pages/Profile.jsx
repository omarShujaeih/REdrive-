import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { ErrorBox, Field, StatusBadge } from '../components/ui.jsx';
import { CITIES, USER_STATUS, companyHours } from '../labels.js';
import { HoursEditor } from '../components/Hours.jsx';

export default function Profile() {
  const { user, setUser, setToast } = useAuth();
  const [f, setF] = useState({
    name: user.name, city: user.city || '', description: user.company?.description || '', companyPhone: user.company?.phone || '',
    ...(user.role === 'company' && { hours: companyHours(user) }),
  });
  const [pw, setPw] = useState({ current: '', next: '' });
  const [error, setError] = useState('');
  const isCompany = user.role === 'company';

  const save = async (e) => {
    e.preventDefault(); setError('');
    try { const r = await api('/auth/me', { method: 'PATCH', body: f }); setUser(r.user); setToast('انحفظت التغييرات'); } catch (err) { setError(err.message); }
  };
  const changePw = async (e) => {
    e.preventDefault(); setError('');
    try { await api('/auth/change-password', { method: 'POST', body: pw }); setPw({ current: '', next: '' }); setToast('تغيّرت كلمة المرور'); } catch (err) { setError(err.message); }
  };

  return (
    <main className={isCompany ? 'col' : 'container col'} style={{ gap: 20, maxWidth: 720 }}>
      <div className="row">
        <span className="avatar lg">{user.name[0]}</span>
        <div className="col" style={{ gap: 2 }}><h1 style={{ fontSize: 24 }}>{isCompany ? 'إعدادات الشركة' : user.name}</h1><StatusBadge map={USER_STATUS} value={user.status} /></div>
      </div>
      {user.status === 'verified' ? (
        <div className="alert green">حسابك موثّق. الجوال والإيميل متأكدين، والإدارة وافقت على الوثائق.</div>
      ) : (
        <div className="alert amber">
          {user.status === 'pending' ? 'وثائقك قيد المراجعة عند الإدارة.' : user.status === 'rejected' ? `انرفض التوثيق: ${user.rejectionReason}` : 'حسابك مش مكتمل.'}
          {user.status !== 'pending' && <> <Link to="/register?resume=1">كمّل التوثيق</Link></>}
        </div>
      )}
      <ErrorBox error={error} />
      <form className="card col" onSubmit={save}>
        <h3>معلوماتك</h3>
        <Field label={isCompany ? 'اسم الشركة' : 'الاسم الكامل'}><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="البريد الإلكتروني" hint="لتغيير الإيميل أو الجوال تواصل مع الدعم."><input className="input ltr" value={user.email} disabled /></Field>
        <Field label="الجوال"><input className="input ltr" value={user.phone} disabled /></Field>
        <Field label="المدينة"><select className="input" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })}><option value="">—</option>{Object.entries(CITIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        {isCompany && (
          <>
            <Field label="العنوان"><input className="input" value={user.company?.address || ''} disabled /></Field>
            <Field label="هاتف الشركة"><input className="input ltr" value={f.companyPhone} onChange={(e) => setF({ ...f, companyPhone: e.target.value })} /></Field>
            <Field label="نبذة عن الشركة"><textarea className="input" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
            <div className="field">
              <label>ساعات دوام الفرع</label>
              <span className="hint">الزبون بيقدر يختار وقت الاستلام والتسليم بس ضمن هالساعات.</span>
              <HoursEditor value={f.hours} onChange={(hours) => setF({ ...f, hours })} />
            </div>
          </>
        )}
        <button className="btn">احفظ التغييرات</button>
      </form>
      <form className="card col" onSubmit={changePw}>
        <h3>كلمة المرور</h3>
        <Field label="الحالية"><input className="input" type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></Field>
        <Field label="الجديدة" hint="8 أحرف على الأقل."><input className="input" type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></Field>
        <button className="btn secondary">غيّر كلمة المرور</button>
      </form>
    </main>
  );
}
