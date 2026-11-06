import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Modal } from './ui.jsx';

// The numbers come from the API (/api/policies) so the terms always match the rules it enforces;
// these defaults only cover the first render and offline previews.
const DEFAULTS = {
  responseHours: 12, freeCancelHoursAfterAccept: 6, lateCancelChargeRate: 0.6, noShowGraceHours: 2,
  lateGraceHours: 1, extensionMinHoursBefore: 12, termsVersion: '2026-11',
};

export function usePolicies() {
  const [policies, setPolicies] = useState(DEFAULTS);
  useEffect(() => {
    let alive = true;
    api('/policies').then((p) => alive && setPolicies({ ...DEFAULTS, ...p })).catch(() => {});
    return () => { alive = false; };
  }, []);
  return policies;
}

const pct = (r) => `${Math.round(r * 100)}%`;

// Rental terms and policies, numbered sections with anchors (#booking, #cancel, ...).
export function TermsContent({ p }) {
  const sections = [
    ['booking', 'الحجز والدفع', [
      'بتدفع المبلغ كامل أونلاين وقت ما تبعت طلب الحجز، وبيضل محجوز عند بوابة الدفع لحد ما الشركة توافق.',
      `الشركة بترد خلال ${p.responseHours} ساعة. إذا رفضت أو ما ردّت، الطلب بينرفض وبيرجعلك المبلغ كامل.`,
      'المدة بتنحسب من ساعة الاستلام لساعة التسليم: كل 24 ساعة يوم، وأي جزء من يوم بينحسب يوم كامل.',
    ]],
    ['cancel', 'الإلغاء', [
      `الإلغاء مجاني قبل موافقة الشركة، ولأول ${p.freeCancelHoursAfterAccept} ساعات بعد موافقتها.`,
      `بعد هيك، إذا لغيت بينخصم ${pct(p.lateCancelChargeRate)} من المبلغ وبيرجعلك الباقي.`,
      'إذا الشركة لغت حجز مؤكد، بيرجعلك المبلغ كامل.',
    ]],
    ['pickup', 'الاستلام', [
      'بتستلم السيارة من فرع الشركة بالساعة اللي اخترتها، ومعك الهوية ورخصة السواقة اللي وثّقت فيهم حسابك.',
      'بتوقّع عقد الإيجار عند الشركة وقت الاستلام، والشركة بتشرحلك شروطها الخاصة بالسيارة.',
      `إذا ما وصلت خلال ${p.noShowGraceHours} ساعات من موعد الاستلام، الشركة بتسجّل عدم حضور وبينخصم ${pct(p.lateCancelChargeRate)}.`,
    ]],
    ['late', 'التسليم والتأخير', [
      'بترجّع السيارة على نفس الفرع بموعد التسليم.',
      `في ساعة سماح (${p.lateGraceHours === 1 ? 'ساعة وحدة' : `${p.lateGraceHours} ساعات`}) بعد موعد التسليم بدون أي رسوم.`,
      'بعد ساعة السماح، كل 24 ساعة تأخير أو جزء منها بتنحسب يوم كامل بسعر اليوم، والشركة بتسجّل وقت الإرجاع الفعلي.',
      'رسوم التأخير بتدفعها أونلاين من صفحة الحجز.',
    ]],
    ['extension', 'التمديد', [
      `بتقدر تطلب تمديد بعد ما تستلم السيارة، وقبل موعد التسليم بـ${p.extensionMinHoursBefore} ساعة على الأقل.`,
      'بتدفع فرق الأيام الإضافية وقت ما تبعت الطلب، وبيضل محجوز لحد ما الشركة ترد.',
      'إذا الشركة وافقت، بيتعدّل موعد التسليم. وإذا رفضت أو ما ردّت قبل موعد التسليم، بيرجعلك المبلغ كامل.',
    ]],
    ['reviews', 'التقييمات', [
      'بعد ما تخلص الرحلة بتقيّم الشركة والسيارة، والشركة بتقيّمك. التقييمات بتظهر بملفك وبتساعد الشركات تقرر.',
    ]],
    ['privacy', 'الخصوصية', [
      'الشركة بتشوف اسمك وتقييمك قبل ما توافق، وبتشوف رقم جوالك بس للحجوزات المؤكدة والجارية.',
      'وثائقك (الهوية ورخصة السواقة) بتراجعها إدارة المنصة بس، وما بتنعرض للعامة.',
    ]],
  ];
  return (
    <div className="terms">
      {sections.map(([id, title, items], i) => (
        <section key={id} id={id} aria-labelledby={`t-${id}`}>
          <h3 id={`t-${id}`}><span className="n">{i + 1}</span>{title}</h3>
          <ul>{items.map((t) => <li key={t}>{t}</li>)}</ul>
        </section>
      ))}
    </div>
  );
}

// Shown before payment: the renter reads the terms and agrees before the booking goes on.
export function TermsModal({ onAccept, onClose }) {
  const p = usePolicies();
  const [agree, setAgree] = useState(false);
  return (
    <Modal title="الشروط والسياسات" onClose={onClose} wide>
      <span className="muted small">اقرأ الشروط قبل ما تكمّل. موافقتك بتنحفظ مع الحجز (نسخة <span className="ltr">{p.termsVersion}</span>).</span>
      <div className="terms-scroll" tabIndex={0} aria-label="نص الشروط والسياسات"><TermsContent p={p} /></div>
      <label className="check">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <span>قرأت الشروط والسياسات وبوافق عليها</span>
      </label>
      <div className="row">
        <button type="button" className="btn" disabled={!agree} onClick={onAccept}>بوافق، كمّل للدفع</button>
        <button type="button" className="btn secondary" onClick={onClose}>تراجع</button>
      </div>
    </Modal>
  );
}
