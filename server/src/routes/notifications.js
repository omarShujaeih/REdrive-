import { Router } from 'express';
import Notification from '../models/Notification.js';
import { auth } from '../middleware/auth.js';
import { wrap } from '../middleware/error.js';

const router = Router();
router.use(auth);

router.get('/', wrap(async (req, res) => {
  const notifications = await Notification.find({ user: req.user._id }).sort('-createdAt').limit(100).lean();
  res.json({ notifications, unread: notifications.filter((n) => !n.read).length });
}));

router.post('/read-all', wrap(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.json({ ok: true });
}));

router.post('/:id/read', wrap(async (req, res) => {
  await Notification.updateOne({ _id: req.params.id, user: req.user._id }, { read: true });
  res.json({ ok: true });
}));

export default router;
