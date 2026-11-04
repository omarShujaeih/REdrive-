import Rental from '../models/Rental.js';

const DAY = 86400000;
const dayKey = (d) => new Date(d).toISOString().slice(0, 10);

export const BLOCKING_STATUSES = ['confirmed', 'active'];

// Returns null when the car can be booked for [start, end), otherwise the reason.
export async function unavailableReason(car, start, end, ignoreRentalId) {
  if (car.status !== 'available') return 'السيارة مش متاحة';
  if (!(start < end)) return 'تاريخ التسليم لازم يكون بعد الاستلام';
  if (start < new Date(Date.now() - 3600000)) return 'ما بتقدر تحجز بتاريخ فات';
  if (start < car.availableFrom || end > new Date(car.availableTo.getTime() + DAY)) return 'التواريخ برا فترة توفر السيارة';
  const blocked = new Set(car.blockedDates.map(dayKey));
  for (let t = start.getTime(); t < end.getTime(); t += DAY) {
    if (blocked.has(dayKey(t))) return 'في أيام مسكّرة من الشركة ضمن المدة';
  }
  const clash = await Rental.exists({
    car: car._id, status: { $in: BLOCKING_STATUSES },
    startDate: { $lt: end }, endDate: { $gt: start },
    ...(ignoreRentalId ? { _id: { $ne: ignoreRentalId } } : {}),
  });
  return clash ? 'السيارة محجوزة بهالتواريخ' : null;
}

export function countDays(start, end) {
  return Math.max(1, Math.ceil((end - start) / DAY));
}
