export const CITIES = {
  ramallah: 'رام الله والبيرة', nablus: 'نابلس', hebron: 'الخليل', bethlehem: 'بيت لحم', jenin: 'جنين',
  tulkarm: 'طولكرم', qalqilya: 'قلقيلية', jericho: 'أريحا', salfit: 'سلفيت', tubas: 'طوباس',
};
export const FUEL = { petrol: 'بنزين', diesel: 'ديزل', hybrid: 'هايبرد', electric: 'كهربائية' };
export const TRANSMISSION = { automatic: 'أوتوماتيك', manual: 'عادي' };
export const BRANDS = ['Toyota', 'Hyundai', 'Kia', 'Ford', 'Nissan', 'Skoda', 'Volkswagen', 'Mercedes', 'BMW'];
export const FEATURES = ['كاميرا خلفية', 'حساسات ركن', 'Apple CarPlay', 'بلوتوث', 'مثبّت سرعة', 'مكيّف للصف الخلفي', 'فتحة سقف', 'مقاعد جلد'];

export const RENTAL_STATUS = {
  pending: { label: 'قيد الانتظار', tone: 'amber' },
  confirmed: { label: 'مؤكد', tone: 'blue' },
  active: { label: 'جاري', tone: 'green' },
  completed: { label: 'مكتمل', tone: '' },
  rejected: { label: 'مرفوض', tone: 'red' },
  cancelled: { label: 'ملغي', tone: 'red' },
  no_show: { label: 'عدم حضور', tone: 'red' },
};
export const CAR_STATUS = {
  pending: { label: 'بانتظار اعتماد الإدارة', tone: 'amber' },
  available: { label: 'معروضة', tone: 'green' },
  rejected: { label: 'مرفوضة', tone: 'red' },
};
export const USER_STATUS = {
  unverified: { label: 'غير مكتمل', tone: '' },
  pending: { label: 'قيد المراجعة', tone: 'amber' },
  verified: { label: 'موثّق', tone: 'green' },
  rejected: { label: 'مرفوض', tone: 'red' },
  blocked: { label: 'محظور', tone: 'red' },
  deleted: { label: 'محذوف', tone: 'red' },
};
export const ROLE = { renter: 'مستأجر', company: 'شركة تأجير', admin: 'أدمن' };
export const DOC_LABEL = {
  nationalId: 'الهوية', drivingLicense: 'رخصة السواقة', commercialRegister: 'السجل التجاري',
  companyLicense: 'رخصة مزاولة المهنة', registration: 'رخصة المركبة', insurance: 'التأمين الشامل',
};

export const money = (n) => `₪${Math.round(Number(n || 0)).toLocaleString('en-US')}`;
export const carName = (c) => (c ? `${c.brand} ${c.model} ${c.year || ''}`.trim() : '');
export const fmtDate = (d) => new Date(d).toLocaleDateString('ar-JO-u-nu-latn', { weekday: 'short', day: 'numeric', month: 'long' });
export const fmtDateTime = (d) => `${fmtDate(d)} · ${new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
export const daysWord = (n) => (n === 1 ? 'يوم' : n === 2 ? 'يومين' : `${n} أيام`);
export const timeLeft = (d) => {
  const ms = new Date(d) - Date.now();
  if (ms <= 0) return 'انتهى الوقت';
  const h = Math.floor(ms / 3600000); const m = Math.floor((ms % 3600000) / 60000);
  return h ? `باقي ${h} ساعة و${m} دقيقة` : `باقي ${m} دقيقة`;
};
export const isoDay = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

// Short class label for a car card, from seats and daily price.
export const carCategory = (c) => {
  if (c.seats >= 7) return 'عائلية 7 ركاب';
  if (c.dailyPrice <= 140) return 'اقتصادية';
  if (c.dailyPrice >= 240) return 'فاخرة';
  return 'مريحة';
};

// Booking times: every started 24h counts as a day (same rule as the API).
export const countDays = (start, end) => Math.max(1, Math.ceil((new Date(end) - new Date(start)) / 86400000));
export const fmtTime = (d) => new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
// Pick-up and return hours offered in the booking forms.
export const HOURS = Array.from({ length: 16 }, (_, i) => `${String(i + 7).padStart(2, '0')}:00`);
// "YYYY-MM-DDTHH:mm" in local time, for datetime-local inputs and booking links.
export const localStamp = (d) => {
  const x = new Date(d);
  return `${isoDay(x)}T${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`;
};
// Booking links carry "YYYY-MM-DDTHH:mm"; older links carry only the day (10:00 then).
export const parseStamp = (v) => (v ? new Date(v.includes('T') ? v : `${v}T10:00:00`) : null);
const unit = (n, one, two, few, many) => (n === 1 ? one : n === 2 ? two : n <= 10 ? `${n} ${few}` : `${n} ${many}`);
export const lateText = (minutes) => {
  const h = Math.floor(minutes / 60); const m = minutes % 60;
  const hours = unit(h, "ساعة", "ساعتين", "ساعات", "ساعة");
  const mins = unit(m, "دقيقة", "دقيقتين", "دقائق", "دقيقة");
  return h ? `${hours}${m ? ` و${mins}` : ""}` : mins;
};
export const extraDaysText = (n) => unit(n, "يوم إضافي", "يومين إضافيين", "أيام إضافية", "يوم إضافي");
export const EXTENSION_STATUS = {
  pending: { label: 'بستنى رد الشركة', tone: 'amber' },
  approved: { label: 'انقبل', tone: 'green' },
  rejected: { label: 'انرفض', tone: 'red' },
  expired: { label: 'انتهى بدون رد', tone: '' },
};
