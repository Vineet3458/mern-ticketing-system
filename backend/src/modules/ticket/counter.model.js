import mongoose from 'mongoose';

// Atomic counter used to generate TKT-YYYY-000001 numbers
const counterSchema = new mongoose.Schema({
  _id: String, // e.g. "ticket-2026"
  seq: { type: Number, default: 0 },
});

export const Counter = mongoose.model('Counter', counterSchema);

export const nextSequence = async (key) => {
  const doc = await Counter.findByIdAndUpdate(key, { $inc: { seq: 1 } }, { new: true, upsert: true });
  return doc.seq;
};
