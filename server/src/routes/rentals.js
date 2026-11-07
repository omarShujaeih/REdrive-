import { Router } from 'express';
import mongoose from 'mongoose';
import Rental from '../models/Rental.js';
import Car from '../models/Car.js';
import Payment from '../models/Payment.js';
import Review from '../models/Review.js';
import User from '../models/User.js';
import { auth, requireRole, requireVerified } from '../middleware/auth.js';
import { wrap, httpError } from '../middleware/error.js';
import { unavailableReason, countDays } from '../services/availability.js';
import { closedReason } from '../services/hours.js';
import {
  createPaymentIntent, holdPayment, holdExtra, recordDue, payDue, settle, paymentMode, refundPaymentRef, releaseIntent,
} from '../services/payment.js';
import { notify } from '../services/notify.js';
import {
  rejectRental, cancelByRenter, cancellationTerms, transferToCompany, refundFull,
  lateTerms, extensionTerms, closeExtension,
} from '../services/rentalActions.js';
import { rules } from '../config.js';

const router = Router();
router.use(auth);

const populateAll = (q) => q
  .populate('car', 'brand model year photos city pickupLocation transmission fuel seats dailyPrice')
  .populate('company', 'name phone ratingAvg ratingCount company')
  .populate('renter', 'name phone ratingAvg ratingCount status createdAt city');

async function loadRental(req, roles = ['renter', 'company']) {
  const rental = await Rental.findById(req.params.id);
  if (!rental) throw httpError(404, 'الحجز مش موجود');
  const isRenter = String(rental.renter) === String(req.user._id);
  const isCompany = String(rental.company) === String(req.user._id);
  if (!((roles.includes('renter') && isRenter) || (roles.includes('company') && isCompany) || req.user.role === 'admin')) {
    throw httpError(403, 'ما عندك صلاحية');
  }
  return rental;
}

const carLabel = async (rental) => {
  const c = await Car.findById(rental.car).select('brand model year');
  return `${c.brand} ${c.model} ${c.year}`;
};

async function loadBookableCar({ carId, startDate, endDate }) {
  const car = await Car.findById(carId).populate('company', 'status company.hours');
  if (!car || car.company.status !== 'verified') throw httpError(404, 'السيارة مش موجودة');
  const start = new Date(startDate); const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw httpError(400, 'اختار وقت الاستلام والتسليم');
  const reason = await unavailableReason(car, start, end)
    || closedReason(car.company, start, 'الاستلام') || closedReason(car.company, end, 'التسليم');
  if (reason) throw httpError(409, reason);
  return { car, start, end, days: countDays(start, end) };
}

// Renter: start the payment (Stripe returns a client secret; sandbox mode needs nothing)
router.post('/payment-intent', requireRole('renter'), requireVerified, wrap(async (req, res) => {
  const { car, start, end, days } = await loadBookableCar(req.body);
  res.json(await createPaymentIntent({
    amount: days * car.dailyPrice, renterId: req.user._id, carId: car._id,
    metadata: { kind: 'booking', startDate: start.toISOString(), endDate: end.toISOString() },
  }));
}));

// With Stripe the card is charged in the browser before the request reaches us. If the request is then
// refused (dates taken meanwhile, request no longer allowed...), refund that card payment.
const refundIfRefused = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    await releaseIntent(req.body?.paymentIntentId, req.user._id).catch((e) => console.error('[payment] release:', e.message));
    throw err;
  }
};

router.get('/payment-mode', (req, res) => res.json({ mode: paymentMode }));

// Renter: request a rental after paying (amount is held until the company responds)
router.post('/', requireRole('renter'), requireVerified, wrap(refundIfRefused(async (req, res) => {
  const { card, paymentIntentId, acceptTerms } = req.body;
  if (!acceptTerms) throw httpError(400, 'لازم توافق على شروط الإيجار');
  const { car, start, end, days } = await loadBookableCar(req.body);
  const rental = new Rental({
    code: `RD-${String(new Date().getFullYear()).slice(2)}-${String(Date.now()).slice(-6)}`,
    renter: req.user._id, company: car.company._id, car: car._id,
    startDate: start, endDate: end, days, dailyPrice: car.dailyPrice, total: days * car.dailyPrice,
    respondBy: new Date(Date.now() + rules.responseHours * 3600000),
    termsAcceptedAt: new Date(), termsVersion: rules.termsVersion,
  });
  const payment = await holdPayment({ rental, card, paymentIntentId }); // throws 402 if declined → no rental is sent
  try {
    await rental.save();
  } catch (err) {
    await refundPaymentRef(payment.gatewayRef, payment.amount);
    await payment.deleteOne();
    throw err;
  }
  await notify(car.company._id, {
    type: 'rental', email: true, link: '/company/requests',
    title: 'طلب إيجار جديد', body: `${req.user.name} · ${car.brand} ${car.model} · ${days} أيام · رد خلال 12 ساعة`,
  });
  res.status(201).json({ rental });
})));

