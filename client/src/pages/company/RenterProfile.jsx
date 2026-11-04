import { Link, useParams } from 'react-router-dom';
import { api } from '../../api.js';
import { ErrorBox, Loading, StatusBadge, useLoad } from '../../components/ui.jsx';
import { CITIES, RENTAL_STATUS, fmtDate } from '../../labels.js';

export default function RenterProfile() {
  const { id } = useParams();
  const { data, loading, error } = useLoad(() => api(`/company/renters/${id}`), [id]);
  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  const { renter, stats, history, reviews } = data;
  return (
    <div className="col" style={{ gap: 20 }}>
      <Link to="/company/requests">‹ طلبات الإيجار</Link>
      <div className="card row">
        <span className="avatar lg">{renter.name[0]}</span>
        <div className="col" style={{ gap: 2 }}>
          <h1 style={{ fontSize: 24 }}>{renter.name}</h1>
          <span className="small">{renter.status === 'verified' ? 'الهوية موثّقة ✓ · رخصة السواقة موثّقة ✓' : 'مش موثّق'}</span>
          <span className="muted small">{CITIES[renter.city] || ''} · على Redrive من {new Date(renter.createdAt).toLocaleDateString('ar-JO-u-nu-latn', { month: 'long', year: 'numeric' })}</span>
        </div>
      </div>
      <div className="grid stats">
        <div className="stat"><span className="muted small">تقييم الشركات</span><div className="v">{renter.ratingCount ? `★ ${renter.ratingAvg}` : '—'}</div><span className="muted small">من {renter.ratingCount} تقييم</span></div>
        <div className="stat"><span className="muted small">رحلات مكتملة</span><div className="v">{stats.completed}</div><span className="muted small">من {stats.total} حجوزات</span></div>
        <div className="stat"><span className="muted small">إلغاءات</span><div className="v">{stats.cancelled}</div></div>
        <div className="stat"><span className="muted small">ما إجا يستلم</span><div className="v">{stats.noShow}</div></div>
      </div>
      <section className="card col">
        <h3>سجل الحجوزات</h3>
        {history.map((h) => <div key={h._id} className="row between small"><span>{h.car} · {h.company} · {fmtDate(h.startDate)}</span><StatusBadge map={RENTAL_STATUS} value={h.status} /></div>)}
      </section>
      <section className="card col">
        <h3>شو حكت الشركات</h3>
        {reviews.length === 0 && <span className="muted">لسا ما في تقييمات.</span>}
        {reviews.map((r) => <div key={r._id} className="col" style={{ gap: 0 }}><b className="small">{r.author?.name} · {'★'.repeat(r.stars)}</b><span>{r.comment}</span></div>)}
      </section>
    </div>
  );
}
