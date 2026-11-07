import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import User from '../models/User.js';
import VerificationCode from '../models/VerificationCode.js';
import { auth, signToken } from '../middleware/auth.js';
import { upload, fileUrl } from '../middleware/upload.js';
import { wrap, httpError } from '../middleware/error.js';
import { sendEmail, sendSms, notifyAdmins } from '../services/notify.js';
import { config, rules } from '../config.js';
import { parseHours } from '../services/hours.js';

const router = Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+97[02]5\d{8}$/;

async function issueCode(user, channel) {
  const code = String(crypto.randomInt(100000, 1000000));
  await VerificationCode.deleteMany({ user: user._id, channel });
  await VerificationCode.create({
    user: user._id, channel,
    codeHash: await bcrypt.hash(code, 8),
    expiresAt: new Date(Date.now() + rules.codeMinutes * 60000),
  });
  if (channel === 'phone') await sendSms(user.phone, `كود التحقق من Redrive: ${code}`);
  else await sendEmail(user.email, 'كود التحقق من Redrive', `الكود: ${code} (صالح ${rules.codeMinutes} دقيقة)`);
  return config.showDevCodes ? code : undefined;
}

async function checkCode(user, channel, code) {
  const vc = await VerificationCode.findOne({ user: user._id, channel });
  if (!vc || vc.expiresAt < new Date() || !(await bcrypt.compare(String(code || ''), vc.codeHash))) {
    throw httpError(400, 'الكود غلط أو انتهت صلاحيته');
  }
  await vc.deleteOne();
}

router.post('/register', wrap(async (req, res) => {
  const { role, name, email, phone, password, city, dateOfBirth, gender } = req.body;
  if (!['renter', 'company'].includes(role)) throw httpError(400, 'نوع الحساب غير صحيح');
  if (!name?.trim() || !EMAIL_RE.test(email || '')) throw httpError(400, 'عبّي الاسم وإيميل صحيح');
  if (!PHONE_RE.test(phone || '')) throw httpError(400, 'رقم الجوال لازم يكون بصيغة +970 أو +972');
  if (!password || password.length < 8) throw httpError(400, 'كلمة المرور 8 أحرف على الأقل');
  const user = await User.create({
    role, name, email, phone, city, dateOfBirth, gender,
    passwordHash: await bcrypt.hash(password, 10),
  });
  const devCode = await issueCode(user, 'phone');
  res.status(201).json({ token: signToken(user), user: user.toPublic(), devCode });
}));

router.post('/verify-phone', auth, wrap(async (req, res) => {
  await checkCode(req.user, 'phone', req.body.code);
  req.user.phoneVerified = true;
  await req.user.save();
  const devCode = await issueCode(req.user, 'email');
  res.json({ user: req.user.toPublic(), devCode });
}));

router.post('/verify-email', auth, wrap(async (req, res) => {
  await checkCode(req.user, 'email', req.body.code);
  req.user.emailVerified = true;
  await req.user.save();
  res.json({ user: req.user.toPublic() });
}));

router.post('/resend-code', auth, wrap(async (req, res) => {
  const channel = req.body.channel === 'email' ? 'email' : 'phone';
  res.json({ devCode: await issueCode(req.user, channel) });
}));

// Documents: renter → nationalId + drivingLicense; company → commercialRegister + companyLicense
router.post('/documents', auth, upload.fields([
  { name: 'nationalId' }, { name: 'drivingLicense' }, { name: 'commercialRegister' }, { name: 'companyLicense' },
]), wrap(async (req, res) => {
  const u = req.user;
  if (!u.phoneVerified || !u.emailVerified) throw httpError(400, 'أكّد جوالك وإيميلك أول');
  const required = u.role === 'company' ? ['commercialRegister', 'companyLicense'] : ['nationalId', 'drivingLicense'];
  const files = req.files || {};
  if (required.some((k) => !files[k]?.[0])) throw httpError(400, 'ارفع كل الوثائق المطلوبة');
  u.documents = required.map((k) => ({ type: k, url: fileUrl(files[k][0]) }));
  if (u.role === 'company') {
    const { address, companyPhone, description, lat, lng } = req.body;
    if (!address) throw httpError(400, 'عنوان الشركة مطلوب');
    u.company = { address, phone: companyPhone, description, location: { lat: Number(lat) || undefined, lng: Number(lng) || undefined } };
  }
  u.status = 'pending';
  u.rejectionReason = undefined;
  await u.save();
  await notifyAdmins({ type: 'account', title: 'حساب جديد بانتظار التوثيق', body: u.name, link: '/admin/verify' });
  res.json({ user: u.toPublic() });
}));

