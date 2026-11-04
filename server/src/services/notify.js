import nodemailer from 'nodemailer';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { config } from '../config.js';

let io = null;
export function setIo(server) { io = server; }

const transporter = config.smtp.host
  ? nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    auth: { user: config.smtp.user, pass: config.smtp.pass },
  })
  : null;

export async function sendEmail(to, subject, text) {
  if (!transporter) {
    console.log(`[email -> ${to}] ${subject}: ${text}`);
    return;
  }
  await transporter.sendMail({ from: config.smtp.from, to, subject, text });
}

export async function sendSms(phone, text) {
  const { sid, token, from } = config.twilio;
  if (!sid || !token || !from) {
    console.log(`[sms -> ${phone}] ${text}`);
    return;
  }
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ To: phone, From: from, Body: text }),
  });
  if (!res.ok) console.error('[sms] Twilio error', res.status, await res.text());
}

// In-app notification (saved + pushed in real time) and optional email copy.
export async function notify(userId, { title, body, link, type = 'general', email = false }) {
  const n = await Notification.create({ user: userId, title, body, link, type });
  if (io) io.to(String(userId)).emit('notification', n);
  if (email) {
    const user = await User.findById(userId).select('email');
    if (user) await sendEmail(user.email, title, body || '');
  }
  return n;
}

export async function notifyAdmins(payload) {
  const admins = await User.find({ role: 'admin' }).select('_id');
  await Promise.all(admins.map((a) => notify(a._id, payload)));
}
