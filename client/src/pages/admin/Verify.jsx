import { useState } from 'react';
import { api } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import { PageTitle } from '../../components/Layout.jsx';
import { Empty, ErrorBox, Field, Loading, useLoad } from '../../components/ui.jsx';
import { CITIES, DOC_LABEL, ROLE, fmtDate } from '../../labels.js';

export default function Verify() {
  const { setToast } = useAuth();
  const { data, loading, reload } = useLoad(() => api('/admin/verifications'));
  const [selId, setSelId] = useState(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const users = data?.users || [];
  const cur = users.find((u) => u._id === selId) || users[0];

  const decide = async (decision) => {
    setError('');
    try {
      await api(`/admin/verifications/${cur._id}`, { method: 'POST', body: { decision, reason } });
      setToast(decision === 'approve' ? 'انوثّق الحساب' : 'انرفض الحساب'); setRejecting(false); setReason(''); setSelId(null); reload();
    } catch (e) { setError(e.message); }
  };

  return (
    <>
      <PageTitle title="توثيق الحسابات" sub="راجع الوثائق، وقرر توثيق الحساب أو رفضه. صاحب الحساب بيوصله إشعار وإيميل بقرارك." />
      {loading ? <Loading /> : users.length === 0 ? <Empty title="خلصت كل طلبات التوثيق" text="أي حساب جديد بيرفع وثائقه بيظهر هون." /> : (
        <div className="split" style={{ gridTemplateColumns: '280px 1fr' }}>
          <div className="col" style={{ gap: 8 }}>
            {users.map((u) => (
              <button type="button" key={u._id} className="card row" style={{ cursor: 'pointer', textAlign: 'start', padding: 12, borderColor: cur?._id === u._id ? 'var(--blue)' : undefined }} onClick={() => { setSelId(u._id); setRejecting(false); }}>
                <span className="avatar">{u.name[0]}</span><div className="col" style={{ gap: 0 }}><b className="small">{u.name}</b><span className="muted small">{ROLE[u.role]} · {fmtDate(u.updatedAt)}</span></div>
              </button>
            ))}
          </div>
          {cur && (
            <section className="card col">
              <div className="row"><span className="avatar lg">{cur.name[0]}</span><div className="col" style={{ gap: 0 }}><h2>{cur.name}</h2><span className="muted">{ROLE[cur.role]} · سجّل {fmtDate(cur.createdAt)}</span></div></div>
              <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div><span className="muted small">الإيميل</span><div className="ltr" style={{ textAlign: 'end' }}>{cur.email} ✓</div></div>
                <div><span className="muted small">الجوال</span><div className="ltr" style={{ textAlign: 'end' }}>{cur.phone} ✓</div></div>
                {cur.role === 'renter' && <div><span className="muted small">تاريخ الميلاد</span><div>{cur.dateOfBirth ? fmtDate(cur.dateOfBirth) : '—'}</div></div>}
                {cur.role === 'company' && <div><span className="muted small">العنوان</span><div>{cur.company?.address}</div></div>}
                <div><span className="muted small">المدينة</span><div>{CITIES[cur.city] || '—'}</div></div>
              </div>
              <b>الوثائق</b>
              <div className="row">{cur.documents.map((d) => <a key={d.type} className="btn secondary sm" href={d.url} target="_blank" rel="noreferrer">{DOC_LABEL[d.type]} ↗</a>)}</div>
              <ErrorBox error={error} />
              {rejecting ? (
                <>
                  <Field label="سبب الرفض (مطلوب، بيوصل لصاحب الحساب)"><textarea className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="اكتب سبب الرفض عشان صاحب الحساب يعرف شو يصلّح." /></Field>
                  <div className="row"><button type="button" className="btn danger" disabled={!reason.trim()} onClick={() => decide('reject')}>ارفض الحساب</button><button type="button" className="btn secondary" onClick={() => setRejecting(false)}>تراجع</button></div>
                </>
              ) : (
                <div className="row"><button type="button" className="btn" onClick={() => decide('approve')}>وثّق الحساب</button><button type="button" className="btn danger outline" onClick={() => setRejecting(true)}>ارفض</button></div>
              )}
            </section>
          )}
        </div>
      )}
    </>
  );
}