router.post('/login', wrap(async (req, res) => {
  const { identifier, password, remember } = req.body;
  const user = await User.findOne(identifier?.includes('@') ? { email: identifier.toLowerCase() } : { phone: identifier });
  if (user?.lockUntil && user.lockUntil > new Date()) {
    throw httpError(423, `الدخول موقوف مؤقتاً. جرّب بعد ${Math.ceil((user.lockUntil - Date.now()) / 60000)} دقيقة`);
  }
  if (!user || !(await bcrypt.compare(password || '', user.passwordHash))) {
    if (user) {
      user.failedLogins += 1;
      if (user.failedLogins >= rules.maxFailedLogins) {
        user.failedLogins = 0;
        user.lockUntil = new Date(Date.now() + rules.lockMinutes * 60000);
        await user.save();
        throw httpError(423, `دخلت كلمة مرور غلط ${rules.maxFailedLogins} مرات. جرّب بعد ${rules.lockMinutes} دقيقة`);
      }
      await user.save();
      throw httpError(401, `البريد أو كلمة المرور غلط. ضايلّك ${rules.maxFailedLogins - user.failedLogins} محاولات`);
    }
    throw httpError(401, 'البريد أو كلمة المرور غلط');
  }
  if (user.status === 'blocked') throw httpError(403, 'حسابك محظور');
  if (user.status === 'deleted') throw httpError(401, 'البريد أو كلمة المرور غلط');
  user.failedLogins = 0;
  user.lockUntil = undefined;
  await user.save();
  res.json({ token: signToken(user, remember), user: user.toPublic() });
}));

router.post('/forgot-password', wrap(async (req, res) => {
  const user = await User.findOne({ email: String(req.body.email || '').toLowerCase() });
  // Same answer whether the email exists or not
  const devCode = user ? await issueCode(user, 'reset') : undefined;
  res.json({ ok: true, devCode });
}));

router.post('/reset-password', wrap(async (req, res) => {
  const { email, code, password } = req.body;
  const user = await User.findOne({ email: String(email || '').toLowerCase() });
  if (!user) throw httpError(400, 'الكود غلط أو انتهت صلاحيته');
  if (!password || password.length < 8) throw httpError(400, 'كلمة المرور 8 أحرف على الأقل');
  await checkCode(user, 'reset', code);
  user.passwordHash = await bcrypt.hash(password, 10);
  user.lockUntil = undefined;
  user.failedLogins = 0;
  await user.save();
  res.json({ ok: true });
}));

router.get('/me', auth, (req, res) => res.json({ user: req.user.toPublic() }));

router.patch('/me', auth, wrap(async (req, res) => {
  const { name, city, description, companyPhone, hours, address, lat, lng } = req.body;
  if (name) req.user.name = name;
  if (city !== undefined) req.user.city = city;
  if (req.user.role === 'company') {
    if (description !== undefined) req.user.company.description = description;
    if (companyPhone !== undefined) req.user.company.phone = companyPhone;
    if (address !== undefined) {
      const clean = String(address).trim();
      if (!clean) throw httpError(400, 'اكتب عنوان الشركة');
      req.user.company.address = clean.slice(0, 200);
    }
    // Branch location on the map: both empty clears it, otherwise both must be valid coordinates.
    if (lat !== undefined && lng !== undefined) {
      const empty = (v) => v === '' || v === null;
      if (empty(lat) && empty(lng)) {
        req.user.company.location = { lat: undefined, lng: undefined };
      } else {
        const la = Number(lat); const lo = Number(lng);
        if (empty(lat) || empty(lng) || !Number.isFinite(la) || !Number.isFinite(lo) || Math.abs(la) > 90 || Math.abs(lo) > 180) {
          throw httpError(400, 'إحداثيات موقع الفرع مش صحيحة');
        }
        req.user.company.location = { lat: la, lng: lo };
      }
    }
    if (hours !== undefined) {
      try { req.user.company.hours = parseHours(hours); } catch (err) { throw httpError(400, err.message); }
    }
  }
  await req.user.save();
  res.json({ user: req.user.toPublic() });
}));

router.post('/change-password', auth, wrap(async (req, res) => {
  const { current, next } = req.body;
  if (!(await bcrypt.compare(current || '', req.user.passwordHash))) throw httpError(400, 'كلمة المرور الحالية غلط');
  if (!next || next.length < 8) throw httpError(400, 'كلمة المرور 8 أحرف على الأقل');
  req.user.passwordHash = await bcrypt.hash(next, 10);
  await req.user.save();
  res.json({ ok: true });
}));

export default router;
