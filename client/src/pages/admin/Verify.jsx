import { useState } from 'react';
import { api } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import { PageTitle } from '../../components/Layout.jsx';
import { Empty, ErrorBox, Field, Icon, Loading, useLoad } from '../../components/ui.jsx';
import { CITIES, DOC_LABEL, ROLE, fmtDate, initial } from '../../labels.js';

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
      <PageTitle kicker="الإدارة" title="توثيق الحسابات" sub="راجع الوثائق، وقرر توثيق الحساب أو رفضه. صاحب الحساب بيوصله إشعار وإيميل بقرارك." />
      {loading ? <Loading /> : users.length === 0 ? <Empty icon="shield" title="خلصت كل طلبات التوثيق" text="أي حساب جديد بيرفع وثائقه بيظهر هون." /> : (
        <div className="md-split">
          <div className="md-list" role="group" aria-label="حسابات بانتظار التوثيق">
            {users.map((u) => (
              <button type="button" key={u._id} className="md-item" aria-pressed={cur?._id === u._id} onClick={() => { setSelId(u._id); setRejecting(false); }}>
                <span className="avatar" aria-hidden="true">{initial(u.name)}</span>
                <span className="grow"><b>{u.name}</b><small>{ROLE[u.role]} · {fmtDate(u.updatedAt)}</small></span>
              </button>
            ))}
          </div>
          {cur && (
            <section className="panel" aria-labelledby="cur-name">
              <div className="row" style={{ gap: 14 }}>
                <span className="avatar xl" aria-hidden="true">{initial(cur.name)}</span>
                <div className="col" style={{ gap: 2 }}><h2 id="cur-name">{cur.name}</h2><span className="muted">{ROLE[cur.role]} · سجّل {fmtDate(cur.createdAt)}</span></div>
              </div>
              <div className="kv-grid">
                <div className="info-tile"><Icon name="mail" /><div><span>الإيميل (متأكد)</span><b className="ltr">{cur.email}</b></div></div>
                <div className="info-tile"><Icon name="phone" /><div><span>الجوال (متأكد)</span><b className="ltr">{cur.phone}</b></div></div>
                {cur.role === 'renter' && <div className="info-tile"><Icon name="calendar" /><div><span>تاريخ الميلاد</span><b>{cur.dateOfBirth ? fmtDate(cur.dateOfBirth) : '—'}</b></div></div>}
                {cur.role === 'company' && <div className="info-tile"><Icon name="building" /><div><span>العنوان</span><b>{cur.company?.address || '—'}</b></div></div>}
                <div className="info-tile"><Icon name="pin" /><div><span>المدينة</span><b>{CITIES[cur.city] || '—'}</b></div></div>
              </div>
              <h3>الوثائق</h3>
              <div className="doc-links">{cur.documents.map((d) => <a key={d.type} className="btn secondary sm" href={d.url} target="_blank" rel="noreferrer"><Icon name="doc" size={16} />{DOC_LABEL[d.type]}<Icon name="external" size={14} /></a>)}</div>
              <ErrorBox error={error} />
              {rejecting ? (
                <>
                  <Field label="سبب الرفض (مطلوب، بيوصل لصاحب الحساب)"><textarea className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="اكتب سبب الرفض عشان صاحب الحساب يعرف شو يصلّح." /></Field>
                  <div className="row"><button type="button" className="btn danger" disabled={!reason.trim()} onClick={() => decide('reject')}>ارفض الحساب</button><button type="button" className="btn secondary" onClick={() => setRejecting(false)}>تراجع</button></div>
                </>
              ) : (
                <div className="row"><button type="button" className="btn" onClick={() => decide('approve')}><Icon name="check" size={18} />وثّق الحساب</button><button type="button" className="btn danger outline" onClick={() => setRejecting(true)}>ارفض</button></div>
              )}
            </section>
          )}
        </div>
      )}
    </>
  );
}
