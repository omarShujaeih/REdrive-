import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import { PageTitle } from '../../components/Layout.jsx';
import { Loading, useLoad } from '../../components/ui.jsx';
import { fmtDateTime, money, timeLeft } from '../../labels.js';

export default function Dashboard() {
  const { user } = useAuth();
  const { data, loading } = useLoad(() => api('/company/dashboard'));
  if (loading) return <Loading />;
  const count = (s) => data.cars.find((c) => c._id === s)?.n || 0;
  const max = Math.max(1, ...data.monthly.map((m) => m.net));
  return (
    <>
      <PageTitle title={`أهلاً، ${user.name}`} sub={`عندك ${data.pending.length} طلبات بتستنى ردّك`}>
        <Link className="btn" to="/company/cars/new">أضف سيارة</Link>
      </PageTitle>
      <div className="grid stats" style={{ marginBottom: 20 }}>
        <div className="stat"><span className="muted small">متاحة</span><div className="v">{count('available')}</div></div>
        <div className="stat"><span className="muted small">مؤجّرة هلأ</span><div className="v">{data.rentedNow}</div></div>
        <div className="stat"><span className="muted small">بانتظار اعتماد الإدارة</span><div className="v">{count('pending')}</div></div>
        <div className="stat"><span className="muted small">صافي الأرباح (6 شهور)</span><div className="v">{money(data.monthly.reduce((s, m) => s + m.net, 0))}</div></div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        <section className="card col">
          <div className="row between"><h3>طلبات بتستنى ردّك</h3><Link to="/company/requests">كل الطلبات</Link></div>
          {data.pending.length === 0 && <span className="muted">ما في طلبات جديدة.</span>}
          {data.pending.map((r) => (
            <div key={r._id} className="row between">
              <div className="col" style={{ gap: 0 }}><b className="small">{r.renter.name} · {r.car.brand} {r.car.model}</b><span className="muted small">{money(r.total)} · {timeLeft(r.respondBy)}</span></div>
              <Link className="btn sm" to="/company/requests">رد على الطلب</Link>
            </div>
          ))}
        </section>
        <section className="card col">
          <h3>مواعيد اليوم</h3>
          {data.today.length === 0 && <span className="muted">ما في استلام أو تسليم اليوم.</span>}
          {data.today.map((r) => (
            <Link key={r._id} to={`/company/rentals/${r._id}`} className="card soft col" style={{ gap: 2, color: 'var(--ink)', padding: 12 }}>
              <b className="small">{r.status === 'confirmed' ? `استلام · ${fmtDateTime(r.startDate)}` : `تسليم · ${fmtDateTime(r.endDate)}`}</b>
              <span className="small">{r.car.brand} {r.car.model} · {r.renter.name}</span>
              <span className="muted small">{r.status === 'confirmed' ? 'تأكد من الهوية والرخصة، ووقّع العقد مع الزبون' : 'أكّد الإرجاع، وقيّم الزبون'}</span>
            </Link>
          ))}
        </section>
        <section className="card col">
          <h3>صافي الأرباح الشهري</h3>
          {data.monthly.length === 0 ? <span className="muted">لسا ما في تحويلات.</span> : (
            <div className="row" style={{ alignItems: 'flex-end', height: 160, gap: 10, flexWrap: 'nowrap' }}>
              {data.monthly.map((m) => (
                <div key={m._id} className="col grow" style={{ alignItems: 'center', gap: 4 }}>
                  <span className="small">{money(m.net)}</span>
                  <div style={{ width: '100%', maxWidth: 40, height: `${(m.net / max) * 110}px`, background: 'var(--blue)', borderRadius: '6px 6px 0 0' }} />
                  <span className="muted small ltr">{m._id.slice(5)}/{m._id.slice(2, 4)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
