import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  rental: { type: mongoose.Schema.Types.ObjectId, ref: 'Rental', required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetType: { type: String, enum: ['company', 'car', 'renter'], required: true },
  targetUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  car: { type: mongoose.Schema.Types.ObjectId, ref: 'Car' },
  stars: { type: Number, min: 1, max: 5, required: true },
  comment: String,
}, { timestamps: true });

reviewSchema.index({ rental: 1, author: 1, targetType: 1 }, { unique: true });

export default mongoose.model('Review', reviewSchema);
