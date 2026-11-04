import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  type: { type: String, required: true }, // nationalId, drivingLicense, commercialRegister, companyLicense
  url: { type: String, required: true },
}, { _id: false });

const userSchema = new mongoose.Schema({
  role: { type: String, enum: ['renter', 'company', 'admin'], required: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  city: String,
  dateOfBirth: Date,
  gender: { type: String, enum: ['male', 'female'] },
  // unverified: contact info not confirmed yet; pending: waiting for admin review
  status: { type: String, enum: ['unverified', 'pending', 'verified', 'rejected', 'blocked', 'deleted'], default: 'unverified' },
  emailVerified: { type: Boolean, default: false },
  phoneVerified: { type: Boolean, default: false },
  documents: [documentSchema],
  rejectionReason: String,
  failedLogins: { type: Number, default: 0 },
  lockUntil: Date,
  company: {
    address: String,
    phone: String,
    description: String,
    location: { lat: Number, lng: Number },
  },
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Car' }],
  ratingAvg: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
}, { timestamps: true });

userSchema.methods.toPublic = function toPublic() {
  const o = this.toObject();
  delete o.passwordHash;
  delete o.failedLogins;
  delete o.lockUntil;
  return o;
};

export default mongoose.model('User', userSchema);
