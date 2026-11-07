import { api } from '../../api.js';
import { PageTitle } from '../../components/Layout.jsx';
import { ErrorBox, Icon, Loading, StatTile, useLoad } from '../../components/ui.jsx';
import { fmtDate, initial, money } from '../../labels.js';

export default function AdminDashboard() {
  const { data: d, loading, error } = useLoad(() => api('/admin/dashboard'));
  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  const tasks = d.pendingUsers + d.pendingCars;
  return (
    <>
      <PageTitle kicker="الإدارة" title="نظرة عامة" sub={tasks ? `${tasks} مهام بتستنى قرارك.` : 'ما في مهام بتستنى قرارك هلأ.'} />

      <h2 style={{ fontSize: 18, color: 'var(--navy)', marginBottom: 12 }}>بتستنى قرارك</h2>
      <div className="grid stats" style={{ marginBottom: 24 }}>
        <StatTile icon="shield" label="حسابات بانتظار التوثيق" value={d.pendingUsers} tone={d.pendingUsers ? 'warn' : ''} to="/admin/verify" sub="راجع الوثائق ووثّق أو ارفض" />
        <StatTile icon="car" label="سيارات بانتظار الاعتماد" value={d.pendingCars} tone={d.pendingCars ? 'warn' : ''} to="/admin/cars" sub="السيارة بتظهر بالبحث بعد اعتمادها" />
        <StatTile icon="alert" label="حسابات تقييمها أقل من 3" value={d.lowRated} tone={d.lowRated ? 'bad' : ''} to="/admin/users" sub="راقبها، وبتقدر تحظرها" />
      </div>

      <h2 style={{ fontSize: 18, color: 'var(--navy)', marginBottom: 12 }}>المنصة</h2>
      <div className="grid stats" style={{ marginBottom: 24 }}>
        <StatTile icon="users" label="المستأجرين" value={d.renters} />
        <StatTile icon="building" label="الشركات" value={d.companies} />
        <StatTile icon="car" label="السيارات المعروضة" value={d.cars} />
        <StatTile icon="calendar" label="حجوزات جارية ومؤكدة" value={d.activeRentals} tone="good" />
        <StatTile icon="chart" label="عمولات الشهر" value={money(d.monthCommission)} />
      </div>

      <section className="panel" aria-labelledby="low-title">
        <h2 id="low-title" className="panel-title"><span className="ic-tile sm bad"><Icon name="star" size={16} /></span>آخر التقييمات المنخفضة</h2>
        {d.recentReviews.length === 0 ? <span className="muted">ما في تقييمات منخفضة.</span> : (
          <div className="list-rows">
            {d.recentReviews.map((r) => (
              <div key={r._id} className="list-row" style={{ alignItems: 'flex-start' }}>
                <span className="avatar" aria-hidden="true">{initial(r.author?.name)}</span>
                <div className="grow">
                  <b>{r.author?.name} <span style={{ color: 'var(--star)' }} aria-label={`${r.stars} من 5`}>{'★'.repeat(r.stars)}</span> <span className="muted small">{r.targetUser ? `لـ ${r.targetUser.name}` : 'لسيارة'}</span></b>
                  <small>«{r.comment}» · {fmtDate(r.createdAt)}</small>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
