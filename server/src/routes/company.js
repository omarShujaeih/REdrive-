import { Router } from 'express';
import mongoose from 'mongoose';
import Rental from '../models/Rental.js';
import Car from '../models/Car.js';
import Payment from '../models/Payment.js';
import Review from '../models/Review.js';
import User from '../models/User.js';
import { auth, requireRole } from '../middleware/auth.js';
import { wrap, httpError } from '../middleware/error.js';

const router = Router();
router.use(auth, requireRole('company'));

router.get('/dashboard', wrap(async (req, res) => {
  const id = req.user._id;
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay.getTime() + 86400000);
  const [pending, cars, today, monthAgg] = await Promise.all([
    Rental.find({ company: id, status: 'pending' }).populate('renter', 'name').populate('car', 'brand model').sort('respondBy').limit(5).lean(),
    Car.aggregate([{ $match: { company: id, status: { $ne: 'deleted' } } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    Rental.find({
      company: id,
      $or: [
        { status: 'confirmed', startDate: { $gte: startOfDay, $lt: endOfDay } },
        { status: 'active', endDate: { $gte: startOfDay, $lt: endOfDay } },
      ],
    }).populate('renter', 'name').populate('car', 'brand model').lean(),
    Payment.aggregate([
      { $match: { company: id, transferredAt: { $gte: new Date(Date.now() - 180 * 86400000) } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$transferredAt' } }, net: { $sum: '$transferAmount' } } },
      { $sort: { _id: 1 } },
    ]),
  ]);
  const rentedNow = await Rental.countDocuments({ company: id, status: 'active' });
  res.json({ pending, cars, today, monthly: monthAgg, rentedNow });
}));

router.get('/finance', wrap(async (req, res) => {
  const payments = await Payment.find({ company: req.user._id, status: { $in: ['held', 'transferred', 'partially_refunded'] } })
    .populate({ path: 'rental', select: 'code status startDate', populate: { path: 'car', select: 'brand model' } })
    .sort('-createdAt').lean();
  const done = payments.filter((p) => p.status !== 'held');
  const totals = {
    gross: done.reduce((s, p) => s + p.amount - p.refundAmount, 0),
    fee: done.reduce((s, p) => s + p.commission, 0),
    net: done.reduce((s, p) => s + p.transferAmount, 0),
  };
  totals.avg = done.length ? Math.round(totals.net / done.length) : 0;
  res.json({ payments, totals });
}));

// Renter profile shown to the company before deciding on a request
router.get('/renters/:id', wrap(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw httpError(404, 'الزبون مش موجود');
  const hasRelation = await Rental.exists({ company: req.user._id, renter: req.params.id });
  if (!hasRelation) throw httpError(403, 'بتقدر تشوف ملف الزبون اللي إله طلب عندك بس');
  const renter = await User.findById(req.params.id).select('name city status ratingAvg ratingCount createdAt').lean();
  const rentals = await Rental.find({ renter: renter._id }).populate('company', 'name').populate('car', 'brand model').sort('-createdAt').lean();
  const reviews = await Review.find({ targetUser: renter._id, targetType: 'renter' }).populate('author', 'name').sort('-createdAt').lean();
  const stats = {
    total: rentals.length,
    completed: rentals.filter((r) => r.status === 'completed').length,
    cancelled: rentals.filter((r) => r.status === 'cancelled' && r.cancelledBy === 'renter').length,
    noShow: rentals.filter((r) => r.status === 'no_show').length,
  };
  // Other companies see only status and car, not the other company's commercial details
  const history = rentals.map((r) => ({
    _id: r._id, car: `${r.car?.brand} ${r.car?.model}`, company: r.company?.name, startDate: r.startDate, status: r.status,
    mine: String(r.company?._id) === String(req.user._id),
  }));
  res.json({ renter, stats, history, reviews });
}));

export default router;
