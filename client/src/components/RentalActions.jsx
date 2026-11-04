import { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { ErrorBox, Field, Modal, StarInput } from './ui.jsx';
import { carName, money } from '../labels.js';

export function cancelTerms(r) {
  if (r.status === 'pending') return { free: true };
  const freeUntil = new Date(new Date(r.acceptedAt).getTime() + 6 * 3600000);
  return { free: Date.now() <= freeUntil, freeUntil };
}
export const canRenterCancel = (r) => r.status === 'pending' || (r.status === 'confirmed' && new Date(r.startDate) > new Date());

export function CancelModal({ rental, onClose, onDone }) {
  const { setToast } = useAuth();
  const [error, setError] = useState('');
  const t = cancelTerms(rental);
  const go = async () => {
    try { await api(`/rentals/${rental._id}/cancel`, { method: 'POST' }); setToast('انلغى الحجز'); onDone(); } catch (e) { setError(e.message); }
  };
  return (
    <Modal title={`تلغي حجز ${carName(rental.car)}؟`} onClose={onClose}>
      <span className="muted small ltr" style={{ textAlign: 'end' }}>{rental.code}</span>
      {t.free ? (
        <div className="alert green">الإلغاء مجاني، وبيرجعلك المبلغ كامل ({money(rental.total)}).</div>
      ) : (
        <div className="alert amber">فاتت فترة الإلغاء المجاني. بينخصم 60% ({money(rental.total * 0.6)}) وبيرجعلك {money(rental.total * 0.4)}.</div>
      )}
      <ErrorBox error={error} />
      <div className="row"><button type="button" className="btn danger" onClick={go}>ألغِ الحجز</button><button type="button" className="btn secondary" onClick={onClose}>تراجع</button></div>
    </Modal>
  );
}

export function RenterReviewModal({ rental, onClose, onDone }) {
  const { setToast } = useAuth();
  const [companyStars, setCompanyStars] = useState(0);
  const [carStars, setCarStars] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const send = async () => {
    try {
      await api(`/rentals/${rental._id}/review`, { method: 'POST', body: { companyStars, carStars, comment } });
      setToast('شكراً! انضاف تقييمك'); onDone();
    } catch (e) { setError(e.message); }
  };
  return (
    <Modal title="كيف كانت رحلتك؟" onClose={onClose}>
      <span className="muted small">{carName(rental.car)} · {rental.company?.name}. بتقدر تقيّم مرة وحدة بس.</span>
      <Field label="قيّم الشركة"><StarInput value={companyStars} onChange={setCompanyStars} label="تقييم الشركة" /></Field>
      <Field label="قيّم السيارة"><StarInput value={carStars} onChange={setCarStars} label="تقييم السيارة" /></Field>
      <Field label="تعليقك" hint="تقييمك بيظهر بصفحة السيارة والشركة."><textarea className="input" value={comment} onChange={(e) => setComment(e.target.value)} /></Field>
      <ErrorBox error={error} />
      <div className="row"><button type="button" className="btn" disabled={!companyStars || !carStars} onClick={send}>أرسل التقييم</button><button type="button" className="btn secondary" onClick={onClose}>بعدين</button></div>
    </Modal>
  );
}
