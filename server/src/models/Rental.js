import mongoose from 'mongoose';

// A renter's request to push the return time later. The difference is paid when it is sent
// and held until the company approves (then transferred) or rejects / lets it expire (then refunded).
const extensionSchema = new mongoose.Schema({
  previousEnd: { type: Date, required: true },
  requestedEnd: { type: Date, required: true },
  extraDays: { type: Number, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'expired'], default: 'pending' },
  respondBy: Date,
  respondedAt: Date,
  reason: String,
}, { timestamps: true });

const rentalSchema = new mongoose.Schema({
  code: { type: String, unique: true },
  renter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  car: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', required: true },
  startDate: { type: Date, required: true }, // pick-up date and time
  endDate: { type: Date, required: true }, // return date and time (moves later when an extension is approved)
  days: { type: Number, required: true }, // every started 24h counts as a day
  dailyPrice: { type: Number, required: true },
  total: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'active', 'completed', 'rejected', 'cancelled', 'no_show'],
    default: 'pending',
  },
  termsAcceptedAt: Date,
  termsVersion: String,
  respondBy: Date, // 12h deadline for the company
  acceptedAt: Date,
  rejectionReason: String,
  cancelledBy: { type: String, enum: ['renter', 'company', 'system'] },
  cancelledAt: Date,
  pickupConfirmedAt: Date,
  returnConfirmedAt: Date,
  returnedAt: Date, // actual return time recorded by the company
  lateDays: { type: Number, default: 0 },
  lateFee: { type: Number, default: 0 },
  extensions: [extensionSchema],
  renterReviewed: { type: Boolean, default: false },
  companyReviewed: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model('Rental', rentalSchema);
