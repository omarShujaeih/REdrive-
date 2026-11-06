import express from 'express';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import { config, rules } from './config.js';
import Payment from './models/Payment.js';
import { connectDb } from './services/db.js';
import { setIo } from './services/notify.js';
import { expirePendingRentals } from './services/rentalActions.js';
import { uploadDir } from './middleware/upload.js';
import { errorHandler } from './middleware/error.js';
import authRoutes from './routes/auth.js';
import carRoutes from './routes/cars.js';
import rentalRoutes from './routes/rentals.js';
import companyRoutes from './routes/company.js';
import adminRoutes from './routes/admin.js';
import notificationRoutes from './routes/notifications.js';
import chatRoutes from './routes/chat.js';

const app = express();
app.use(cors({ origin: config.clientUrl }));
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(uploadDir));

app.use('/api/auth', authRoutes);
app.use('/api/cars', carRoutes);
app.use('/api/rentals', rentalRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chat', chatRoutes);
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Public rental policy numbers, so the terms shown to renters always match the rules the API enforces.
app.get('/api/policies', (req, res) => {
  const {
    responseHours, freeCancelHoursAfterAccept, lateCancelChargeRate, noShowGraceHours,
    lateGraceHours, extensionMinHoursBefore, termsVersion,
  } = rules;
  res.json({ responseHours, freeCancelHoursAfterAccept, lateCancelChargeRate, noShowGraceHours, lateGraceHours, extensionMinHoursBefore, termsVersion });
});

// Production (e.g. the Render demo): serve the built React client from the same origin,
// so /api and socket.io keep working with relative URLs. Unknown non-API paths get index.html.
const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use('/assets', express.static(path.join(clientDist, 'assets'), { immutable: true, maxAge: '1y' }));
  app.use(express.static(clientDist, { index: false }));
  app.get(/^\/(?!api\/|uploads\/|socket\.io\/).*/, (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use(errorHandler);

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: config.clientUrl } });
io.use((socket, next) => {
  try {
    socket.userId = jwt.verify(socket.handshake.auth?.token, config.jwtSecret).id;
    next();
  } catch {
    next(new Error('unauthorized'));
  }
});
io.on('connection', (socket) => socket.join(String(socket.userId)));
setIo(io);

const inMemory = await connectDb();
// Payments used to be unique per rental; extensions and late fees add more per rental,
// so drop the old unique index on existing databases (Atlas) and create the new ones.
await Payment.syncIndexes().catch((err) => console.error('[db] payment indexes:', err.message));
if (inMemory) {
  const { seed } = await import('./seed.js');
  await seed();
}

// Auto-reject requests the company did not answer within 12 hours
setInterval(() => expirePendingRentals().catch(console.error), 60000);

server.listen(config.port, () => console.log(`[api] http://localhost:${config.port}`));
