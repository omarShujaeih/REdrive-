import { api } from '../../api.js';
import { PageTitle } from '../../components/Layout.jsx';
import { Empty, ErrorBox, Loading, StatTile, useLoad } from '../../components/ui.jsx';
import { fmtDate, money } from '../../labels.js';

const KIND = { extension: 'تمديد', late_fee: 'رسوم تأخير' };

export default function Finance() {
  const { data, loading, error } = useLoad(() => api('/company/finance'));
  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  const { payments, totals } = data;
  return (
    <>
      <PageTitle kicker="المالية" title="التقارير المالية" sub="عمولة المنصة 10% بتنخصم من حصتك، والباقي بيتحوّل لحسابك لما تأكد إنه الزبون استلم السيارة." />
      <div className="grid stats" style={{ marginBottom: 20 }}>
        <StatTile icon="card" label="إجمالي الإيرادات" value={money(totals.gross)} />
        <StatTile icon="chart" label="عمولة المنصة" value={money(totals.fee)} tone="warn" />
        <StatTile icon="check" label="صافي الربح" value={money(totals.net)} tone="good" />
        <StatTile icon="car" label="متوسط الربح لكل رحلة" value={money(totals.avg)} />
      </div>
      <h2 style={{ fontSize: 18, color: 'var(--navy)', marginBottom: 12 }}>الأرباح لكل رحلة</h2>
      {payments.length === 0 ? <Empty icon="chart" title="لسا ما في رحلات" text="بعد أول استلام بتظهر الأرباح هون." /> : (
        <div className="table-wrap">
          <table className="table stack">
            <thead><tr><th>رقم الحجز</th><th>السيارة</th><th>المبلغ</th><th>العمولة</th><th>الصافي</th><th>التحويل</th></tr></thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p._id}>
                  <td data-label="رقم الحجز" className="ltr">{p.rental?.code}</td>
                  <td data-label="السيارة"><b>{p.rental?.car?.brand} {p.rental?.car?.model}</b>{KIND[p.kind] && <span className="badge" style={{ marginInlineStart: 6 }}>{KIND[p.kind]}</span>}</td>
                  <td data-label="المبلغ">{money(p.amount - p.refundAmount)}</td>
                  <td data-label="العمولة">{p.status === 'held' ? '—' : `−${money(p.commission)}`}</td>
                  <td data-label="الصافي"><b>{p.status === 'held' ? '—' : money(p.transferAmount)}</b></td>
                  <td data-label="التحويل" className="small">{p.status === 'held' ? <span className="badge status amber">بيتحوّل عند الاستلام</span> : `تحوّل ${fmtDate(p.transferredAt)}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
