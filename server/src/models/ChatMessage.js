import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  sessionId: String,
  role: { type: String, enum: ['user', 'assistant'], required: true },
  text: { type: String, required: true },
}, { timestamps: true });

export default mongoose.model('ChatMessage', chatMessageSchema);
