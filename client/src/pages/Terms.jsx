import { TermsContent, usePolicies } from '../components/Policies.jsx';

export default function Terms() {
  const p = usePolicies();
  return (
    <main className="container terms-page col" style={{ gap: 24 }}>
      <div className="col" style={{ gap: 6 }}>
        <span className="kicker">نسخة <span className="ltr">{p.termsVersion}</span></span>
        <h1>الشروط والسياسات</h1>
        <p className="muted">هاي الشروط اللي بتوافق عليها لما تحجز سيارة على Redrive.</p>
      </div>
      <TermsContent p={p} />
    </main>
  );
}
