import mongoose from 'mongoose';

const rentalSchema = new mongoose.Schema({
  code: { type: String, unique: true },
  renter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  car: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  days: { type: Number, required: true },
  dailyPrice: { type: Number, required: true },
  total: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'active', 'completed', 'rejected', 'cancelled', 'no_show'],
    default: 'pending',
  },
  respondBy: Date, // 12h deadline for the company
  acceptedAt: Date,
  rejectionReason: String,
  cancelledBy: { type: String, enum: ['renter', 'company', 'system'] },
  cancelledAt: Date,
  pickupConfirmedAt: Date,
  returnConfirmedAt: Date,
  renterReviewed: { type: Boolean, default: false },
  companyReviewed: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model('Rental', rentalSchema);
