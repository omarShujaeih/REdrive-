import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import { PageTitle } from '../../components/Layout.jsx';
import { ErrorBox, Icon, Loading, StatTile, useLoad } from '../../components/ui.jsx';
import { fmtDateTime, initial, money, timeLeft } from '../../labels.js';

export default function Dashboard() {
  const { user } = useAuth();
  const { data, loading, error } = useLoad(() => api('/company/dashboard'));
  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  const count = (s) => data.cars.find((c) => c._id === s)?.n || 0;
  const max = Math.max(1, ...data.monthly.map((m) => m.net));
  const net = data.monthly.reduce((s, m) => s + m.net, 0);
  const waiting = count('pending');

  return (
    <>
      <PageTitle kicker="لوحة التحكم" title={`أهلاً، ${user.name}`} sub={data.pending.length ? `عندك ${data.pending.length} طلبات بتستنى ردّك.` : 'ما في طلبات بتستنى ردّك هلأ.'}>
        <Link className="btn" to="/company/cars/new"><Icon name="plus" size={18} />أضف سيارة</Link>
      </PageTitle>

      <div className="grid stats" style={{ marginBottom: 20 }}>
        <StatTile icon="car" label="سيارات معروضة" value={count('available')} to="/company/cars" />
        <StatTile icon="key" label="مؤجّرة هلأ" value={data.rentedNow} tone="good" to="/company/rentals" />
        <StatTile icon="clock" label="بانتظار اعتماد الإدارة" value={waiting} tone={waiting ? 'warn' : ''} />
        <StatTile icon="chart" label="صافي الأرباح (6 شهور)" value={money(net)} to="/company/finance" />
      </div>

      <div className="dash-grid">
        <section className="panel" aria-labelledby="req-title">
          <div className="panel-head">
            <h2 id="req-title" className="panel-title"><span className="ic-tile sm"><Icon name="inbox" size={16} /></span>طلبات بتستنى ردّك</h2>
            <Link to="/company/requests" className="small">كل الطلبات</Link>
          </div>
          {data.pending.length === 0 ? <span className="muted">ما في طلبات جديدة. أي طلب جديد بيوصلك إشعار فيه.</span> : (
            <div className="list-rows">
              {data.pending.map((r) => (
                <div key={r._id} className="list-row">
                  <span className="avatar" aria-hidden="true">{initial(r.renter.name)}</span>
                  <div className="grow"><b>{r.renter.name} · {r.car.brand} {r.car.model}</b><small>{money(r.total)} · {timeLeft(r.respondBy)}</small></div>
                  <Link className="btn sm" to="/company/requests">رد</Link>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="panel" aria-labelledby="today-title">
          <h2 id="today-title" className="panel-title"><span className="ic-tile sm"><Icon name="calendar" size={16} /></span>مواعيد اليوم</h2>
          {data.today.length === 0 ? <span className="muted">ما في استلام أو تسليم اليوم.</span> : (
            <div className="list-rows">
              {data.today.map((r) => (
                <Link key={r._id} to={`/company/rentals/${r._id}`} className="list-row">
                  <span className={`ic-tile sm ${r.status === 'confirmed' ? 'soft' : 'good'}`}><Icon name={r.status === 'confirmed' ? 'key' : 'car'} size={16} /></span>
                  <div className="grow">
                    <b>{r.status === 'confirmed' ? `استلام · ${fmtDateTime(r.startDate)}` : `تسليم · ${fmtDateTime(r.endDate)}`}</b>
                    <small>{r.car.brand} {r.car.model} · {r.renter.name}</small>
                    <small>{r.status === 'confirmed' ? 'تأكد من الهوية والرخصة، ووقّع العقد مع الزبون.' : 'أكّد الإرجاع، وقيّم الزبون.'}</small>
                  </div>
                  <Icon name="arrowLeft" size={18} />
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="panel" aria-labelledby="net-title">
          <h2 id="net-title" className="panel-title"><span className="ic-tile sm"><Icon name="chart" size={16} /></span>صافي الأرباح الشهري</h2>
          {data.monthly.length === 0 ? <span className="muted">لسا ما في تحويلات. الأرباح بتظهر هون بعد أول استلام.</span> : (
            <div className="bars" role="img" aria-label={data.monthly.map((m) => `${m._id}: ${money(m.net)}`).join('، ')}>
              {data.monthly.map((m) => (
                <div key={m._id} className="bar">
                  <b>{money(m.net)}</b>
                  <i style={{ height: `${Math.max(3, (m.net / max) * 100) * 1.3}px` }} />
                  <span className="ltr">{m._id.slice(5)}/{m._id.slice(2, 4)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
