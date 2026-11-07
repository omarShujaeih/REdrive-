import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useLiveRefresh } from '../auth.jsx';
import { CancelModal, RenterReviewModal, canRenterCancel } from '../components/RentalActions.jsx';
import { CarImage, Empty, ErrorBox, Icon, Loading, PageHead, StatusBadge, useLoad } from '../components/ui.jsx';
import { RENTAL_STATUS, carName, daysWord, fmtDateTime, money } from '../labels.js';

const TABS = [
  { k: 'current', label: 'الحالية', s: ['pending', 'confirmed', 'active'], empty: 'ما عندك حجوزات حالية' },
  { k: 'past', label: 'السابقة', s: ['completed'], empty: 'لسا ما خلّصت أي رحلة' },
  { k: 'cancelled', label: 'الملغية والمرفوضة', s: ['cancelled', 'rejected', 'no_show'], empty: 'ما في حجوزات ملغية أو مرفوضة' },
];

export default function MyRentals() {
  const [tab, setTab] = useState('current');
  const [cancel, setCancel] = useState(null);
  const [review, setReview] = useState(null);
  const { data, loading, error, reload, refresh } = useLoad(() => api('/rentals/mine'));
  useLiveRefresh(refresh, ['rental', 'payment']);
  const all = data?.rentals || [];
  const current = TABS.find((t) => t.k === tab);
  const list = all.filter((r) => current.s.includes(r.status));

  return (
    <main>
      <div className="page-band">
        <div className="container">
          <PageHead crumbs={[['/', 'الرئيسية'], [null, 'حجوزاتي']]} kicker="حسابي" title="حجوزاتي" sub="تابع حالة حجوزاتك، والغِ أو قيّم رحلاتك من هون.">
            <Link className="btn secondary sm" to="/search"><Icon name="search" size={18} />احجز سيارة</Link>
          </PageHead>
        </div>
      </div>

      <div className="container page-body">
        <div className="tabs" role="tablist" aria-label="تصنيف الحجوزات">
          {TABS.map((t) => (
            <button type="button" role="tab" key={t.k} aria-selected={tab === t.k} onClick={() => setTab(t.k)}>
              {t.label}<span className="n">{all.filter((r) => t.s.includes(r.status)).length}</span>
            </button>
          ))}
        </div>
        <ErrorBox error={error} />
        {loading ? <Loading /> : list.length === 0 ? (
          <Empty icon="calendar" title={current.empty} text="لما تحجز سيارة، بتلاقي الحجز هون مع كل تحديثاته." action={<Link className="btn" to="/search">دوّر على سيارة</Link>} />
        ) : (
          <div className="rental-list" role="tabpanel">
            {list.map((r) => (
              <article key={r._id} className="panel rental-row">
                <Link to={`/rentals/${r._id}`} className="thumb" tabIndex={-1} aria-hidden="true"><CarImage car={r.car} alt="" /></Link>
                <div className="col" style={{ gap: 6, minWidth: 0 }}>
                  <div className="rr-top"><StatusBadge map={RENTAL_STATUS} value={r.status} /><span className="muted small ltr">{r.code}</span></div>
                  <h3><Link to={`/rentals/${r._id}`}>{carName(r.car)}</Link></h3>
                  <div className="rr-meta">
                    <span><Icon name="building" size={15} />{r.company?.name}</span>
                    <span><Icon name="calendar" size={15} />{fmtDateTime(r.startDate)} ← {fmtDateTime(r.endDate)}</span>
                    <span><Icon name="clock" size={15} />{daysWord(r.days)} · {money(r.total)}</span>
                  </div>
                </div>
                <div className="rr-actions">
                  <Link className="btn secondary sm" to={`/rentals/${r._id}`}>التفاصيل</Link>
                  {canRenterCancel(r) && <button type="button" className="btn danger outline sm" onClick={() => setCancel(r)}>إلغاء الحجز</button>}
                  {r.status === 'completed' && !r.renterReviewed && <button type="button" className="btn sm" onClick={() => setReview(r)}>قيّم الرحلة</button>}
                  {r.renterReviewed && <span className="badge green"><Icon name="check" size={14} />قيّمتها</span>}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
      {cancel && <CancelModal rental={cancel} onClose={() => setCancel(null)} onDone={() => { setCancel(null); reload(); }} />}
      {review && <RenterReviewModal rental={review} onClose={() => setReview(null)} onDone={() => { setReview(null); reload(); }} />}
    </main>
  );
}
