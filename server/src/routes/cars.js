import { Router } from 'express';
import Car from '../models/Car.js';
import User from '../models/User.js';
import Rental from '../models/Rental.js';
import Review from '../models/Review.js';
import { auth, optionalAuth, requireRole, requireVerified } from '../middleware/auth.js';
import { upload, fileUrl } from '../middleware/upload.js';
import { wrap, httpError } from '../middleware/error.js';
import { BLOCKING_STATUSES } from '../services/availability.js';
import { estimatePrice } from '../services/price.js';
import { notifyAdmins } from '../services/notify.js';

const router = Router();
const companyFields = 'name ratingAvg ratingCount company.address company.location company.hours city status';

// Public search: city, dates, price, transmission, fuel, brand, seats, minYear, q, sort, near (lat,lng)
router.get('/', wrap(async (req, res) => {
  const { city, start, end, minPrice, maxPrice, transmission, fuel, brand, model, seats, minYear, q, sort, lat, lng } = req.query;
  const filter = { status: 'available' };
  if (city) filter.city = city;
  if (transmission) filter.transmission = { $in: String(transmission).split(',') };
  if (fuel) filter.fuel = { $in: String(fuel).split(',') };
  if (brand) filter.brand = brand;
  if (model) filter.model = model;
  if (seats) filter.seats = { $gte: Number(seats) };
  if (minYear) filter.year = { $gte: Number(minYear) };
  if (minPrice || maxPrice) filter.dailyPrice = { ...(minPrice && { $gte: Number(minPrice) }), ...(maxPrice && { $lte: Number(maxPrice) }) };
  if (q) filter.$or = [{ brand: new RegExp(q, 'i') }, { model: new RegExp(q, 'i') }];

  let s; let e;
  if (start && end) {
    s = new Date(start); e = new Date(end);
    filter.availableFrom = { $lte: s };
    filter.availableTo = { $gte: new Date(e.getTime() - 86400000) };
    const busy = await Rental.distinct('car', { status: { $in: BLOCKING_STATUSES }, startDate: { $lt: e }, endDate: { $gt: s } });
    filter._id = { $nin: busy };
  }
  let cars = await Car.find(filter).populate('company', companyFields).lean();
  cars = cars.filter((c) => c.company?.status === 'verified');
  if (s && e) {
    const keys = new Set();
    for (let t = s.getTime(); t < e.getTime(); t += 86400000) keys.add(new Date(t).toISOString().slice(0, 10));
    cars = cars.filter((c) => !c.blockedDates.some((d) => keys.has(new Date(d).toISOString().slice(0, 10))));
  }
  if (lat && lng) {
    const toRad = (x) => (x * Math.PI) / 180;
    cars.forEach((c) => {
      const p = c.pickupLocation;
      if (p?.lat == null) { c.distanceKm = null; return; }
      const dLat = toRad(p.lat - lat); const dLng = toRad(p.lng - lng);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat)) * Math.cos(toRad(p.lat)) * Math.sin(dLng / 2) ** 2;
      c.distanceKm = Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
    });
  }
  const sorters = {
    price: (a, b) => a.dailyPrice - b.dailyPrice,
    rating: (a, b) => b.ratingAvg - a.ratingAvg,
    distance: (a, b) => (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9),
    newest: (a, b) => b.createdAt - a.createdAt,
  };
  cars.sort(sorters[sort] || ((a, b) => (b.ratingAvg * 10 - b.dailyPrice / 50) - (a.ratingAvg * 10 - a.dailyPrice / 50)));
  cars.forEach((c) => { delete c.documents; delete c.plateNumber; });
  res.json({ cars });
}));

router.post('/estimate-price', auth, requireRole('company'), (req, res) => {
  res.json(estimatePrice(req.body));
});

// Company's own cars
router.get('/mine', auth, requireRole('company'), wrap(async (req, res) => {
  const cars = await Car.find({ company: req.user._id, status: { $ne: 'deleted' } }).sort('-createdAt').lean();
  res.json({ cars });
}));

router.get('/favorites', auth, wrap(async (req, res) => {
  const user = await User.findById(req.user._id).populate({ path: 'favorites', match: { status: 'available' }, populate: { path: 'company', select: 'name' } });
  res.json({ cars: user.favorites });
}));

router.post('/:id/favorite', auth, requireRole('renter'), wrap(async (req, res) => {
  const id = req.params.id;
  const has = req.user.favorites.some((f) => String(f) === id);
  req.user.favorites = has ? req.user.favorites.filter((f) => String(f) !== id) : [...req.user.favorites, id];
  await req.user.save();
  res.json({ favorite: !has });
}));

router.get('/company/:companyId', wrap(async (req, res) => {
  const company = await User.findOne({ _id: req.params.companyId, role: 'company', status: 'verified' })
    .select('name city company ratingAvg ratingCount createdAt').lean();
  if (!company) throw httpError(404, 'الشركة مش موجودة');
  const [cars, reviews, trips] = await Promise.all([
    Car.find({ company: company._id, status: 'available' }).select('-documents -plateNumber').lean(),
    Review.find({ targetUser: company._id, targetType: 'company' }).populate('author', 'name').sort('-createdAt').limit(20).lean(),
    Rental.countDocuments({ company: company._id, status: 'completed' }),
  ]);
  res.json({ company, cars, reviews, trips });
}));

