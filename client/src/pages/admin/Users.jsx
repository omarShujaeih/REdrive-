import { useState } from 'react';
import { api, qs } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import { PageTitle } from '../../components/Layout.jsx';
import { Empty, ErrorBox, Field, Icon, Loading, Modal, StatusBadge, useLoad } from '../../components/ui.jsx';
import { ROLE, USER_STATUS, initial } from '../../labels.js';

const FILTERS = [{ k: '', label: 'الكل' }, { k: 'renter', label: 'المستأجرين' }, { k: 'company', label: 'الشركات' }, { k: 'blocked', label: 'المحظورين' }];

export default function Users() {
  const { setToast } = useAuth();
  const [filter, setFilter] = useState('');
  const [q, setQ] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [nu, setNu] = useState({ name: '', email: '', prefix: '+970', phone: '', role: 'renter' });
  const [addError, setAddError] = useState('');
  const [saving, setSaving] = useState(false);
  const query = filter === 'blocked' ? { status: 'blocked', q } : { role: filter, q };
  const { data, loading, reload } = useLoad(() => api(`/admin/users${qs(query)}`), [filter, q]);

  const act = async (fn, msg) => { setError(''); try { await fn(); setToast(msg); setConfirm(null); reload(); } catch (e) { setError(e.message); setConfirm(null); } };
  const users = data?.users || [];

  // The new user gets an email and sets a password with "forgot password"; renters and companies verify after that.
  const createUser = async (e) => {
    e.preventDefault(); setAddError(''); setSaving(true);
    try {
      await api('/admin/users', { method: 'POST', body: { name: nu.name.trim(), email: nu.email.trim(), phone: `${nu.prefix}${nu.phone.replace(/^0/, '').replace(/\s/g, '')}`, role: nu.role } });
      setToast('انعمل الحساب، وانبعتله إيميل يعمل منه كلمة مرور');
      setAdding(false); setNu({ name: '', email: '', prefix: '+970', phone: '', role: 'renter' }); reload();
    } catch (err) { setAddError(err.message); } finally { setSaving(false); }
  };

  return (
    <>
      <PageTitle kicker="الإدارة" title="المستخدمين" sub={loading ? 'كل حسابات المنصة.' : `${users.length} حساب`}>
        <button type="button" className="btn" onClick={() => setAdding(true)}><Icon name="plus" size={18} />أضف مستخدم</button>
      </PageTitle>
      <div className="filter-bar">
        <div className="tabs" role="group" aria-label="نوع الحساب">
          {FILTERS.map((f) => <button type="button" key={f.k} aria-pressed={filter === f.k} onClick={() => setFilter(f.k)}>{f.label}</button>)}
        </div>
        <div className="input-wrap has-lead">
          <span className="lead-ic"><Icon name="search" size={18} /></span>
          <input className="input" type="search" placeholder="ابحث بالاسم أو الإيميل" value={q} onChange={(e) => setQ(e.target.value)} aria-label="ابحث بالاسم أو الإيميل" />
        </div>
      </div>
      <ErrorBox error={error} />
      {loading ? <Loading /> : users.length === 0 ? <Empty icon="users" title="ما في حسابات بتطابق البحث" text="جرّب كلمة ثانية أو فلتر ثاني." /> : (
        <div className="table-wrap">
          <table className="table stack">
            <thead><tr><th>الاسم</th><th>النوع</th><th>الحالة</th><th>التقييم</th><th>حجوزات جارية</th><th>إجراءات</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td data-label="الاسم">
                    <span className="row" style={{ gap: 10, flexWrap: 'nowrap' }}>
                      <span className="avatar" aria-hidden="true">{initial(u.name)}</span>
                      <span className="col" style={{ gap: 0, minWidth: 0 }}><b>{u.name}</b><span className="muted small ltr" style={{ textAlign: 'end' }}>{u.email}</span></span>
                    </span>
                  </td>
                  <td data-label="النوع">{ROLE[u.role]}</td>
                  <td data-label="الحالة"><StatusBadge map={USER_STATUS} value={u.status} /></td>
                  <td data-label="التقييم">{u.ratingCount ? `★ ${u.ratingAvg}` : '—'}</td>
                  <td data-label="حجوزات جارية">{u.activeRentals}</td>
                  <td data-label="إجراءات">
                    {u.role !== 'admin' ? (
                      <div className="row" style={{ gap: 6 }}>
                        {u.status === 'blocked'
                          ? <button type="button" className="btn secondary sm" onClick={() => act(() => api(`/admin/users/${u._id}/block`, { method: 'POST', body: { block: false } }), 'انفك الحظر')}>فك الحظر</button>
                          : <button type="button" className="btn secondary sm" onClick={() => act(() => api(`/admin/users/${u._id}/block`, { method: 'POST', body: { block: true } }), 'انحظر الحساب')}>احظر</button>}
                        {confirm === u._id ? (
                          <><button type="button" className="btn danger sm" onClick={() => act(() => api(`/admin/users/${u._id}`, { method: 'DELETE' }), 'انحذف الحساب')}>متأكد؟ احذف</button><button type="button" className="btn ghost sm" onClick={() => setConfirm(null)}>تراجع</button></>
                        ) : <button type="button" className="btn danger outline sm" disabled={u.activeRentals > 0} title={u.activeRentals > 0 ? 'عليه حجز قيد الانتظار أو مؤكد أو جاري' : undefined} onClick={() => setConfirm(u._id)} aria-label={`احذف ${u.name}`}><Icon name="trash" size={16} /></button>}
                      </div>
                    ) : <span className="muted small">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted small" style={{ marginTop: 12 }}>ما بتقدر تحذف حساب عليه حجز قيد الانتظار أو مؤكد أو جاري. صاحب الحساب بيوصله إيميل إذا انحظر أو انحذف.</p>
      {adding && (
        <Modal title="أضف مستخدم" onClose={() => setAdding(false)}>
          <form className="col" style={{ gap: 14 }} onSubmit={createUser}>
            <ErrorBox error={addError} />
            <Field label="الاسم"><input className="input" required value={nu.name} onChange={(e) => setNu({ ...nu, name: e.target.value })} /></Field>
            <Field label="البريد الإلكتروني"><input className="input ltr" type="email" required autoComplete="off" value={nu.email} onChange={(e) => setNu({ ...nu, email: e.target.value })} /></Field>
            <Field label="رقم الجوال">
              <div className="phone-row">
                <select className="input" value={nu.prefix} onChange={(e) => setNu({ ...nu, prefix: e.target.value })} aria-label="مقدمة الدولة"><option>+970</option><option>+972</option></select>
                <input className="input" inputMode="tel" required placeholder="59X XXX XXX" value={nu.phone} onChange={(e) => setNu({ ...nu, phone: e.target.value })} aria-label="رقم الجوال" />
              </div>
            </Field>
            <Field label="نوع الحساب">
              <select className="input" value={nu.role} onChange={(e) => setNu({ ...nu, role: e.target.value })}>
                <option value="renter">مستأجر</option><option value="company">شركة تأجير</option><option value="admin">أدمن</option>
              </select>
            </Field>
            <span className="muted small">{nu.role === 'admin' ? 'حساب الأدمن بيكون موثّق مباشرة.' : 'المستأجر والشركة بيكمّلوا تأكيد الجوال والإيميل والوثائق بعد أول دخول.'} بيوصله إيميل يعمل منه كلمة مرور من «نسيت كلمة المرور؟».</span>
            <div className="row">
              <button type="submit" className="btn" disabled={saving}>{saving ? 'عم ننشئ الحساب…' : 'أنشئ الحساب'}</button>
              <button type="button" className="btn secondary" onClick={() => setAdding(false)}>تراجع</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
