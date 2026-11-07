import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { CardElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js';
import { api } from '../api.js';
import { ErrorBox } from './ui.jsx';
import { money } from '../labels.js';

const KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = KEY ? loadStripe(KEY, { locale: 'ar' }) : null;

// Stripe card form, shared by the booking, extension and late-fee payments.
// intentPath + intentBody ask the server for a PaymentIntent of the right amount; once the card is
// confirmed, onConfirmed(paymentIntentId) finishes the action (send the booking, the extension, pay the fee).
function Form({ intentPath, intentBody, total, label, disabled = false, onConfirmed, onCancel, cancelLabel = 'تراجع' }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pay = async (e) => {
    e.preventDefault();
    if (!stripe || !elements || disabled) return;
    setBusy(true); setError('');
    try {
      const { clientSecret, paymentIntentId } = await api(intentPath, { method: 'POST', body: intentBody });
      const result = await stripe.confirmCardPayment(clientSecret, { payment_method: { card: elements.getElement(CardElement) } });
      if (result.error) throw new Error(`ما تمّت عملية الدفع: ${result.error.message}`);
      await onConfirmed(paymentIntentId);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <form className="col" style={{ gap: 14 }} onSubmit={pay}>
      <ErrorBox error={error} />
      <div className="input stripe-card">
        <CardElement options={{ hidePostalCode: true, style: { base: { fontSize: '16px', color: '#0F1A2E' } } }} />
      </div>
      <span className="muted small">وضع الاختبار (Stripe Test): استعمل البطاقة 4242 4242 4242 4242 بأي تاريخ مستقبلي وأي CVV.</span>
      <div className="row">
        <button type="submit" className="btn" disabled={busy || disabled || !stripe}>{busy ? 'عم نتأكد من الدفع…' : label || `ادفع ${money(total)}`}</button>
        {onCancel && <button type="button" className="btn secondary" onClick={onCancel}>{cancelLabel}</button>}
      </div>
    </form>
  );
}

export default function StripePay(props) {
  if (!stripePromise) return <div className="alert red">الدفع عبر Stripe مفعّل بالسيرفر، بس ناقص VITE_STRIPE_PUBLISHABLE_KEY بملف client/.env.</div>;
  return <Elements stripe={stripePromise}><Form {...props} /></Elements>;
}
