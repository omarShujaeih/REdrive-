import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  rental: { type: mongoose.Schema.Types.ObjectId, ref: 'Rental', required: true, unique: true },
  renter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['held', 'transferred', 'refunded', 'partially_refunded'], default: 'held' },
  gatewayRef: String,
  refundAmount: { type: Number, default: 0 },
  commission: { type: Number, default: 0 },
  transferAmount: { type: Number, default: 0 },
  transferredAt: Date,
  refundedAt: Date,
}, { timestamps: true });

export default mongoose.model('Payment', paymentSchema);
