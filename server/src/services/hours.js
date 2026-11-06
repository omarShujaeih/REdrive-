// Branch opening hours. Pick-up and return must fall inside the company's hours on that weekday,
// judged in Palestine time whatever timezone the server runs in (Render runs in UTC).
export const TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Hebron';

// Used for companies that have not set their hours yet: every day 08:00–20:00.
export const DEFAULT_HOURS = Array.from({ length: 7 }, (_, day) => ({ day, open: '08:00', close: '20:00', closed: false }));
export const DAY_NAMES = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

const WEEKDAY = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const formatter = new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

// Weekday (0 = Sunday) and "HH:mm" of a moment in Palestine time.
export function localTime(date) {
  const p = Object.fromEntries(formatter.formatToParts(new Date(date)).map((x) => [x.type, x.value]));
  return { day: WEEKDAY[p.weekday], time: `${p.hour}:${p.minute}` };
}

export const hoursOf = (company) => {
  const list = company?.company?.hours;
  return Array.isArray(list) && list.length === 7 ? list : DEFAULT_HOURS;
};

// null when the branch is open at `date`, otherwise the reason. `what` is "الاستلام" or "التسليم".
export function closedReason(company, date, what) {
  const { day, time } = localTime(date);
  const h = hoursOf(company).find((x) => x.day === day) || DEFAULT_HOURS[day];
  if (h.closed) return `الفرع مسكّر يوم ${DAY_NAMES[day]}، اختار يوم ثاني لل${what.slice(2)}`;
  if (time < h.open || time >= h.close) return `وقت ${what} برّا دوام الفرع يوم ${DAY_NAMES[day]} (${h.open}–${h.close})`;
  return null;
}

// Validates the weekly hours a company sends from its settings; returns the cleaned list.
export function parseHours(input) {
  if (!Array.isArray(input) || input.length !== 7) throw new Error('لازم تحدد الدوام لكل أيام الأسبوع');
  const days = new Set();
  const list = input.map((h) => {
    const day = Number(h.day);
    if (!Number.isInteger(day) || day < 0 || day > 6 || days.has(day)) throw new Error('أيام الأسبوع مش صحيحة');
    days.add(day);
    const closed = Boolean(h.closed);
    if (!HHMM.test(h.open) || !HHMM.test(h.close)) throw new Error(`اكتب وقت الفتح والسكّر يوم ${DAY_NAMES[day]}`);
    if (!closed && h.open >= h.close) throw new Error(`وقت السكّر لازم يكون بعد وقت الفتح يوم ${DAY_NAMES[day]}`);
    return { day, open: h.open, close: h.close, closed };
  });
  if (list.every((h) => h.closed)) throw new Error('لازم يكون الفرع فاتح يوم واحد على الأقل');
  return list.sort((a, b) => a.day - b.day);
}
