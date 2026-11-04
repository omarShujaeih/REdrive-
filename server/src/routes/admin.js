import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import User from '../models/User.js';
import Car from '../models/Car.js';
import Rental from '../models/Rental.js';
import Payment from '../models/Payment.js';
import Review from '../models/Review.js';
import { auth, requireRole } from '../middleware/auth.js';
import { wrap, httpError } from '../middleware/error.js';
import { notify, sendEmail } from '../services/notify.js';

const router = Router();
router.use(auth, requireRole('admin'));

router.get('/dashboard', wrap(async (req, res) => {
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const [pendingUsers, pendingCars, lowRated, renters, companies, cars, activeRentals, fee, recentReviews] = await Promise.all([
    User.countDocuments({ status: 'pending' }),
    Car.countDocuments({ status: 'pending' }),
    User.countDocuments({ ratingCount: { $gt: 0 }, ratingAvg: { $lt: 3 } }),
    User.countDocuments({ role: 'renter', status: { $ne: 'deleted' } }),
    User.countDocuments({ role: 'company', status: 'verified' }),
    Car.countDocuments({ status: 'available' }),
    Rental.countDocuments({ status: { $in: ['confirmed', 'active'] } }),
    Payment.aggregate([{ $match: { transferredAt: { $gte: monthStart } } }, { $group: { _id: null, s: { $sum: '$commission' } } }]),
    Review.find({ stars: { $lte: 2 } }).populate('author', 'name').populate('targetUser', 'name').sort('-createdAt').limit(5).lean(),
  ]);
  res.json({ pendingUsers, pendingCars, lowRated, renters, companies, cars, activeRentals, monthCommission: fee[0]?.s || 0, recentReviews });
}));

router.get('/verifications', wrap(async (req, res) => {
  const users = await User.find({ status: 'pending' }).select('-passwordHash').sort('updatedAt').lean();
  res.json({ users });
}));

router.post('/verifications/:id', wrap(async (req, res) => {
  const { decision, reason } = req.body;
  const user = await User.findOne({ _id: req.params.id, status: 'pending' });
  if (!user) throw httpError(404, 'الطلب مش موجود');
  if (decision === 'reject' && !reason?.trim()) throw httpError(400, 'سبب الرفض مطلوب');
  user.status = decision === 'approve' ? 'verified' : 'rejected';
  user.rejectionReason = decision === 'approve' ? undefined : reason;
  await user.save();
  await notify(user._id, {
    type: 'account', email: true, link: '/profile',
    title: decision === 'approve' ? 'انوثّق حسابك' : 'انرفض توثيق حسابك',
    body: decision === 'approve' ? 'صار فيك تستخدم كل خدمات Redrive.' : `السبب: ${reason}. عدّل وثائقك وابعتها من جديد.`,
  });
  res.json({ user: user.toPublic() });
}));

router.get('/cars', wrap(async (req, res) => {
  const cars = await Car.find({ status: 'pending' }).populate('company', 'name').sort('updatedAt').lean();
  res.json({ cars });
}));

router.post('/cars/:id', wrap(async (req, res) => {
  const { decision, reason } = req.body;
  const car = await Car.findOne({ _id: req.params.id, status: 'pending' });
  if (!car) throw httpError(404, 'السيارة مش موجودة');
  if (decision === 'reject' && !reason?.trim()) throw httpError(400, 'سبب الرفض مطلوب');
  car.status = decision === 'approve' ? 'available' : 'rejected';
  car.rejectionReason = decision === 'approve' ? undefined : reason;
  await car.save();
  await notify(car.company, {
    type: 'car', email: true, link: '/company/cars',
    title: decision === 'approve' ? `انعتمدت ${car.brand} ${car.model}` : `انرفضت ${car.brand} ${car.model}`,
    body: decision === 'approve' ? 'السيارة صارت تظهر بالبحث.' : `السبب: ${reason}`,
  });
  res.json({ car });
}));

router.get('/users', wrap(async (req, res) => {
  const { role, status, q } = req.query;
  const filter = {};
  if (role) filter.role = role;
  filter.status = status || { $ne: 'deleted' };
  if (q) filter.$or = [{ name: new RegExp(q, 'i') }, { email: new RegExp(q, 'i') }];
  const users = await User.find(filter).select('name email phone role status ratingAvg ratingCount createdAt').sort('-createdAt').limit(200).lean();
  const active = await Rental.aggregate([
    { $match: { status: { $in: ['pending', 'confirmed', 'active'] } } },
    { $project: { ids: ['$renter', '$company'] } }, { $unwind: '$ids' }, { $group: { _id: '$ids', n: { $sum: 1 } } },
  ]);
  const map = Object.fromEntries(active.map((a) => [String(a._id), a.n]));
  res.json({ users: users.map((u) => ({ ...u, activeRentals: map[String(u._id)] || 0 })) });
}));

router.post('/users', wrap(async (req, res) => {
  const { name, email, phone, role } = req.body;
  if (!['renter', 'company', 'admin'].includes(role)) throw httpError(400, 'نوع الحساب غير صحيح');
  const user = await User.create({
    name, email, phone, role, status: role === 'admin' ? 'verified' : 'unverified',
    passwordHash: await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10),
  });
  await sendEmail(email, 'حسابك على Redrive', 'انعملك حساب. استعمل "نسيت كلمة المرور؟" عشان تعمل كلمة مرور.');
  res.status(201).json({ user: user.toPublic() });
}));

router.post('/users/:id/block', wrap(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user || user.role === 'admin') throw httpError(404, 'المستخدم مش موجود');
  const block = req.body.block !== false;
  user.status = block ? 'blocked' : (user.documents.length ? 'verified' : 'unverified');
  await user.save();
  await sendEmail(user.email, block ? 'انحظر حسابك على Redrive' : 'انفك الحظر عن حسابك', block ? 'حسابك انحظر بسبب مخالفة شروط المنصة.' : 'صار فيك تسجّل دخول.');
  res.json({ user: user.toPublic() });
}));

router.delete('/users/:id', wrap(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user || user.role === 'admin') throw httpError(404, 'المستخدم مش موجود');
  if (await Rental.exists({ $or: [{ renter: user._id }, { company: user._id }], status: { $in: ['pending', 'confirmed', 'active'] } })) {
    throw httpError(409, 'ما بتقدر تحذف حساب عليه حجز قيد الانتظار أو مؤكد أو جاري');
  }
  await sendEmail(user.email, 'انحذف حسابك على Redrive', 'حسابك انحذف بسبب مخالفة شروط المنصة.');
  if (user.role === 'company') await Car.updateMany({ company: user._id }, { status: 'deleted' });
  const tag = `deleted-${user._id}`;
  Object.assign(user, {
    status: 'deleted', name: 'حساب محذوف', email: `${tag}@deleted.redrive.ps`, phone: tag,
    documents: [], favorites: [], dateOfBirth: undefined, city: undefined,
  });
  await user.save();
  res.json({ ok: true });
}));

export default router;
