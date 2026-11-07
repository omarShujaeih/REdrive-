import { useState } from 'react';
import { api } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import { PageTitle } from '../../components/Layout.jsx';
import { CarImage, Empty, ErrorBox, Field, Icon, Loading, useLoad } from '../../components/ui.jsx';
import { CITIES, DOC_LABEL, FUEL, TRANSMISSION, carName, fmtDate, money } from '../../labels.js';

export default function AdminCars() {
  const { setToast } = useAuth();
  const { data, loading, reload } = useLoad(() => api('/admin/cars'));
  const [selId, setSelId] = useState(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const cars = data?.cars || [];
  const cur = cars.find((c) => c._id === selId) || cars[0];

  const decide = async (decision) => {
    setError('');
    try {
      await api(`/admin/cars/${cur._id}`, { method: 'POST', body: { decision, reason } });
      setToast(decision === 'approve' ? 'انعتمدت السيارة وصارت تظهر بالبحث' : 'انرفضت السيارة'); setRejecting(false); setReason(''); setSelId(null); reload();
    } catch (e) { setError(e.message); }
  };

  return (
    <>
      <PageTitle kicker="الإدارة" title="اعتماد السيارات" sub="السيارة بتظهر بالبحث بس بعد ما تعتمدها. الشركة بيوصلها إشعار وإيميل بقرارك." />
      {loading ? <Loading /> : cars.length === 0 ? <Empty icon="car" title="ما في سيارات بتستنى" text="أي سيارة جديدة أو وثائق معدّلة بتظهر هون." /> : (
        <div className="md-split">
          <div className="md-list" role="group" aria-label="سيارات بانتظار الاعتماد">
            {cars.map((c) => (
              <button type="button" key={c._id} className="md-item" aria-pressed={cur?._id === c._id} onClick={() => { setSelId(c._id); setRejecting(false); }}>
                <span className="thumb"><CarImage car={c} alt="" /></span>
                <span className="grow"><b>{carName(c)}</b><small>{c.company?.name} · {fmtDate(c.updatedAt)}</small></span>
              </button>
            ))}
          </div>
          {cur && (
            <section className="panel" aria-labelledby="car-name">
              <div className="cd-main" style={{ maxWidth: 520 }}><CarImage car={cur} /></div>
              <div className="col" style={{ gap: 2 }}>
                <h2 id="car-name">{carName(cur)}</h2>
                <span className="muted">{cur.company?.name} · {TRANSMISSION[cur.transmission]} · {FUEL[cur.fuel]} · {cur.seats} مقاعد · {CITIES[cur.city]}</span>
              </div>
              <div className="kv-grid">
                <div className="info-tile"><Icon name="card" /><div><span>سعر الشركة باليوم</span><b>{money(cur.dailyPrice)}</b></div></div>
                <div className="info-tile"><Icon name="sparkle" /><div><span>السعر المقترح من النموذج</span><b>{cur.aiSuggestedPrice ? money(cur.aiSuggestedPrice) : '—'}</b></div></div>
                <div className="info-tile"><Icon name="key" /><div><span>رقم اللوحة</span><b className="ltr">{cur.plateNumber}</b></div></div>
              </div>
              <h3>الوثائق (بتشوفها الإدارة والشركة بس)</h3>
              <div className="doc-links">{cur.documents.map((d) => <a key={d.type} className="btn secondary sm" href={d.url} target="_blank" rel="noreferrer"><Icon name="doc" size={16} />{DOC_LABEL[d.type]}<Icon name="external" size={14} /></a>)}</div>
              <ErrorBox error={error} />
              {rejecting ? (
                <>
                  <Field label="سبب الرفض (مطلوب، بيوصل للشركة)"><textarea className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="اكتب سبب الرفض عشان الشركة تعرف شو تصلّح." /></Field>
                  <div className="row"><button type="button" className="btn danger" disabled={!reason.trim()} onClick={() => decide('reject')}>ارفض السيارة</button><button type="button" className="btn secondary" onClick={() => setRejecting(false)}>تراجع</button></div>
                </>
              ) : (
                <div className="row"><button type="button" className="btn" onClick={() => decide('approve')}><Icon name="check" size={18} />اعتمد السيارة</button><button type="button" className="btn danger outline" onClick={() => setRejecting(true)}>ارفض</button></div>
              )}
            </section>
          )}
        </div>
      )}
    </>
  );
}
