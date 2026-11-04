import mongoose from 'mongoose';

const verificationCodeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  channel: { type: String, enum: ['phone', 'email', 'reset'], required: true },
  codeHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
});

verificationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('VerificationCode', verificationCodeSchema);
