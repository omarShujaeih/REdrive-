import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { PageTitle } from '../../components/Layout.jsx';
import { Loading, useLoad } from '../../components/ui.jsx';
import { fmtDate, money } from '../../labels.js';

export default function AdminDashboard() {
  const { data, loading } = useLoad(() => api('/admin/dashboard'));
  if (loading) return <Loading />;
  const d = data;
  return (
    <>
      <PageTitle title="نظرة عامة" sub={`${d.pendingUsers + d.pendingCars} مهام بتستنى قرارك`} />
      <div className="grid stats" style={{ marginBottom: 20 }}>
        <Link to="/admin/verify" className="stat" style={{ color: 'var(--ink)' }}><span className="muted small">حسابات بانتظار التوثيق</span><div className="v">{d.pendingUsers}</div></Link>
        <Link to="/admin/cars" className="stat" style={{ color: 'var(--ink)' }}><span className="muted small">سيارات بانتظار الاعتماد</span><div className="v">{d.pendingCars}</div></Link>
        <Link to="/admin/users" className="stat" style={{ color: 'var(--ink)' }}><span className="muted small">حسابات تقييمها أقل من 3</span><div className="v">{d.lowRated}</div></Link>
      </div>
      <div className="grid stats" style={{ marginBottom: 20 }}>
        <div className="stat"><span className="muted small">المستأجرين</span><div className="v">{d.renters}</div></div>
        <div className="stat"><span className="muted small">الشركات</span><div className="v">{d.companies}</div></div>
        <div className="stat"><span className="muted small">السيارات المعروضة</span><div className="v">{d.cars}</div></div>
        <div className="stat"><span className="muted small">حجوزات جارية ومؤكدة</span><div className="v">{d.activeRentals}</div></div>
        <div className="stat"><span className="muted small">عمولات الشهر</span><div className="v">{money(d.monthCommission)}</div></div>
      </div>
      <section className="card col">
        <h3>آخر التقييمات المنخفضة</h3>
        {d.recentReviews.length === 0 && <span className="muted">ما في تقييمات منخفضة.</span>}
        {d.recentReviews.map((r) => <div key={r._id} className="small">تقييم {r.stars}★ {r.targetUser ? `لـ"${r.targetUser.name}"` : 'لسيارة'} من {r.author?.name}: "{r.comment}" · <span className="muted">{fmtDate(r.createdAt)}</span></div>)}
      </section>
    </>
  );
}