router.get('/mine', wrap(async (req, res) => {
  const key = req.user.role === 'company' ? 'company' : 'renter';
  const filter = { [key]: req.user._id };
  if (req.query.status) filter.status = { $in: String(req.query.status).split(',') };
  const rentals = await populateAll(Rental.find(filter).sort('-createdAt')).lean();
  res.json({ rentals });
}));

router.get('/:id', wrap(async (req, res) => {
  const rental = await loadRental(req);
  const [full, payments] = await Promise.all([
    populateAll(Rental.findById(rental._id)).lean(),
    Payment.find({ rental: rental._id }).sort('createdAt').lean(),
  ]);
  const payment = payments.find((p) => !['extension', 'late_fee'].includes(p.kind)) || null;
  const terms = ['pending', 'confirmed'].includes(full.status) ? cancellationTerms(rental) : null;
  res.json({
    rental: full,
    payment,
    extras: payments.filter((p) => ['extension', 'late_fee'].includes(p.kind)),
    cancellation: terms,
    extension: extensionTerms(rental),
    late: full.status === 'active' ? lateTerms(rental) : null,
    commissionRate: rules.commissionRate,
  });
}));

// Company: accept → confirmed; overlapping pending requests are rejected automatically
router.post('/:id/accept', requireRole('company'), wrap(async (req, res) => {
  const rental = await loadRental(req, ['company']);
  if (rental.status !== 'pending') throw httpError(409, 'الطلب مش قيد الانتظار');
  const car = await Car.findById(rental.car);
  const reason = await unavailableReason(car, rental.startDate, rental.endDate, rental._id);
  if (reason) throw httpError(409, reason);
  rental.status = 'confirmed';
  rental.acceptedAt = new Date();
  await rental.save();
  const overlapping = await Rental.find({
    _id: { $ne: rental._id }, car: rental.car, status: 'pending',
    startDate: { $lt: rental.endDate }, endDate: { $gt: rental.startDate },
  });
  for (const o of overlapping) await rejectRental(o, { reason: 'السيارة انحجزت بنفس التواريخ' });
  await notify(rental.renter, {
    type: 'rental', email: true, link: `/rentals/${rental._id}`,
    title: 'الشركة وافقت على حجزك', body: `${car.brand} ${car.model} · بتقدر تلغي مجاناً خلال ${rules.freeCancelHoursAfterAccept} ساعات.`,
  });
  res.json({ rental, autoRejected: overlapping.length });
}));

router.post('/:id/reject', requireRole('company'), wrap(async (req, res) => {
  const rental = await loadRental(req, ['company']);
  if (rental.status !== 'pending') throw httpError(409, 'الطلب مش قيد الانتظار');
  await rejectRental(rental, { reason: req.body.reason });
  res.json({ rental });
}));

router.post('/:id/cancel', wrap(async (req, res) => {
  const rental = await loadRental(req);
  if (req.user.role === 'renter') {
    if (!['pending', 'confirmed'].includes(rental.status)) throw httpError(409, 'ما بتقدر تلغي هالحجز');
    if (rental.status === 'confirmed' && rental.startDate <= new Date()) throw httpError(409, 'الحجز بلّش');
    const terms = await cancelByRenter(rental);
    return res.json({ rental, terms });
  }
  // Company cancels a confirmed rental → full refund to the renter
  if (rental.status !== 'confirmed') throw httpError(409, 'بتقدر تلغي حجز مؤكد بس');
  rental.status = 'cancelled';
  rental.cancelledBy = 'company';
  rental.cancelledAt = new Date();
  await rental.save();
  await refundFull(rental._id);
  await notify(rental.renter, {
    type: 'rental', email: true, link: `/rentals/${rental._id}`,
    title: 'الشركة لغت حجزك', body: `${await carLabel(rental)} · رجعلك المبلغ كامل (₪${rental.total}).`,
  });
  res.json({ rental });
}));

