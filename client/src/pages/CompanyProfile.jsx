import { useParams } from 'react-router-dom';
import { api } from '../api.js';
import { Badge, CarCard, ErrorBox, Loading, Stars, useLoad } from '../components/ui.jsx';
import { CITIES, fmtDate } from '../labels.js';

export default function CompanyProfile() {
  const { id } = useParams();
  const { data, loading, error } = useLoad(() => api(`/cars/company/${id}`), [id]);
  if (loading) return <Loading />;
  if (error) return <main className="container"><ErrorBox error={error} /></main>;
  const { company, cars, reviews, trips } = data;
  return (
    <main className="container col" style={{ gap: 24 }}>
      <div className="card row">
        <span className="avatar lg">{company.name[0]}</span>
        <div className="col grow" style={{ gap: 4 }}>
          <h1 style={{ fontSize: 26 }}>{company.name} <Badge tone="green">شركة موثّقة</Badge></h1>
          <span className="muted">{CITIES[company.city] || ''} · على Redrive من {new Date(company.createdAt).toLocaleDateString('ar-JO-u-nu-latn', { month: 'long', year: 'numeric' })}</span>
          {company.company?.description && <p>{company.company.description}</p>}
          <span className="small">{company.company?.address}</span>
        </div>
        <div className="row" style={{ gap: 24 }}>
          <div className="col" style={{ gap: 0, alignItems: 'center' }}><b style={{ fontSize: 22 }}><Stars value={company.ratingAvg} /></b><span className="muted small">التقييم</span></div>
          <div className="col" style={{ gap: 0, alignItems: 'center' }}><b style={{ fontSize: 22 }}>{trips}</b><span className="muted small">رحلات</span></div>
          <div className="col" style={{ gap: 0, alignItems: 'center' }}><b style={{ fontSize: 22 }}>{cars.length}</b><span className="muted small">سيارات</span></div>
        </div>
      </div>
      <h2>سيارات الشركة</h2>
      <div className="grid cards">{cars.map((c) => <CarCard key={c._id} car={{ ...c, company }} />)}</div>
      <h2>شو حكوا المستأجرين</h2>
      {reviews.length === 0 ? <span className="muted">لسا ما في تقييمات.</span> : (
        <div className="grid cards">{reviews.map((r) => <div key={r._id} className="card col" style={{ gap: 4 }}><b>{r.author?.name} · {'★'.repeat(r.stars)}</b><span>{r.comment}</span><span className="muted small">{fmtDate(r.createdAt)}</span></div>)}</div>
      )}
    </main>
  );
}
