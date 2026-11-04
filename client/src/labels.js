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
