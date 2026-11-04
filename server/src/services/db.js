import mongoose from 'mongoose';
import { config } from '../config.js';

export async function connectDb() {
  let uri = config.mongoUri;
  if (!uri) {
    // No Atlas URI yet: run an in-memory MongoDB for local development.
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const mem = await MongoMemoryServer.create();
    uri = mem.getUri('redrive');
    console.log('[db] Using in-memory MongoDB (set MONGO_URI to use Atlas)');
  }
  await mongoose.connect(uri);
  console.log('[db] Connected');
  return !config.mongoUri; // true when in-memory
}
