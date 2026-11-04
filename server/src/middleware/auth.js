import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { config } from '../config.js';

export function signToken(user, remember = true) {
  return jwt.sign({ id: user._id, role: user.role }, config.jwtSecret, { expiresIn: remember ? '30d' : '1d' });
}

export async function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'لازم تسجّل دخول' });
  try {
    const { id } = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(id);
    if (!user || ['blocked', 'deleted'].includes(user.status)) return res.status(401).json({ message: 'الحساب غير متاح' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: 'انتهت الجلسة، سجّل دخول من جديد' });
  }
}

export async function optionalAuth(req, res, next) {
  if (!req.headers.authorization) return next();
  return auth(req, res, next);
}

export const requireRole = (...roles) => (req, res, next) => (
  roles.includes(req.user.role) ? next() : res.status(403).json({ message: 'ما عندك صلاحية' })
);

export function requireVerified(req, res, next) {
  if (req.user.status !== 'verified') {
    return res.status(403).json({ message: 'حسابك لسا مش موثّق من الإدارة' });
  }
  next();
}
