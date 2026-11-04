import { useState } from 'react';
import { api, qs } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import { PageTitle } from '../../components/Layout.jsx';
import { ErrorBox, Loading, StatusBadge, useLoad } from '../../components/ui.jsx';
import { ROLE, USER_STATUS } from '../../labels.js';

const FILTERS = [{ k: '', label: 'الكل' }, { k: 'renter', label: 'المستأجرين' }, { k: 'company', label: 'الشركات' }, { k: 'blocked', label: 'المحظورين' }];

export default function Users() {
  const { setToast } = useAuth();
  const [filter, setFilter] = useState('');
  const [q, setQ] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [error, setError] = useState('');
  const query = filter === 'blocked' ? { status: 'blocked', q } : { role: filter, q };
  const { data, loading, reload } = useLoad(() => api(`/admin/users${qs(query)}`), [filter, q]);

  const act = async (fn, msg) => { setError(''); try { await fn(); setToast(msg); setConfirm(null); reload(); } catch (e) { setError(e.message); setConfirm(null); } };
  const users = data?.users || [];

  return (
    <>
      <PageTitle title="المستخدمين" sub={`${users.length} حساب`} />
      <div className="row between" style={{ marginBottom: 12 }}>
        <div className="chips">{FILTERS.map((f) => <button type="button" key={f.k} className={`chip ${filter === f.k ? 'on' : ''}`} onClick={() => setFilter(f.k)}>{f.label}</button>)}</div>
        <input className="input" style={{ width: 260 }} placeholder="ابحث بالاسم أو الإيميل" value={q} onChange={(e) => setQ(e.target.value)} aria-label="ابحث بالاسم أو الإيميل" />
      </div>
      <ErrorBox error={error} />
      {loading ? <Loading /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>الاسم</th><th>النوع</th><th>الحالة</th><th>التقييم</th><th>حجوزات جارية</th><th>إجراءات</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td><b>{u.name}</b><div className="muted small ltr" style={{ textAlign: 'end' }}>{u.email}</div></td>
                  <td>{ROLE[u.role]}</td>
                  <td><StatusBadge map={USER_STATUS} value={u.status} /></td>
                  <td>{u.ratingCount ? `★ ${u.ratingAvg}` : '—'}</td>
                  <td>{u.activeRentals}</td>
                  <td>
                    {u.role !== 'admin' && (
                      <div className="row" style={{ gap: 6 }}>
                        {u.status === 'blocked'
                          ? <button type="button" className="btn secondary sm" onClick={() => act(() => api(`/admin/users/${u._id}/block`, { method: 'POST', body: { block: false } }), 'انفك الحظر')}>فك الحظر</button>
                          : <button type="button" className="btn secondary sm" onClick={() => act(() => api(`/admin/users/${u._id}/block`, { method: 'POST', body: { block: true } }), 'انحظر الحساب')}>احظر</button>}
                        {confirm === u._id ? (
                          <><button type="button" className="btn danger sm" onClick={() => act(() => api(`/admin/users/${u._id}`, { method: 'DELETE' }), 'انحذف الحساب')}>متأكد؟ احذف</button><button type="button" className="btn ghost sm" onClick={() => setConfirm(null)}>تراجع</button></>
                        ) : <button type="button" className="btn danger outline sm" disabled={u.activeRentals > 0} title={u.activeRentals > 0 ? 'عليه حجز قيد الانتظار أو مؤكد أو جاري' : undefined} onClick={() => setConfirm(u._id)}>احذف</button>}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted small" style={{ marginTop: 12 }}>ما بتقدر تحذف حساب عليه حجز قيد الانتظار أو مؤكد أو جاري. صاحب الحساب بيوصله إيميل إذا انحظر أو انحذف.</p>
    </>
  );
}
