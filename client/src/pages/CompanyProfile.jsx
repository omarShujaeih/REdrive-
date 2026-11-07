import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { CarCard, Empty, ErrorBox, Icon, Loading, Stars, useLoad } from '../components/ui.jsx';
import { OpeningHours } from '../components/Hours.jsx';
import { CITIES, fmtDate, initial } from '../labels.js';

export default function CompanyProfile() {
  const { id } = useParams();
  const { data, loading, error } = useLoad(() => api(`/cars/company/${id}`), [id]);
  if (loading) return <Loading lines={4} />;
  if (error) return <main className="container page-body"><ErrorBox error={error} /></main>;
  const { company, cars, reviews, trips } = data;
  const since = new Date(company.createdAt).toLocaleDateString('ar-JO-u-nu-latn', { month: 'long', year: 'numeric' });

  return (
    <main>
      <section className="co-hero" aria-labelledby="co-name">
        <div className="container co-hero-inner">
          <nav className="crumbs" aria-label="مسار الصفحة">
            <ol><li><Link to="/">الرئيسية</Link></li><li><Link to="/search">الشركات والسيارات</Link></li><li><span aria-current="page">{company.name}</span></li></ol>
          </nav>
          <div className="co-hero-row">
            <span className="co-avatar" aria-hidden="true">{initial(company.name)}</span>
            <div className="col" style={{ gap: 6, minWidth: 0, flex: '1 1 320px' }}>
              <h1 id="co-name">{company.name}</h1>
              <div className="co-hero-meta">
                <span className="verified"><Icon name="shield" size={16} />شركة موثّقة</span>
                {CITIES[company.city] && <span><Icon name="pin" size={16} />{CITIES[company.city]}</span>}
                <span><Icon name="calendar" size={16} />على Redrive من {since}</span>
              </div>
              {company.company?.description && <p>{company.company.description}</p>}
              {company.company?.address && <span className="co-hero-meta"><span><Icon name="building" size={16} />{company.company.address}</span></span>}
              <details className="co-hours">
                <summary><Icon name="clock" size={16} />ساعات الدوام</summary>
                <OpeningHours company={company} />
              </details>
            </div>
            <div className="co-stats">
              <div className="co-stat"><b><Stars value={company.ratingAvg} /></b><span>التقييم</span></div>
              <div className="co-stat"><b>{trips}</b><span>رحلة مكتملة</span></div>
              <div className="co-stat"><b>{cars.length}</b><span>سيارة</span></div>
            </div>
          </div>
        </div>
      </section>

      <div className="container page-body">
        <div className="section-head"><div><span className="kicker">أسطول الشركة</span><h2>سيارات {company.name}</h2></div></div>
        {cars.length === 0 ? <Empty icon="key" title="ما في سيارات معروضة هلأ" text="الشركة ما عرضت سيارات متاحة حالياً. جرّب ترجع بعدين." /> : (
          <div className="grid cards three">{cars.map((c) => <CarCard key={c._id} car={{ ...c, company }} />)}</div>
        )}

        <div className="section-head" style={{ marginTop: 16 }}><div><span className="kicker">تقييمات المستأجرين</span><h2>شو حكوا عن {company.name}</h2></div></div>
        {reviews.length === 0 ? <span className="muted">لسا ما في تقييمات.</span> : (
          <div className="grid cards">
            {reviews.map((r) => (
              <div key={r._id} className="panel review-card">
                <div className="row" style={{ gap: 10 }}>
                  <span className="avatar">{r.author?.name?.[0]}</span>
                  <div className="col" style={{ gap: 0 }}><b>{r.author?.name}</b><span className="stars-row small" style={{ color: 'var(--star)' }} aria-label={`${r.stars} من 5`}>{'★'.repeat(r.stars)}</span></div>
                </div>
                <span>{r.comment}</span>
                <span className="muted small">{fmtDate(r.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
