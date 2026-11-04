import crypto from 'node:crypto';
import Stripe from 'stripe';
import Payment from '../models/Payment.js';
import { config, rules } from '../config.js';

const stripe = config.stripeSecretKey ? new Stripe(config.stripeSecretKey) : null;
export const paymentMode = stripe ? 'stripe' : 'sim';

const round = (n) => Math.round(n * 100) / 100;
const agorot = (ils) => Math.round(ils * 100);

// Step 1 (Stripe only): create a PaymentIntent that the browser confirms with the card form.
export async function createPaymentIntent({ amount, renterId, carId, startDate, endDate }) {
  if (!stripe) return { mode: 'sim' };
  const intent = await stripe.paymentIntents.create({
    amount: agorot(amount),
    currency: 'ils',
    payment_method_types: ['card'],
    metadata: { renterId: String(renterId), carId: String(carId), startDate: startDate.toISOString(), endDate: endDate.toISOString() },
  });
  return { mode: 'stripe', clientSecret: intent.client_secret, paymentIntentId: intent.id };
}

// Step 2: make sure the money was taken before the request is sent to the company.
async function charge({ rental, card, paymentIntentId }) {
  if (stripe) {
    const intent = paymentIntentId && await stripe.paymentIntents.retrieve(paymentIntentId);
    const valid = intent
      && intent.status === 'succeeded'
      && intent.amount === agorot(rental.total)
      && intent.metadata.renterId === String(rental.renter)
      && intent.metadata.carId === String(rental.car);
    if (!valid) {
      const err = new Error('ما تمّت عملية الدفع');
      err.status = 402;
      throw err;
    }
    if (await Payment.exists({ gatewayRef: intent.id })) {
      const err = new Error('هالدفعة مستخدمة لحجز ثاني');
      err.status = 409;
      throw err;
    }
    return intent.id;
  }
  // Sandbox simulation (no gateway keys configured)
  const digits = String(card?.number || '').replace(/\s/g, '');
  if (digits.length < 12 || digits.endsWith('0002')) {
    const err = new Error('رفض البنك العملية');
    err.status = 402;
    throw err;
  }
  return `sim_${crypto.randomBytes(6).toString('hex')}`;
}

async function gatewayRefund(ref, amount) {
  if (stripe && ref.startsWith('pi_') && amount > 0) {
    await stripe.refunds.create({ payment_intent: ref, amount: agorot(amount) });
  }
}

// Payouts to companies need Stripe Connect accounts for each company; until then the
// transfer is recorded here and settled manually from the platform balance.
async function gatewayTransfer() {}

export async function holdPayment({ rental, card, paymentIntentId }) {
  const ref = await charge({ rental, card, paymentIntentId });
  return Payment.create({
    rental: rental._id, renter: rental.renter, company: rental.company,
    amount: rental.total, gatewayRef: ref, status: 'held',
  });
}

// Used when the payment succeeded but the rental could not be saved.
export async function refundPaymentRef(ref, amount) {
  await gatewayRefund(ref, amount);
}

export async function refundFull(rentalId) {
  const p = await Payment.findOne({ rental: rentalId, status: 'held' });
  if (!p) return null;
  await gatewayRefund(p.gatewayRef, p.amount);
  Object.assign(p, { status: 'refunded', refundAmount: p.amount, refundedAt: new Date() });
  return p.save();
}

// Company receives its share minus the platform commission; the rest is refunded to the renter.
export async function transferToCompany(rentalId, share = 1) {
  const p = await Payment.findOne({ rental: rentalId, status: 'held' });
  if (!p) return null;
  const companyGross = round(p.amount * share);
  const commission = round(companyGross * rules.commissionRate);
  const refund = round(p.amount - companyGross);
  await gatewayRefund(p.gatewayRef, refund);
  await gatewayTransfer(p.gatewayRef, companyGross - commission);
  Object.assign(p, {
    status: refund > 0 ? 'partially_refunded' : 'transferred',
    refundAmount: refund,
    commission,
    transferAmount: round(companyGross - commission),
    transferredAt: new Date(),
    refundedAt: refund > 0 ? new Date() : undefined,
  });
  return p.save();
}
