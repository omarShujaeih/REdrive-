import { useState } from 'react';
import { api } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import { PageTitle } from '../../components/Layout.jsx';
import { CarImage, Empty, ErrorBox, Field, Loading, useLoad } from '../../components/ui.jsx';
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
      <PageTitle title="اعتماد السيارات" sub="السيارة بتظهر بالبحث بس بعد ما تعتمدها. الشركة بيوصلها إشعار وإيميل بقرارك." />
      {loading ? <Loading /> : cars.length === 0 ? <Empty title="ما في سيارات بتستنى" text="أي سيارة جديدة أو وثائق معدّلة بتظهر هون." /> : (
        <div className="split" style={{ gridTemplateColumns: '280px 1fr' }}>
          <div className="col" style={{ gap: 8 }}>
            {cars.map((c) => (
              <button type="button" key={c._id} className="card col" style={{ cursor: 'pointer', textAlign: 'start', padding: 12, gap: 0, borderColor: cur?._id === c._id ? 'var(--blue)' : undefined }} onClick={() => { setSelId(c._id); setRejecting(false); }}>
                <b className="small">{carName(c)}</b><span className="muted small">{c.company?.name} · {fmtDate(c.updatedAt)}</span>
              </button>
            ))}
          </div>
          {cur && (
            <section className="card col">
              <div style={{ maxWidth: 420, borderRadius: 12, overflow: 'hidden' }}><CarImage car={cur} /></div>
              <h2>{carName(cur)}</h2>
              <span className="muted">{cur.company?.name} · {TRANSMISSION[cur.transmission]} · {FUEL[cur.fuel]} · {cur.seats} مقاعد · {CITIES[cur.city]}</span>
              <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div><span className="muted small">سعر الشركة</span><div className="bold">{money(cur.dailyPrice)}</div></div>
                <div><span className="muted small">السعر المقترح من الـ AI</span><div className="bold">{cur.aiSuggestedPrice ? money(cur.aiSuggestedPrice) : '—'}</div></div>
                <div><span className="muted small">رقم اللوحة</span><div className="bold ltr" style={{ textAlign: 'end' }}>{cur.plateNumber}</div></div>
              </div>
              <b>الوثائق (بتشوفها الإدارة والشركة بس)</b>
              <div className="row">{cur.documents.map((d) => <a key={d.type} className="btn secondary sm" href={d.url} target="_blank" rel="noreferrer">{DOC_LABEL[d.type]} ↗</a>)}</div>
              <ErrorBox error={error} />
              {rejecting ? (
                <>
                  <Field label="سبب الرفض (مطلوب، بيوصل للشركة)"><textarea className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="اكتب سبب الرفض عشان الشركة تعرف شو تصلّح." /></Field>
                  <div className="row"><button type="button" className="btn danger" disabled={!reason.trim()} onClick={() => decide('reject')}>ارفض السيارة</button><button type="button" className="btn secondary" onClick={() => setRejecting(false)}>تراجع</button></div>
                </>
              ) : (
                <div className="row"><button type="button" className="btn" onClick={() => decide('approve')}>اعتمد السيارة</button><button type="button" className="btn danger outline" onClick={() => setRejecting(true)}>ارفض</button></div>
              )}
            </section>
          )}
        </div>
      )}
    </>
  );
}
