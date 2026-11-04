export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0];
    return res.status(409).json({ message: field === 'email' ? 'الإيميل مستخدم' : field === 'phone' ? 'رقم الجوال مستخدم' : 'القيمة مستخدمة' });
  }
  if (err.name === 'ValidationError' || err.name === 'CastError') return res.status(400).json({ message: 'بيانات غير صحيحة' });
  if (!err.status) console.error(err);
  res.status(err.status || 500).json({ message: err.status ? err.message : 'صار خطأ بالسيرفر' });
}
