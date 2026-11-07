import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { PageTitle } from '../../components/Layout.jsx';
import { Empty, Loading, StatusBadge, useLoad } from '../../components/ui.jsx';
import { RENTAL_STATUS, carName, fmtDateTime, money } from '../../labels.js';

const TABS = [
  { k: 'upcoming', label: 'القادمة', s: ['confirmed'] },
  { k: 'active', label: 'الجارية', s: ['active'] },
  { k: 'past', label: 'المكتملة', s: ['completed'] },
  { k: 'closed', label: 'الملغية والمرفوضة', s: ['cancelled', 'rejected', 'no_show'] },
];

export default function Rentals() {
  const [tab, setTab] = useState('upcoming');
  const { data, loading } = useLoad(() => api('/rentals/mine'));
  const all = (data?.rentals || []).filter((r) => r.status !== 'pending');
  const list = all.filter((r) => TABS.find((t) => t.k === tab).s.includes(r.status));
  return (
    <>
      <PageTitle kicker="الحجوزات" title="الحجوزات" sub="كل حجوزات سياراتك. الطلبات الجديدة بصفحة طلبات الإيجار." />
      <div className="tabs" role="tablist" aria-label="تصنيف الحجوزات" style={{ marginBottom: 16 }}>
        {TABS.map((t) => (
          <button type="button" role="tab" key={t.k} aria-selected={tab === t.k} onClick={() => setTab(t.k)}>
            {t.label}<span className="n">{all.filter((r) => t.s.includes(r.status)).length}</span>
          </button>
        ))}
      </div>
      {loading ? <Loading /> : list.length === 0 ? <Empty icon="calendar" title="ما في حجوزات هون" text="لما تقبل طلب إيجار، بيظهر الحجز هون." /> : (
        <div className="table-wrap" role="tabpanel">
          <table className="table stack">
            <thead><tr><th>رقم الحجز</th><th>السيارة</th><th>الزبون</th><th>المدة</th><th>المبلغ</th><th>الحالة</th><th><span className="sr-only">التفاصيل</span></th></tr></thead>
            <tbody>
              {list.map((r) => (
                <tr key={r._id}>
                  <td data-label="رقم الحجز" className="ltr">{r.code}</td>
                  <td data-label="السيارة"><b>{carName(r.car)}</b></td>
                  <td data-label="الزبون">{r.renter.name}</td>
                  <td data-label="المدة" className="small">{fmtDateTime(r.startDate)}<br />← {fmtDateTime(r.endDate)}</td>
                  <td data-label="المبلغ">{money(r.total)}</td>
                  <td data-label="الحالة"><StatusBadge map={RENTAL_STATUS} value={r.status} /></td>
                  <td><Link className="btn secondary sm" to={`/company/rentals/${r._id}`}>التفاصيل</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
