import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Empty, Loading, useLoad } from '../components/ui.jsx';
import { fmtDateTime } from '../labels.js';

export default function Notifications() {
  const { setUnread, user } = useAuth();
  const { data, loading, reload } = useLoad(() => api('/notifications'));
  useEffect(() => { if (data) setUnread(data.unread); }, [data, setUnread]);
  const readAll = async () => { await api('/notifications/read-all', { method: 'POST' }); reload(); };
  const list = data?.notifications || [];
  return (
    <main className="container col" style={{ gap: 20, maxWidth: 800 }}>
      {user.role !== 'renter' && <Link to={user.role === 'admin' ? '/admin' : '/company'}>‹ لوحة التحكم</Link>}
      <div className="row between">
        <div className="col" style={{ gap: 2 }}><h1>الإشعارات</h1><span className="muted">{data?.unread || 0} غير مقروءة</span></div>
        {data?.unread > 0 && <button type="button" className="btn secondary sm" onClick={readAll}>علّم الكل كمقروء</button>}
      </div>
      {loading ? <Loading /> : list.length === 0 ? <Empty title="ما في إشعارات" text="أي تحديث جديد بيطلع هون، وبيوصلك كمان على الإيميل." /> : (
        <div className="col" style={{ gap: 8 }}>
          {list.map((n) => (
            <Link key={n._id} to={n.link || '#'} onClick={() => !n.read && api(`/notifications/${n._id}/read`, { method: 'POST' })} className="card row" style={{ color: 'var(--ink)', background: n.read ? '#fff' : 'var(--blue-soft)', padding: 14 }}>
              <div className="col grow" style={{ gap: 2 }}><b>{n.title}</b>{n.body && <span className="small">{n.body}</span>}<span className="muted small">{fmtDateTime(n.createdAt)}</span></div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