router.get('/:id', optionalAuth, wrap(async (req, res) => {
  const car = await Car.findById(req.params.id).populate('company', companyFields).lean();
  const isOwner = req.user && String(car?.company?._id) === String(req.user._id);
  const isAdmin = req.user?.role === 'admin';
  if (!car || (car.status !== 'available' && !isOwner && !isAdmin)) throw httpError(404, 'السيارة مش موجودة');
  const [bookings, reviews, companyTrips] = await Promise.all([
    Rental.find({ car: car._id, status: { $in: [...BLOCKING_STATUSES, ...(isOwner ? ['pending'] : [])] } })
      .select('startDate endDate status code renter').populate(isOwner ? [{ path: 'renter', select: 'name' }] : []).lean(),
    Review.find({ car: car._id, targetType: 'car' }).populate('author', 'name').sort('-createdAt').lean(),
    Rental.countDocuments({ company: car.company._id, status: 'completed' }),
  ]);
  if (!isOwner && !isAdmin) { delete car.documents; delete car.plateNumber; }
  const favorite = req.user?.favorites?.some((f) => String(f) === String(car._id)) || false;
  res.json({ car, bookings, reviews, companyTrips, favorite });
}));

const carUpload = upload.fields([{ name: 'photos', maxCount: 12 }, { name: 'registration', maxCount: 1 }, { name: 'insurance', maxCount: 1 }]);

function parseCarBody(body) {
  const out = {};
  for (const k of ['brand', 'model', 'city', 'transmission', 'fuel', 'plateNumber']) if (body[k] !== undefined) out[k] = body[k];
  for (const k of ['year', 'seats', 'dailyPrice', 'aiSuggestedPrice']) if (body[k] !== undefined && body[k] !== '') out[k] = Number(body[k]);
  if (body.availableFrom) out.availableFrom = new Date(body.availableFrom);
  if (body.availableTo) out.availableTo = new Date(body.availableTo);
  if (body.features !== undefined) out.features = [].concat(JSON.parse(body.features || '[]'));
  if (body.blockedDates !== undefined) out.blockedDates = JSON.parse(body.blockedDates || '[]').map((d) => new Date(d));
  if (body.pickupAddress !== undefined) {
    out.pickupLocation = { address: body.pickupAddress, lat: Number(body.lat) || undefined, lng: Number(body.lng) || undefined };
  }
  return out;
}

router.post('/', auth, requireRole('company'), requireVerified, carUpload, wrap(async (req, res) => {
  const data = parseCarBody(req.body);
  const files = req.files || {};
  if (!files.photos?.length) throw httpError(400, 'أضف صورة وحدة على الأقل');
  if (!files.registration?.[0] || !files.insurance?.[0]) throw httpError(400, 'ارفع رخصة المركبة والتأمين');
  if (!(data.availableFrom < data.availableTo)) throw httpError(400, 'فترة التوفر غير صحيحة');
  const car = await Car.create({
    ...data,
    company: req.user._id,
    pickupLocation: data.pickupLocation?.address ? data.pickupLocation : { address: req.user.company?.address, ...req.user.company?.location },
    photos: files.photos.map(fileUrl),
    documents: [{ type: 'registration', url: fileUrl(files.registration[0]) }, { type: 'insurance', url: fileUrl(files.insurance[0]) }],
    status: 'pending',
  });
  await notifyAdmins({ type: 'car', title: 'سيارة جديدة بانتظار الاعتماد', body: `${car.brand} ${car.model} ${car.year} · ${req.user.name}`, link: '/admin/cars' });
  res.status(201).json({ car });
}));

router.patch('/:id', auth, requireRole('company'), carUpload, wrap(async (req, res) => {
  const car = await Car.findOne({ _id: req.params.id, company: req.user._id, status: { $ne: 'deleted' } });
  if (!car) throw httpError(404, 'السيارة مش موجودة');
  const data = parseCarBody(req.body);
  const files = req.files || {};
  // Changing the car's identity or documents sends it back for admin review
  const needsReview = ['brand', 'model', 'year', 'plateNumber'].some((k) => data[k] !== undefined && String(data[k]) !== String(car[k]))
    || files.registration || files.insurance;
  Object.assign(car, data);
  if (files.photos?.length) car.photos = [...car.photos, ...files.photos.map(fileUrl)];
  if (req.body.removePhotos) car.photos = car.photos.filter((p) => !JSON.parse(req.body.removePhotos).includes(p));
  if (files.registration) car.documents = [...car.documents.filter((d) => d.type !== 'registration'), { type: 'registration', url: fileUrl(files.registration[0]) }];
  if (files.insurance) car.documents = [...car.documents.filter((d) => d.type !== 'insurance'), { type: 'insurance', url: fileUrl(files.insurance[0]) }];
  if (needsReview) {
    car.status = 'pending';
    await notifyAdmins({ type: 'car', title: 'سيارة بوثائق معدّلة بانتظار الاعتماد', body: `${car.brand} ${car.model}`, link: '/admin/cars' });
  }
  await car.save();
  res.json({ car });
}));

router.delete('/:id', auth, requireRole('company'), wrap(async (req, res) => {
  const car = await Car.findOne({ _id: req.params.id, company: req.user._id });
  if (!car) throw httpError(404, 'السيارة مش موجودة');
  if (await Rental.exists({ car: car._id, status: { $in: ['pending', 'confirmed', 'active'] } })) {
    throw httpError(409, 'ما بتقدر تحذف سيارة عليها حجز قيد الانتظار أو مؤكد أو جاري');
  }
  car.status = 'deleted';
  await car.save();
  res.json({ ok: true });
}));

export default router;
