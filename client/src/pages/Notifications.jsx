import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Empty, Icon, Loading, PageHead, useLoad } from '../components/ui.jsx';
import { fmtDateTime } from '../labels.js';

const TYPE_ICON = { rental: 'calendar', account: 'shield', car: 'key', payment: 'card' };

export default function Notifications() {
  const { setUnread, user } = useAuth();
  const { data, loading, reload } = useLoad(() => api('/notifications'));
  useEffect(() => { if (data) setUnread(data.unread); }, [data, setUnread]);
  const readAll = async () => { await api('/notifications/read-all', { method: 'POST' }); reload(); };
  const list = data?.notifications || [];
  const home = user.role === 'admin' ? ['/admin', 'لوحة التحكم'] : user.role === 'company' ? ['/company', 'لوحة التحكم'] : ['/', 'الرئيسية'];

  return (
    <main>
      <div className="page-band">
        <div className="container">
          <PageHead crumbs={[home, [null, 'الإشعارات']]} kicker="حسابي" title="الإشعارات" sub={data?.unread ? `${data.unread} غير مقروءة` : 'كل تحديثات حجوزاتك وحسابك بمكان واحد.'}>
            {data?.unread > 0 && <button type="button" className="btn secondary sm" onClick={readAll}><Icon name="check" size={18} />علّم الكل كمقروء</button>}
          </PageHead>
        </div>
      </div>
      <div className="container page-body">
        <div className="narrow-col">
          {loading ? <Loading /> : list.length === 0 ? (
            <Empty icon="bell" title="ما في إشعارات" text="أي تحديث جديد بيطلع هون، وبيوصلك كمان على الإيميل." />
          ) : (
            <div className="notif-list">
              {list.map((n) => (
                <Link key={n._id} to={n.link || '#'} onClick={() => !n.read && api(`/notifications/${n._id}/read`, { method: 'POST' })} className={`notif${n.read ? '' : ' unread'}`}>
                  <span className={`ic-tile ${n.read ? 'soft' : ''}`}><Icon name={TYPE_ICON[n.type] || 'bell'} size={18} /></span>
                  <span className="copy">
                    <b>{n.title}</b>
                    {n.body && <p>{n.body}</p>}
                    <time dateTime={n.createdAt}>{fmtDateTime(n.createdAt)}</time>
                  </span>
                  {!n.read && <span className="unread-dot" aria-label="جديد" />}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
