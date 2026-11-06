import Rental from '../models/Rental.js';
import Car from '../models/Car.js';
import Payment from '../models/Payment.js';
import { refundFull, refundPayment, transferToCompany } from './payment.js';
import { notify } from './notify.js';
import { rules } from '../config.js';

const HOUR = 3600000;
const DAY = 24 * HOUR;
const carName = (car) => `${car.brand} ${car.model} ${car.year}`;

export async function rejectRental(rental, { reason, by = 'company' } = {}) {
  rental.status = 'rejected';
  rental.rejectionReason = reason;
  rental.cancelledBy = by;
  await rental.save();
  await refundFull(rental._id);
  const car = await Car.findById(rental.car);
  await notify(rental.renter, {
    type: 'rental', email: true, link: `/rentals/${rental._id}`,
    title: by === 'system' ? 'انرفض طلبك تلقائياً' : 'الشركة رفضت طلب الحجز',
    body: `${carName(car)} · ${by === 'system' ? 'الشركة ما ردّت خلال 12 ساعة.' : (reason || '')} رجعلك المبلغ كامل (₪${rental.total}).`,
  });
}

// Free cancellation before acceptance and during the first hours after it; otherwise a share is retained.
export function cancellationTerms(rental, now = new Date()) {
  if (rental.status === 'pending') return { free: true, chargeRate: 0 };
  const freeUntil = new Date(rental.acceptedAt.getTime() + rules.freeCancelHoursAfterAccept * HOUR);
  const free = now <= freeUntil;
  return { free, freeUntil, chargeRate: free ? 0 : rules.lateCancelChargeRate };
}

export async function cancelByRenter(rental) {
  const terms = cancellationTerms(rental);
  rental.status = 'cancelled';
  rental.cancelledBy = 'renter';
  rental.cancelledAt = new Date();
  await rental.save();
  if (terms.free) await refundFull(rental._id);
  else await transferToCompany(rental._id, terms.chargeRate);
  await notify(rental.company, {
    type: 'rental', email: true, link: `/company/rentals/${rental._id}`,
    title: `المستأجر لغى الحجز ${rental.code}`,
    body: terms.free ? 'الإلغاء كان مجاني.' : `انخصم ${terms.chargeRate * 100}% من المبلغ لصالحك.`,
  });
  return terms;
}

// Late return: within the grace period it is free; after it, every started 24h of lateness costs a full day.
export function lateTerms(rental, returnedAt = new Date()) {
  const lateMs = new Date(returnedAt) - new Date(rental.endDate);
  const lateDays = lateMs > rules.lateGraceHours * HOUR ? Math.ceil(lateMs / DAY) : 0;
  return {
    lateMinutes: Math.max(0, Math.round(lateMs / 60000)),
    lateDays,
    fee: lateDays * rental.dailyPrice,
    graceUntil: new Date(new Date(rental.endDate).getTime() + rules.lateGraceHours * HOUR),
  };
}

// Extensions: only while the renter has the car, and only until a set time before the return.
export function extensionTerms(rental, now = new Date()) {
  const deadline = new Date(new Date(rental.endDate).getTime() - rules.extensionMinHoursBefore * HOUR);
  const pending = (rental.extensions || []).find((e) => e.status === 'pending') || null;
  let reason = '';
  if (rental.status !== 'active') reason = 'بتقدر تطلب تمديد بعد ما تستلم السيارة.';
  else if (pending) reason = 'عندك طلب تمديد لسا بستنى رد الشركة.';
  else if (now > deadline) reason = `فات وقت طلب التمديد: لازم ينطلب قبل موعد التسليم بـ${rules.extensionMinHoursBefore} ساعة على الأقل.`;
  return { allowed: !reason, reason, deadline, pending, minHoursBefore: rules.extensionMinHoursBefore };
}

// Refund the held payment of an extension that did not go through.
export async function closeExtension(rental, ext, { status, reason }) {
  ext.status = status;
  ext.reason = reason;
  ext.respondedAt = new Date();
  await rental.save();
  await refundPayment(await Payment.findOne({ rental: rental._id, kind: 'extension', extension: ext._id }));
}

export async function expirePendingRentals() {
  const now = new Date();
  const expired = await Rental.find({ status: 'pending', respondBy: { $lt: now } });
  for (const r of expired) await rejectRental(r, { by: 'system' });

  const withStale = await Rental.find({ extensions: { $elemMatch: { status: 'pending', respondBy: { $lt: now } } } });
  for (const r of withStale) {
    for (const ext of r.extensions.filter((e) => e.status === 'pending' && e.respondBy < now)) {
      await closeExtension(r, ext, { status: 'expired', reason: 'الشركة ما ردّت بالوقت' });
      await notify(r.renter, {
        type: 'rental', email: true, link: `/rentals/${r._id}`,
        title: 'طلب التمديد انتهى بدون رد', body: `الشركة ما ردّت، فرجعلك ₪${ext.amount}. موعد التسليم بضل زي ما هو.`,
      });
    }
  }
  return expired.length;
}

export { transferToCompany, refundFull };
