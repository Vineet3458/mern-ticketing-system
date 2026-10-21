import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 },
});

export const Counter = mongoose.model('Counter', counterSchema);

export const getNextTicketNumber = async () => {
  const currentYear = new Date().getFullYear();
  const counterName = `ticket_${currentYear}`;
  const counter = await Counter.findOneAndUpdate(
    { name: counterName },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  const formattedSeq = String(counter.seq).padStart(6, '0');
  return `TKT-${currentYear}-${formattedSeq}`;
};
