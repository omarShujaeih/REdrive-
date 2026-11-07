import { useParams } from 'react-router-dom';
import { api } from '../../api.js';
import { PageTitle } from '../../components/Layout.jsx';
import { ErrorBox, Icon, Loading, StatTile, StatusBadge, useLoad } from '../../components/ui.jsx';
import { CITIES, RENTAL_STATUS, fmtDate, initial } from '../../labels.js';

export default function RenterProfile() {
  const { id } = useParams();
  const { data, loading, error } = useLoad(() => api(`/company/renters/${id}`), [id]);
  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  const { renter, stats, history, reviews } = data;
  const verified = renter.status === 'verified';
  return (
    <div className="col" style={{ gap: 20 }}>
      <PageTitle back={['/company/requests', 'طلبات الإيجار']} kicker="ملف الزبون" title={renter.name} sub={`${CITIES[renter.city] || ''} · على Redrive من ${new Date(renter.createdAt).toLocaleDateString('ar-JO-u-nu-latn', { month: 'long', year: 'numeric' })}`}>
        <span className="avatar xl" aria-hidden="true">{initial(renter.name)}</span>
      </PageTitle>
      <div className={`alert ${verified ? 'green' : 'amber'} row`} style={{ gap: 8 }}>
        <Icon name={verified ? 'shield' : 'alert'} size={18} />
        {verified ? 'الهوية ورخصة السواقة موثّقين من إدارة Redrive.' : 'الحساب لسا مش موثّق.'}
      </div>
      <div className="grid stats">
        <StatTile icon="star" label="تقييم الشركات" value={renter.ratingCount ? `★ ${renter.ratingAvg}` : '—'} sub={`من ${renter.ratingCount} تقييم`} />
        <StatTile icon="check" label="رحلات مكتملة" value={stats.completed} sub={`من ${stats.total} حجوزات`} tone="good" />
        <StatTile icon="close" label="إلغاءات" value={stats.cancelled} tone={stats.cancelled ? 'warn' : ''} />
        <StatTile icon="alert" label="ما إجا يستلم" value={stats.noShow} tone={stats.noShow ? 'bad' : ''} />
      </div>
      <div className="dash-grid">
        <section className="panel" aria-labelledby="hist-title">
          <h2 id="hist-title" className="panel-title"><span className="ic-tile sm"><Icon name="calendar" size={16} /></span>سجل الحجوزات</h2>
          {history.length === 0 ? <span className="muted">ما في حجوزات سابقة.</span> : (
            <div className="list-rows">
              {history.map((h) => (
                <div key={h._id} className="list-row">
                  <div className="grow"><b>{h.car}</b><small>{h.company} · {fmtDate(h.startDate)}</small></div>
                  <StatusBadge map={RENTAL_STATUS} value={h.status} />
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="panel" aria-labelledby="rev-title">
          <h2 id="rev-title" className="panel-title"><span className="ic-tile sm"><Icon name="star" size={16} /></span>شو حكت الشركات</h2>
          {reviews.length === 0 ? <span className="muted">لسا ما في تقييمات.</span> : (
            <div className="list-rows">
              {reviews.map((r) => (
                <div key={r._id} className="list-row" style={{ alignItems: 'flex-start' }}>
                  <span className="co-avatar sm" aria-hidden="true">{initial(r.author?.name)}</span>
                  <div className="grow"><b>{r.author?.name} <span style={{ color: 'var(--star)' }} aria-label={`${r.stars} من 5`}>{'★'.repeat(r.stars)}</span></b><small>{r.comment}</small></div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
