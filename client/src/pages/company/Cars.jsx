import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import { PageTitle } from '../../components/Layout.jsx';
import { CarImage, Empty, ErrorBox, Icon, SkeletonCards, Stars, StatusBadge, useLoad } from '../../components/ui.jsx';
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
      <PageTitle kicker="الأسطول" title="سياراتي" sub={loading ? 'سيارات شركتك وحالتها.' : `${cars.length} سيارات`}>
        <Link className="btn" to="/company/cars/new"><Icon name="plus" size={18} />أضف سيارة</Link>
      </PageTitle>
      <ErrorBox error={error} />
      {loading ? <SkeletonCards count={3} /> : cars.length === 0 ? (
        <Empty icon="car" title="ما أضفت سيارات لهلأ" text="أضف أول سيارة، وبعد ما الإدارة تعتمدها بتظهر بالبحث." action={<Link className="btn" to="/company/cars/new">أضف أول سيارة</Link>} />
      ) : (
        <div className="grid cards">
          {cars.map((c) => (
            <article key={c._id} className="car-card co-car">
              <div className="car-media">
                <CarImage car={c} />
                <span className="status-pin"><StatusBadge map={CAR_STATUS} value={c.status} /></span>
              </div>
              <div className="body">
                <h3 className="car-title"><Link to={`/company/cars/${c._id}`} className="stretched">{c.brand} {c.model}</Link><span className="car-year">{c.year}</span></h3>
                <span className="plate">لوحة <span className="ltr">{c.plateNumber}</span></span>
                <ul className="specs" aria-label="المواصفات">
                  <li><Icon name="gear" size={16} />{TRANSMISSION[c.transmission]}</li>
                  <li><Icon name="seat" size={16} />{c.seats} مقاعد</li>
                  <li><Icon name="fuel" size={16} />{FUEL[c.fuel]}</li>
                </ul>
                {c.status === 'rejected' && <div className="alert red small">سبب الرفض: {c.rejectionReason}</div>}
                <div className="car-foot">
                  <div className="car-price"><span><b>{money(c.dailyPrice)}</b> / يوم</span><small><Stars value={c.ratingAvg} /></small></div>
                  <div className="row" style={{ gap: 6, position: 'relative', zIndex: 2 }}>
                    {confirm === c._id ? (
                      <>
                        <button type="button" className="btn danger sm" onClick={() => remove(c._id)}>احذف نهائياً</button>
                        <button type="button" className="btn ghost sm" onClick={() => setConfirm(null)}>تراجع</button>
                      </>
                    ) : (
                      <>
                        <Link className="btn secondary sm" to={`/company/cars/${c._id}`}><Icon name="edit" size={16} />تعديل</Link>
                        <button type="button" className="btn danger outline sm" onClick={() => setConfirm(c._id)} aria-label={`احذف ${c.brand} ${c.model}`}><Icon name="trash" size={16} /></button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      <p className="muted small" style={{ marginTop: 16 }}>ما بتقدر تحذف سيارة عليها حجز قيد الانتظار أو مؤكد أو جاري. السيارة المحذوفة بتختفي من البحث، وسجل رحلاتها بيضل محفوظ.</p>
    </>
  );
}
