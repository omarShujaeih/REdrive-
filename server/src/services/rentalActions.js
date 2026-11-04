import Rental from '../models/Rental.js';
import Car from '../models/Car.js';
import { refundFull, transferToCompany } from './payment.js';
import { notify } from './notify.js';
import { rules } from '../config.js';

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
  const freeUntil = new Date(rental.acceptedAt.getTime() + rules.freeCancelHoursAfterAccept * 3600000);
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

export async function expirePendingRentals() {
  const expired = await Rental.find({ status: 'pending', respondBy: { $lt: new Date() } });
  for (const r of expired) await rejectRental(r, { by: 'system' });
  return expired.length;
}

export { transferToCompany, refundFull };
