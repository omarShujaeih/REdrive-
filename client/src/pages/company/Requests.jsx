import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import { PageTitle } from '../../components/Layout.jsx';
import { Empty, ErrorBox, Field, Icon, Loading, Stars, useLoad } from '../../components/ui.jsx';
import { carName, daysWord, fmtDateTime, initial, money, timeLeft } from '../../labels.js';

export default function Requests() {
  const { setToast } = useAuth();
  const { data, loading, reload } = useLoad(() => api('/rentals/mine?status=pending'));
  const active = useLoad(() => api('/rentals/mine?status=active'));
  const extensionRequests = (active.data?.rentals || []).flatMap((r) => (r.extensions || []).filter((e) => e.status === 'pending').map((e) => ({ rental: r, ext: e })));
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const list = data?.rentals || [];
  const overlaps = (r) => list.some((o) => o._id !== r._id && o.car._id === r.car._id && new Date(o.startDate) < new Date(r.endDate) && new Date(r.startDate) < new Date(o.endDate));

  const act = async (r, action) => {
    setError('');
    try {
      const res = await api(`/rentals/${r._id}/${action}`, { method: 'POST', body: action === 'reject' ? { reason } : undefined });
      setToast(action === 'accept' ? `قبلت الطلب${res.autoRejected ? `، وانرفض ${res.autoRejected} طلب متقاطع تلقائياً` : ''}` : 'رفضت الطلب، والمبلغ رجع للزبون');
      setRejecting(null); setReason(''); reload();
    } catch (e) { setError(e.message); }
  };

  return (
    <>
      <PageTitle kicker="الطلبات" title="طلبات الإيجار" sub="شوف ملف كل زبون قبل ما تقرر. رد خلال 12 ساعة، وإلا الطلب بينرفض تلقائياً وبيرجع المبلغ للزبون." />
      <ErrorBox error={error} />

      {extensionRequests.length > 0 && (
        <section className="col" style={{ gap: 12, marginBottom: 24 }} aria-labelledby="ext-title">
          <h2 id="ext-title" className="panel-title" style={{ fontSize: 18, color: 'var(--navy)' }}><span className="ic-tile sm warn"><Icon name="clock" size={16} /></span>طلبات تمديد</h2>
          {extensionRequests.map(({ rental: r, ext }) => (
            <div key={ext._id} className="panel">
              <div className="panel-head">
                <div className="row" style={{ gap: 12 }}>
                  <span className="avatar" aria-hidden="true">{initial(r.renter.name)}</span>
                  <div className="col" style={{ gap: 2 }}>
                    <b>{r.renter.name} · {carName(r.car)}</b>
                    <span className="small muted">لحد {fmtDateTime(ext.requestedEnd)} بدل {fmtDateTime(ext.previousEnd)} · {daysWord(ext.extraDays)} · {money(ext.amount)} مدفوعين</span>
                  </div>
                </div>
                <div className="row" style={{ gap: 8 }}><span className="badge amber">{timeLeft(ext.respondBy)}</span><Link className="btn sm" to={`/company/rentals/${r._id}`}>رد على الطلب</Link></div>
              </div>
            </div>
          ))}
        </section>
      )}

      {loading ? <Loading /> : list.length === 0 ? (
        <Empty icon="inbox" title="ما في طلبات جديدة" text="أي طلب جديد بيوصلك إشعار فيه." />
      ) : (
        <div className="col" style={{ gap: 14 }}>
          {list.map((r) => (
            <article key={r._id} className="panel" aria-label={`طلب ${r.renter.name}`}>
              <div className="panel-head">
                <div className="row" style={{ gap: 12 }}>
                  <span className="avatar" aria-hidden="true">{initial(r.renter.name)}</span>
                  <div className="col" style={{ gap: 0 }}>
                    <b>{r.renter.name} <span className="verified"><Icon name="shield" size={14} />حساب موثّق</span></b>
                    <span className="muted small"><Stars value={r.renter.ratingAvg} /> من الشركات · {r.renter.ratingCount} تقييم</span>
                  </div>
                </div>
                <div className="col" style={{ gap: 0, alignItems: 'flex-end' }}><b style={{ fontSize: 22, color: 'var(--navy)' }}>{money(r.total)}</b><span className="muted small ltr">{r.code}</span></div>
              </div>
              <div className="rr-meta">
                <span><Icon name="car" size={15} />{carName(r.car)}</span>
                <span><Icon name="calendar" size={15} />{fmtDateTime(r.startDate)} ← {fmtDateTime(r.endDate)} ({daysWord(r.days)})</span>
                <span className="badge amber">{timeLeft(r.respondBy)}</span>
              </div>
              {overlaps(r) && <div className="alert amber small">تواريخ هالطلب بتتقاطع مع طلب ثاني على نفس السيارة. إذا قبلت واحد، التاني بينرفض تلقائياً.</div>}
              {rejecting === r._id ? (
                <div className="col">
                  <Field label="سبب الرفض (بيوصل للمستأجر)"><textarea className="input" value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
                  <div className="row"><button type="button" className="btn danger" onClick={() => act(r, 'reject')}>ارفض الطلب</button><button type="button" className="btn secondary" onClick={() => setRejecting(null)}>تراجع</button></div>
                </div>
              ) : (
                <div className="row">
                  <button type="button" className="btn" onClick={() => act(r, 'accept')}><Icon name="check" size={18} />اقبل الطلب</button>
                  <button type="button" className="btn danger outline" onClick={() => setRejecting(r._id)}>ارفض</button>
                  <Link className="btn ghost" to={`/company/renters/${r.renter._id}`}><Icon name="user" size={18} />ملف الزبون</Link>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
