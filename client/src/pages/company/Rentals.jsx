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
      <PageTitle title="الحجوزات" sub="كل حجوزات سياراتك. الطلبات الجديدة بصفحة طلبات الإيجار." />
      <div className="chips" style={{ marginBottom: 16 }}>{TABS.map((t) => <button type="button" key={t.k} className={`chip ${tab === t.k ? 'on' : ''}`} onClick={() => setTab(t.k)}>{t.label} ({all.filter((r) => t.s.includes(r.status)).length})</button>)}</div>
      {loading ? <Loading /> : list.length === 0 ? <Empty title="ما في حجوزات هون" /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>رقم الحجز</th><th>السيارة</th><th>الزبون</th><th>المدة</th><th>المبلغ</th><th>الحالة</th><th /></tr></thead>
            <tbody>
              {list.map((r) => (
                <tr key={r._id}>
                  <td className="ltr">{r.code}</td><td>{carName(r.car)}</td><td>{r.renter.name}</td>
                  <td className="small">{fmtDateTime(r.startDate)}<br />← {fmtDateTime(r.endDate)}</td>
                  <td>{money(r.total)}</td><td><StatusBadge map={RENTAL_STATUS} value={r.status} /></td>
                  <td><Link to={`/company/rentals/${r._id}`}>التفاصيل</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