// Company confirms the renter picked up the car → payment transferred minus commission
router.post('/:id/pickup', requireRole('company'), wrap(async (req, res) => {
  const rental = await loadRental(req, ['company']);
  if (rental.status !== 'confirmed') throw httpError(409, 'الحجز مش مؤكد');
  if (Date.now() < rental.startDate.getTime() - 2 * 3600000) throw httpError(409, 'لسا ما إجا موعد الاستلام');
  rental.status = 'active';
  rental.pickupConfirmedAt = new Date();
  await rental.save();
  const payment = await transferToCompany(rental._id, 1);
  await notify(rental.renter, { type: 'rental', link: `/rentals/${rental._id}`, title: 'استلمت السيارة', body: `رحلة سعيدة! موعد التسليم ${rental.endDate.toLocaleString('ar')}` });
  res.json({ rental, payment });
}));

router.post('/:id/no-show', requireRole('company'), wrap(async (req, res) => {
  const rental = await loadRental(req, ['company']);
  if (rental.status !== 'confirmed') throw httpError(409, 'الحجز مش مؤكد');
  if (Date.now() < rental.startDate.getTime() + rules.noShowGraceHours * 3600000) {
    throw httpError(409, `بتقدر تسجّل عدم حضور بعد ${rules.noShowGraceHours} ساعات من الموعد`);
  }
  rental.status = 'no_show';
  await rental.save();
  const payment = await transferToCompany(rental._id, rules.lateCancelChargeRate);
  await notify(rental.renter, {
    type: 'rental', email: true, link: `/rentals/${rental._id}`,
    title: 'انسجّل عدم حضور على حجزك', body: `انخصم ${rules.lateCancelChargeRate * 100}% ورجعلك ₪${payment?.refundAmount ?? 0}.`,
  });
  res.json({ rental, payment });
}));

// Company confirms the car came back. The actual return time decides the late fee:
// free within the grace period, then a full day for every started 24h of lateness.
router.post('/:id/return', requireRole('company'), wrap(async (req, res) => {
  const rental = await loadRental(req, ['company']);
  if (rental.status !== 'active') throw httpError(409, 'الحجز مش جاري');
  const returnedAt = req.body?.returnedAt ? new Date(req.body.returnedAt) : new Date();
  if (Number.isNaN(returnedAt.getTime())) throw httpError(400, 'وقت الإرجاع مش صحيح');
  if (returnedAt > new Date(Date.now() + 5 * 60000)) throw httpError(400, 'وقت الإرجاع ما بصير يكون بالمستقبل');
  if (returnedAt < (rental.pickupConfirmedAt || rental.startDate)) throw httpError(400, 'وقت الإرجاع قبل وقت الاستلام');

  for (const ext of rental.extensions.filter((e) => e.status === 'pending')) {
    await closeExtension(rental, ext, { status: 'rejected', reason: 'السيارة رجعت قبل الرد على الطلب' });
  }
  const late = lateTerms(rental, returnedAt);
  rental.status = 'completed';
  rental.returnConfirmedAt = new Date();
  rental.returnedAt = returnedAt;
  rental.lateDays = late.lateDays;
  rental.lateFee = late.fee;
  await rental.save();
  if (late.fee > 0) {
    await recordDue({ rental, kind: 'late_fee', amount: late.fee });
    await notify(rental.renter, {
      type: 'rental', email: true, link: `/rentals/${rental._id}`,
      title: 'عليك رسوم تأخير', body: `رجّعت السيارة متأخر، فانحسب ${late.lateDays === 1 ? 'يوم إضافي' : `${late.lateDays} أيام إضافية`} (₪${late.fee}). ادفعها من صفحة الحجز.`,
    });
  } else {
    await notify(rental.renter, { type: 'rental', link: `/rentals/${rental._id}`, title: 'خلصت رحلتك', body: 'قيّم الشركة والسيارة عشان تساعد باقي المستأجرين.' });
  }
  res.json({ rental, late });
}));

