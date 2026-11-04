import { Router } from 'express';
import Car from '../models/Car.js';
import ChatMessage from '../models/ChatMessage.js';
import { optionalAuth } from '../middleware/auth.js';
import { wrap, httpError } from '../middleware/error.js';
import { rules } from '../config.js';

const router = Router();

const CITIES = {
  ramallah: ['رام الله', 'البيرة'], nablus: ['نابلس'], hebron: ['الخليل'], bethlehem: ['بيت لحم'], jenin: ['جنين'],
  tulkarm: ['طولكرم'], qalqilya: ['قلقيلية'], jericho: ['أريحا', 'اريحا'], salfit: ['سلفيت'], tubas: ['طوباس'],
};

const FAQ = [
  { k: ['الغي', 'ألغي', 'إلغاء', 'الغاء'], a: `الإلغاء مجاني قبل ما توافق الشركة، ولأول ${rules.freeCancelHoursAfterAccept} ساعات بعد الموافقة. بعدها بينخصم ${rules.lateCancelChargeRate * 100}% من المبلغ.` },
  { k: ['دفع', 'ادفع', 'مصاري', 'استرجاع', 'ترجع'], a: 'بتدفع المبلغ كامل أونلاين، وبيضل محجوز عند بوابة الدفع لحد ما الشركة توافق. إذا رفضت أو ما ردّت خلال 12 ساعة، بيرجعلك كامل.' },
  { k: ['توثيق', 'وثائق', 'هوية', 'رخصة'], a: 'لازم تأكد جوالك وإيميلك، وترفع الهوية ورخصة السواقة. الإدارة بتراجعهم عادة خلال يوم عمل.' },
  { k: ['عقد'], a: 'بتوقّع عقد الإيجار عند الشركة لما تستلم السيارة. خد هويتك ورخصتك معك.' },
  { k: ['استلم', 'استلام', 'تسليم'], a: 'بتستلم السيارة وبترجّعها على فرع الشركة بالموعد. إذا ما وصلت خلال ساعتين من الموعد، الشركة بتقدر تسجّل عدم حضور.' },
];

// Rule-based assistant: answers FAQs and suggests cars from the user's description.
// It can be replaced by an LLM API later without changing the endpoint.
async function reply(text) {
  const t = text.replace(/[أإآ]/g, 'ا');
  const faq = FAQ.find((f) => f.k.some((k) => t.includes(k.replace(/[أإآ]/g, 'ا'))));
  const city = Object.entries(CITIES).find(([, names]) => names.some((n) => t.includes(n.replace(/[أإآ]/g, 'ا'))))?.[0];
  const seatsMatch = t.match(/(\d+)\s*(ركاب|راكب|مقاعد|مقعد)/);
  const wantsCar = city || seatsMatch || /سيار|عائلي|اقتصادي|رخيص|اوتوماتيك|SUV/i.test(t);
  if (faq && !wantsCar) return { text: faq.a, cars: [] };
  if (!wantsCar) return { text: 'بقدر أساعدك تلاقي سيارة (احكيلي المدينة وعدد الركاب)، أو أجاوبك عن الدفع والإلغاء والتوثيق والاستلام.', cars: [] };
  const filter = { status: 'available' };
  if (city) filter.city = city;
  if (seatsMatch) filter.seats = { $gte: Number(seatsMatch[1]) };
  if (/عائلي/.test(t)) filter.seats = { $gte: 7 };
  if (/اوتوماتيك/.test(t)) filter.transmission = 'automatic';
  const sort = /رخيص|اقتصادي/.test(t) ? 'dailyPrice' : '-ratingAvg';
  const cars = await Car.find(filter).sort(sort).limit(4).select('brand model year seats dailyPrice ratingAvg photos city').lean();
  if (!cars.length) return { text: 'ما لقيت سيارات بتطابق طلبك هلأ. جرّب مدينة ثانية أو عدد ركاب أقل.', cars: [] };
  const cheapest = [...cars].sort((a, b) => a.dailyPrice - b.dailyPrice)[0];
  return {
    text: `لقيت ${cars.length} سيارات بتناسبك. أرخصها ${cheapest.brand} ${cheapest.model} بـ ₪${cheapest.dailyPrice} باليوم.${faq ? `\n${faq.a}` : ''}`,
    cars,
  };
}

router.post('/', optionalAuth, wrap(async (req, res) => {
  const text = String(req.body.text || '').trim().slice(0, 500);
  if (!text) throw httpError(400, 'اكتب رسالتك');
  const sessionId = String(req.body.sessionId || '');
  const answer = await reply(text);
  await ChatMessage.create([
    { user: req.user?._id, sessionId, role: 'user', text },
    { user: req.user?._id, sessionId, role: 'assistant', text: answer.text },
  ]);
  res.json(answer);
}));

export default router;
