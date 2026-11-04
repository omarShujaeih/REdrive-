import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import User from './models/User.js';
import Car from './models/Car.js';
import Rental from './models/Rental.js';
import Payment from './models/Payment.js';
import Review from './models/Review.js';

// Development test accounts (password for all: Test1234!)
export const TEST_PASSWORD = 'Test1234!';

const DAY = 86400000;
const at10 = (offsetDays) => { const d = new Date(Date.now() + offsetDays * DAY); d.setHours(10, 0, 0, 0); return d; };

export async function seed() {
  if (await User.exists({})) return;
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
  const verified = { status: 'verified', emailVerified: true, phoneVerified: true, passwordHash };
  const docs = (types) => types.map((t) => ({ type: t, url: '/uploads/sample-doc.pdf' }));

  await User.create({ ...verified, role: 'admin', name: 'مدير المنصة', email: 'admin@redrive.ps', phone: '+970590000000' });

  const [najma, riyada, sahel] = await User.create([
    { ...verified, role: 'company', name: 'النجمة لتأجير السيارات', email: 'najma@redrive.ps', phone: '+970590000001', city: 'ramallah',
      documents: docs(['commercialRegister', 'companyLicense']),
      company: { address: 'شارع الإرسال، رام الله', phone: '022950000', description: 'شركة تأجير سيارات مرخّصة، عندها سيارات عائلية واقتصادية وSUV.', location: { lat: 31.9073, lng: 35.2045 } } },
    { ...verified, role: 'company', name: 'الريادة للسيارات', email: 'riyada@redrive.ps', phone: '+970590000002', city: 'nablus',
      documents: docs(['commercialRegister', 'companyLicense']),
      company: { address: 'شارع فيصل، نابلس', phone: '092380000', description: 'سيارات اقتصادية وحديثة بأسعار مناسبة.', location: { lat: 32.2227, lng: 35.2621 } } },
    { ...verified, role: 'company', name: 'السهل لتأجير السيارات', email: 'sahel@redrive.ps', phone: '+970590000003', city: 'hebron',
      documents: docs(['commercialRegister', 'companyLicense']),
      company: { address: 'رأس الجورة، الخليل', phone: '022220000', description: 'سيارات عائلية 7 ركاب للرحلات.', location: { lat: 31.5497, lng: 35.0960 } } },
  ]);

  const [omar, layan] = await User.create([
    { ...verified, role: 'renter', name: 'عمر شجاعية', email: 'omar@redrive.ps', phone: '+970590000010', city: 'ramallah', documents: docs(['nationalId', 'drivingLicense']) },
    { ...verified, role: 'renter', name: 'ليان حمدان', email: 'layan@redrive.ps', phone: '+970590000011', city: 'ramallah', documents: docs(['nationalId', 'drivingLicense']) },
    { ...verified, status: 'pending', role: 'renter', name: 'يوسف بركات', email: 'yousef@redrive.ps', phone: '+970590000012', city: 'bethlehem', documents: docs(['nationalId', 'drivingLicense']) },
  ]);

  const base = { availableFrom: at10(-30), availableTo: at10(120), status: 'available', photos: [], documents: docs(['registration', 'insurance']) };
  const loc = (c) => ({ address: c.company.address, ...c.company.location });
  const cars = await Car.create([
    { ...base, company: najma._id, brand: 'Ford', model: 'Explorer', year: 2022, transmission: 'automatic', fuel: 'petrol', seats: 7, city: 'ramallah', dailyPrice: 260, plateNumber: '6-1234-95', pickupLocation: loc(najma), features: ['كاميرا خلفية', 'حساسات ركن', 'Apple CarPlay', 'بلوتوث'] },
    { ...base, company: najma._id, brand: 'Hyundai', model: 'Tucson', year: 2023, transmission: 'automatic', fuel: 'hybrid', seats: 5, city: 'ramallah', dailyPrice: 230, plateNumber: '6-2234-95', pickupLocation: loc(najma), features: ['بلوتوث', 'مثبّت سرعة'] },
    { ...base, company: najma._id, brand: 'Toyota', model: 'Corolla', year: 2024, transmission: 'automatic', fuel: 'hybrid', seats: 5, city: 'ramallah', dailyPrice: 190, plateNumber: '6-3234-95', pickupLocation: loc(najma), features: ['Apple CarPlay'] },
    { ...base, company: najma._id, brand: 'Kia', model: 'Picanto', year: 2021, transmission: 'manual', fuel: 'petrol', seats: 4, city: 'ramallah', dailyPrice: 120, plateNumber: '6-4234-95', pickupLocation: loc(najma), features: [] },
    { ...base, company: riyada._id, brand: 'Kia', model: 'Sportage', year: 2023, transmission: 'automatic', fuel: 'diesel', seats: 5, city: 'nablus', dailyPrice: 220, plateNumber: '7-1111-95', pickupLocation: loc(riyada), features: ['كاميرا خلفية'] },
    { ...base, company: riyada._id, brand: 'Skoda', model: 'Octavia', year: 2022, transmission: 'automatic', fuel: 'petrol', seats: 5, city: 'nablus', dailyPrice: 170, plateNumber: '7-2222-95', pickupLocation: loc(riyada), features: ['بلوتوث'] },
    { ...base, company: riyada._id, brand: 'Hyundai', model: 'i10', year: 2020, transmission: 'manual', fuel: 'petrol', seats: 4, city: 'nablus', dailyPrice: 110, plateNumber: '7-3333-95', pickupLocation: loc(riyada), features: [] },
    { ...base, company: sahel._id, brand: 'Kia', model: 'Carnival', year: 2022, transmission: 'automatic', fuel: 'diesel', seats: 7, city: 'hebron', dailyPrice: 260, plateNumber: '8-1111-95', pickupLocation: loc(sahel), features: ['مكيّف للصف الخلفي', 'كاميرا خلفية'] },
    { ...base, company: sahel._id, brand: 'Nissan', model: 'X-Trail', year: 2021, transmission: 'automatic', fuel: 'petrol', seats: 7, city: 'hebron', dailyPrice: 240, plateNumber: '8-2222-95', pickupLocation: loc(sahel), features: ['حساسات ركن'] },
    { ...base, status: 'pending', company: najma._id, brand: 'Toyota', model: 'RAV4', year: 2024, transmission: 'automatic', fuel: 'hybrid', seats: 5, city: 'ramallah', dailyPrice: 280, aiSuggestedPrice: 270, plateNumber: '6-5234-95', pickupLocation: loc(najma), features: [] },
  ]);
  const [explorer, tucson, corolla] = cars;

  const mk = async (data, payStatus) => {
    const days = Math.round((data.endDate - data.startDate) / DAY);
    const r = await Rental.create({
      code: `RD-26-${String(4000 + Math.floor(Math.random() * 999)).padStart(6, '0')}`,
      days, dailyPrice: data.car.dailyPrice, total: days * data.car.dailyPrice,
      company: data.car.company, ...data, car: data.car._id,
    });
    const commission = Math.round(r.total * 0.1);
    await Payment.create({
      rental: r._id, renter: r.renter, company: r.company, amount: r.total, gatewayRef: 'sim_seed', status: payStatus,
      ...(payStatus === 'transferred' && { commission, transferAmount: r.total - commission, transferredAt: r.startDate }),
    });
    return r;
  };

  await mk({ renter: omar._id, car: explorer, startDate: at10(8), endDate: at10(11), status: 'pending', respondBy: new Date(Date.now() + 11 * 3600000) }, 'held');
  await mk({ renter: layan._id, car: tucson, startDate: at10(0), endDate: at10(2), status: 'confirmed', acceptedAt: new Date(Date.now() - 2 * DAY) }, 'held');
  const done = await mk({ renter: layan._id, car: corolla, startDate: at10(-12), endDate: at10(-9), status: 'completed', acceptedAt: at10(-14), pickupConfirmedAt: at10(-12), returnConfirmedAt: at10(-9), renterReviewed: true, companyReviewed: true }, 'transferred');
  await mk({ renter: omar._id, car: explorer, startDate: at10(-25), endDate: at10(-21), status: 'completed', acceptedAt: at10(-27), pickupConfirmedAt: at10(-25), returnConfirmedAt: at10(-21) }, 'transferred');

  await Review.create([
    { rental: done._id, author: layan._id, targetType: 'company', targetUser: najma._id, stars: 5, comment: 'تعامل محترم، والسيارة كانت جاهزة ونظيفة قبل الموعد.' },
    { rental: done._id, author: layan._id, targetType: 'car', car: corolla._id, stars: 5, comment: 'سيارة نظيفة وموفّرة.' },
    { rental: done._id, author: najma._id, targetType: 'renter', targetUser: layan._id, stars: 5, comment: 'زبونة ملتزمة، والسيارة رجعت نظيفة.' },
  ]);
  await User.updateOne({ _id: najma._id }, { ratingAvg: 5, ratingCount: 1 });
  await User.updateOne({ _id: layan._id }, { ratingAvg: 5, ratingCount: 1 });
  await Car.updateOne({ _id: corolla._id }, { ratingAvg: 5, ratingCount: 1 });
  console.log(`[seed] Test data created (password for all accounts: ${TEST_PASSWORD})`);
}

// `npm run seed` against MONGO_URI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { config } = await import('./config.js');
  await mongoose.connect(config.mongoUri);
  await seed();
  await mongoose.disconnect();
}
