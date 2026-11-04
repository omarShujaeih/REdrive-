import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { CardElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js';
import { api } from '../api.js';
import { ErrorBox } from './ui.jsx';
import { money } from '../labels.js';

const KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = KEY ? loadStripe(KEY, { locale: 'ar' }) : null;

function Form({ booking, total, onPaid }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pay = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true); setError('');
    try {
      const { clientSecret, paymentIntentId } = await api('/rentals/payment-intent', { method: 'POST', body: booking });
      const result = await stripe.confirmCardPayment(clientSecret, { payment_method: { card: elements.getElement(CardElement) } });
      if (result.error) throw new Error(`ما تمّت عملية الدفع: ${result.error.message}`);
      const r = await api('/rentals', { method: 'POST', body: { ...booking, paymentIntentId } });
      onPaid(r.rental);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <form className="col" onSubmit={pay}>
      <ErrorBox error={error} />
      <div className="input" style={{ display: 'flex', alignItems: 'center', direction: 'ltr' }}>
        <div style={{ width: '100%' }}><CardElement options={{ hidePostalCode: true, style: { base: { fontSize: '16px', color: '#0F1A2E' } } }} /></div>
      </div>
      <span className="muted small">وضع الاختبار (Stripe Test): استعمل البطاقة 4242 4242 4242 4242 بأي تاريخ مستقبلي وأي CVV.</span>
      <button className="btn" disabled={busy || !stripe}>{busy ? 'عم نتأكد من الدفع…' : `ادفع ${money(total)}`}</button>
    </form>
  );
}

export default function StripePay(props) {
  if (!stripePromise) return <div className="alert red">الدفع عبر Stripe مفعّل بالسيرفر، بس ناقص VITE_STRIPE_PUBLISHABLE_KEY بملف client/.env.</div>;
  return <Elements stripe={stripePromise}><Form {...props} /></Elements>;
}
