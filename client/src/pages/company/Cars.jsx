import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import { PageTitle } from '../../components/Layout.jsx';
import { CarImage, Empty, ErrorBox, Loading, Stars, StatusBadge, useLoad } from '../../components/ui.jsx';
import { CAR_STATUS, FUEL, TRANSMISSION, money } from '../../labels.js';

export default function Cars() {
  const { setToast } = useAuth();
  const { data, loading, reload } = useLoad(() => api('/cars/mine'));
  const [confirm, setConfirm] = useState(null);
  const [error, setError] = useState('');
  const remove = async (id) => {
    setError('');
    try { await api(`/cars/${id}`, { method: 'DELETE' }); setToast('انحذفت السيارة'); setConfirm(null); reload(); } catch (e) { setError(e.message); setConfirm(null); }
  };
  const cars = data?.cars || [];
  return (
    <>
      <PageTitle title="سياراتي" sub={`${cars.length} سيارات`}><Link className="btn" to="/company/cars/new">أضف سيارة</Link></PageTitle>
      <ErrorBox error={error} />
      {loading ? <Loading /> : cars.length === 0 ? <Empty title="ما أضفت سيارات لهلأ" action={<Link className="btn" to="/company/cars/new">أضف أول سيارة</Link>} /> : (
        <div className="grid cards" style={{ marginTop: 12 }}>
          {cars.map((c) => (
            <div key={c._id} className="car-card">
              <CarImage car={c} />
              <div className="body">
                <div className="row between"><b>{c.brand} {c.model} {c.year}</b><StatusBadge map={CAR_STATUS} value={c.status} /></div>
                <span className="muted small">{TRANSMISSION[c.transmission]} · {FUEL[c.fuel]} · {c.seats} مقاعد · <span className="ltr">{c.plateNumber}</span></span>
                {c.status === 'rejected' && <span className="small" style={{ color: 'var(--red)' }}>سبب الرفض: {c.rejectionReason}</span>}
                <div className="row between"><span className="price">{money(c.dailyPrice)}<span className="muted small">/يوم</span></span><Stars value={c.ratingAvg} /></div>
                <div className="row">
                  <Link className="btn secondary sm" to={`/company/cars/${c._id}`}>تعديل والتقويم</Link>
                  {confirm === c._id ? (
                    <><button type="button" className="btn danger sm" onClick={() => remove(c._id)}>احذف نهائياً</button><button type="button" className="btn ghost sm" onClick={() => setConfirm(null)}>تراجع</button></>
                  ) : <button type="button" className="btn danger outline sm" onClick={() => setConfirm(c._id)}>احذف</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="muted small" style={{ marginTop: 12 }}>ما بتقدر تحذف سيارة عليها حجز قيد الانتظار أو مؤكد أو جاري. السيارة المحذوفة بتختفي من البحث، وسجل رحلاتها بيضل محفوظ.</p>
    </>
  );
}
