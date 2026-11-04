import { api } from '../../api.js';
import { PageTitle } from '../../components/Layout.jsx';
import { Loading, useLoad } from '../../components/ui.jsx';
import { fmtDate, money } from '../../labels.js';

export default function Finance() {
  const { data, loading } = useLoad(() => api('/company/finance'));
  if (loading) return <Loading />;
  const { payments, totals } = data;
  return (
    <>
      <PageTitle title="التقارير المالية" sub="عمولة المنصة 10% بتنخصم من حصتك، والباقي بيتحوّل لحسابك لما تأكد إنه الزبون استلم السيارة." />
      <div className="grid stats" style={{ marginBottom: 20 }}>
        <div className="stat"><span className="muted small">إجمالي الإيرادات</span><div className="v">{money(totals.gross)}</div></div>
        <div className="stat"><span className="muted small">عمولة المنصة</span><div className="v">{money(totals.fee)}</div></div>
        <div className="stat"><span className="muted small">صافي الربح</span><div className="v">{money(totals.net)}</div></div>
        <div className="stat"><span className="muted small">متوسط الربح لكل رحلة</span><div className="v">{money(totals.avg)}</div></div>
      </div>
      <h3 style={{ marginBottom: 10 }}>الأرباح لكل رحلة</h3>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>رقم الحجز</th><th>السيارة</th><th>المبلغ</th><th>العمولة</th><th>الصافي</th><th>التحويل</th></tr></thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p._id}>
                <td className="ltr">{p.rental?.code}</td>
                <td>{p.rental?.car?.brand} {p.rental?.car?.model}</td>
                <td>{money(p.amount - p.refundAmount)}</td>
                <td>{p.status === 'held' ? '—' : `−${money(p.commission)}`}</td>
                <td>{p.status === 'held' ? '—' : money(p.transferAmount)}</td>
                <td className="small">{p.status === 'held' ? 'بيتحوّل عند الاستلام' : `تحوّل ${fmtDate(p.transferredAt)}`}</td>
              </tr>
            ))}
            {payments.length === 0 && <tr><td colSpan={6} className="muted">لسا ما في رحلات.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