// Renter starts paying a late fee with Stripe (sandbox mode needs nothing).
router.post('/:id/late-fee/payment-intent', requireRole('renter'), wrap(async (req, res) => {
  const rental = await loadRental(req, ['renter']);
  const due = await Payment.findOne({ rental: rental._id, kind: 'late_fee', status: 'due' });
  if (!due) throw httpError(409, 'ما في رسوم تأخير مستحقة');
  res.json(await createPaymentIntent({ amount: due.amount, renterId: rental.renter, carId: rental.car, metadata: { kind: 'late_fee', rentalId: rental._id } }));
}));

// Renter pays a late-return fee that the company recorded on return.
router.post('/:id/late-fee/pay', requireRole('renter'), wrap(refundIfRefused(async (req, res) => {
  const rental = await loadRental(req, ['renter']);
  const due = await Payment.findOne({ rental: rental._id, kind: 'late_fee', status: 'due' });
  if (!due) throw httpError(409, 'ما في رسوم تأخير مستحقة');
  const payment = await payDue(due, { card: req.body.card, paymentIntentId: req.body.paymentIntentId, carId: rental.car });
  await notify(rental.company, {
    type: 'rental', link: `/company/rentals/${rental._id}`,
    title: `انْدفعت رسوم التأخير ${rental.code}`, body: `₪${payment.amount}، وانحوّل لحسابك ₪${payment.transferAmount} بعد العمولة.`,
  });
  res.json({ payment });
})));

// Checks an extension request (still allowed, a later return inside the branch's hours, the car free)
// and prices it. Shared by the Stripe payment intent and the request itself, so both charge the same.
async function extensionQuote(rental, endDate) {
  const terms = extensionTerms(rental);
  if (!terms.allowed) throw httpError(409, terms.reason);
  const requestedEnd = new Date(endDate);
  if (Number.isNaN(requestedEnd.getTime())) throw httpError(400, 'اختار موعد التسليم الجديد');
  if (requestedEnd <= rental.endDate) throw httpError(400, 'الموعد الجديد لازم يكون بعد موعد التسليم الحالي');
  const car = await Car.findById(rental.car);
  const companyUser = await User.findById(rental.company).select('company.hours');
  const reason = await unavailableReason(car, rental.endDate, requestedEnd, rental._id)
    || closedReason(companyUser, requestedEnd, 'التسليم');
  if (reason) throw httpError(409, reason);
  const extraDays = countDays(rental.endDate, requestedEnd);
  return { car, requestedEnd, extraDays, amount: extraDays * rental.dailyPrice };
}

// Renter starts paying an extension with Stripe (sandbox mode needs nothing).
router.post('/:id/extensions/payment-intent', requireRole('renter'), wrap(async (req, res) => {
  const rental = await loadRental(req, ['renter']);
  const { amount, requestedEnd } = await extensionQuote(rental, req.body.endDate);
  res.json(await createPaymentIntent({
    amount, renterId: rental.renter, carId: rental.car,
    metadata: { kind: 'extension', rentalId: rental._id, requestedEnd: requestedEnd.toISOString() },
  }));
}));

// Renter asks to return the car later. The difference is paid now and held until the company decides.
router.post('/:id/extensions', requireRole('renter'), wrap(refundIfRefused(async (req, res) => {
  const rental = await loadRental(req, ['renter']);
  const { car, requestedEnd, extraDays, amount } = await extensionQuote(rental, req.body.endDate);
  const extensionId = new mongoose.Types.ObjectId();
  const payment = await holdExtra({ rental, kind: 'extension', amount, extensionId, card: req.body.card, paymentIntentId: req.body.paymentIntentId });
  rental.extensions.push({
    _id: extensionId, previousEnd: rental.endDate, requestedEnd, extraDays, amount,
    respondBy: new Date(Math.min(Date.now() + rules.responseHours * 3600000, rental.endDate.getTime())),
  });
  try {
    await rental.save();
  } catch (err) {
    await refundPaymentRef(payment.gatewayRef, payment.amount);
    await payment.deleteOne();
    throw err;
  }
  await notify(rental.company, {
    type: 'rental', email: true, link: `/company/rentals/${rental._id}`,
    title: `طلب تمديد ${rental.code}`, body: `${car.brand} ${car.model} · ${extraDays === 1 ? 'يوم إضافي' : `${extraDays} أيام إضافية`} (₪${amount}) · رد قبل موعد التسليم.`,
  });
  res.status(201).json({ rental, extension: rental.extensions.id(extensionId) });
})));

