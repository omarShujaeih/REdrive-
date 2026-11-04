import mongoose from 'mongoose';

const carSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  brand: { type: String, required: true },
  model: { type: String, required: true },
  year: { type: Number, required: true },
  transmission: { type: String, enum: ['automatic', 'manual'], required: true },
  fuel: { type: String, enum: ['petrol', 'diesel', 'hybrid', 'electric'], required: true },
  seats: { type: Number, required: true },
  city: { type: String, required: true },
  pickupLocation: {
    address: String,
    lat: Number,
    lng: Number,
  },
  dailyPrice: { type: Number, required: true, min: 1 },
  aiSuggestedPrice: Number,
  availableFrom: { type: Date, required: true },
  availableTo: { type: Date, required: true },
  blockedDates: [Date], // days closed by the company (maintenance, private use)
  features: [String],
  photos: [String],
  plateNumber: { type: String, required: true },
  documents: [{ type: { type: String }, url: String, _id: false }],
  status: { type: String, enum: ['pending', 'available', 'rejected', 'deleted'], default: 'pending' },
  rejectionReason: String,
  ratingAvg: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.model('Car', carSchema);
