import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import { PageTitle } from '../../components/Layout.jsx';
import { Badge, Empty, ErrorBox, Field, Loading, Stars, useLoad } from '../../components/ui.jsx';
import { carName, daysWord, fmtDate, money, timeLeft } from '../../labels.js';

export default function Requests() {
  const { setToast } = useAuth();
  const { data, loading, reload } = useLoad(() => api('/rentals/mine?status=pending'));
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
      <PageTitle title="طلبات الإيجار" sub="شوف ملف كل زبون قبل ما تقرر. رد خلال 12 ساعة، وإلا الطلب بينرفض تلقائياً وبيرجع المبلغ للزبون." />
      <ErrorBox error={error} />
      {loading ? <Loading /> : list.length === 0 ? <Empty title="ما في طلبات جديدة" text="أي طلب جديد بيوصلك إشعار فيه." /> : (
        <div className="col">
          {list.map((r) => (
            <div key={r._id} className="card col">
              <div className="row between">
                <div className="row">
                  <span className="avatar">{r.renter.name[0]}</span>
                  <div className="col" style={{ gap: 0 }}>
                    <b>{r.renter.name} <Badge tone="green">حساب موثّق</Badge></b>
                    <span className="muted small"><Stars value={r.renter.ratingAvg} /> من الشركات · {r.renter.ratingCount} تقييم</span>
                  </div>
                </div>
                <div className="col" style={{ gap: 0, alignItems: 'flex-end' }}><b style={{ fontSize: 20 }}>{money(r.total)}</b><span className="muted small ltr">{r.code}</span></div>
              </div>
              <div className="row small"><span><b>السيارة:</b> {carName(r.car)}</span><span><b>المدة:</b> {fmtDate(r.startDate)} ← {fmtDate(r.endDate)} ({daysWord(r.days)})</span><Badge tone="amber">{timeLeft(r.respondBy)}</Badge></div>
              {overlaps(r) && <div className="alert amber small">تواريخ هالطلب بتتقاطع مع طلب ثاني على نفس السيارة. إذا قبلت واحد، التاني بينرفض تلقائياً.</div>}
              {rejecting === r._id ? (
                <div className="col">
                  <Field label="سبب الرفض (بيوصل للمستأجر)"><textarea className="input" value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
                  <div className="row"><button type="button" className="btn danger" onClick={() => act(r, 'reject')}>ارفض الطلب</button><button type="button" className="btn secondary" onClick={() => setRejecting(null)}>تراجع</button></div>
                </div>
              ) : (
                <div className="row">
                  <button type="button" className="btn" onClick={() => act(r, 'accept')}>اقبل الطلب</button>
                  <button type="button" className="btn danger outline" onClick={() => setRejecting(r._id)}>ارفض</button>
                  <Link className="btn ghost" to={`/company/renters/${r.renter._id}`}>ملف الزبون</Link>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