// Company approves an extension: the return time moves and the held difference is transferred.
router.post('/:id/extensions/:extId/approve', requireRole('company'), wrap(async (req, res) => {
  const rental = await loadRental(req, ['company']);
  const ext = rental.extensions.id(req.params.extId);
  if (!ext || ext.status !== 'pending') throw httpError(409, 'طلب التمديد مش قيد الانتظار');
  if (rental.status !== 'active') throw httpError(409, 'الحجز مش جاري');
  const car = await Car.findById(rental.car);
  const reason = await unavailableReason(car, rental.endDate, ext.requestedEnd, rental._id);
  if (reason) throw httpError(409, reason);
  ext.status = 'approved';
  ext.respondedAt = new Date();
  rental.endDate = ext.requestedEnd;
  rental.days += ext.extraDays;
  rental.total += ext.amount;
  await rental.save();
  const payment = await settle(await Payment.findOne({ rental: rental._id, kind: 'extension', extension: ext._id }), 1);
  await notify(rental.renter, {
    type: 'rental', email: true, link: `/rentals/${rental._id}`,
    title: 'الشركة وافقت على التمديد', body: `موعد التسليم الجديد ${ext.requestedEnd.toLocaleString('ar')}.`,
  });
  res.json({ rental, payment });
}));

router.post('/:id/extensions/:extId/reject', requireRole('company'), wrap(async (req, res) => {
  const rental = await loadRental(req, ['company']);
  const ext = rental.extensions.id(req.params.extId);
  if (!ext || ext.status !== 'pending') throw httpError(409, 'طلب التمديد مش قيد الانتظار');
  await closeExtension(rental, ext, { status: 'rejected', reason: req.body?.reason });
  await notify(rental.renter, {
    type: 'rental', email: true, link: `/rentals/${rental._id}`,
    title: 'الشركة رفضت طلب التمديد', body: `${req.body?.reason ? `${req.body.reason} · ` : ''}رجعلك ₪${ext.amount}. موعد التسليم بضل زي ما هو.`,
  });
  res.json({ rental });
}));

async function updateRating(model, id, filter) {
  const [agg] = await Review.aggregate([{ $match: filter }, { $group: { _id: null, avg: { $avg: '$stars' }, n: { $sum: 1 } } }]);
  await model.updateOne({ _id: id }, { ratingAvg: Math.round((agg?.avg || 0) * 10) / 10, ratingCount: agg?.n || 0 });
}

// Two-way ratings after the rental is completed (once per side)
router.post('/:id/review', wrap(async (req, res) => {
  const rental = await loadRental(req);
  if (rental.status !== 'completed') throw httpError(409, 'بتقدر تقيّم بعد ما تخلص الرحلة');
  const valid = (n) => Number.isInteger(Number(n)) && n >= 1 && n <= 5;
  if (req.user.role === 'renter') {
    if (rental.renterReviewed) throw httpError(409, 'قيّمت هالرحلة قبل');
    const { companyStars, carStars, comment } = req.body;
    if (!valid(companyStars) || !valid(carStars)) throw httpError(400, 'اختار النجوم أول');
    await Review.create([
      { rental: rental._id, author: req.user._id, targetType: 'company', targetUser: rental.company, stars: companyStars, comment },
      { rental: rental._id, author: req.user._id, targetType: 'car', car: rental.car, stars: carStars, comment },
    ]);
    rental.renterReviewed = true;
    await updateRating(User, rental.company, { targetType: 'company', targetUser: rental.company });
    await updateRating(Car, rental.car, { targetType: 'car', car: rental.car });
  } else {
    if (rental.companyReviewed) throw httpError(409, 'قيّمت هالزبون قبل');
    const { stars, comment } = req.body;
    if (!valid(stars)) throw httpError(400, 'اختار النجوم أول');
    await Review.create({ rental: rental._id, author: req.user._id, targetType: 'renter', targetUser: rental.renter, stars, comment });
    rental.companyReviewed = true;
    await updateRating(User, rental.renter, { targetType: 'renter', targetUser: rental.renter });
  }
  await rental.save();
  res.json({ rental });
}));

export default router;
