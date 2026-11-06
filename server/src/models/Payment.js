import mongoose from 'mongoose';

// One booking payment per rental, plus optional extra payments: approved extensions and late-return fees.
// A late fee starts as 'due' (owed by the renter) until the renter pays it online.
const paymentSchema = new mongoose.Schema({
  rental: { type: mongoose.Schema.Types.ObjectId, ref: 'Rental', required: true, index: true },
  kind: { type: String, enum: ['booking', 'extension', 'late_fee'], default: 'booking' },
  extension: mongoose.Schema.Types.ObjectId, // the rental extension this payment belongs to
  renter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['due', 'held', 'transferred', 'refunded', 'partially_refunded'], default: 'held' },
  gatewayRef: String,
  refundAmount: { type: Number, default: 0 },
  commission: { type: Number, default: 0 },
  transferAmount: { type: Number, default: 0 },
  transferredAt: Date,
  refundedAt: Date,
}, { timestamps: true });

export default mongoose.model('Payment', paymentSchema);
