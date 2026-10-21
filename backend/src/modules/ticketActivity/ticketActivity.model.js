import mongoose from 'mongoose';

const ticketActivitySchema = new mongoose.Schema({
  ticketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true, index: true },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // null = system
  action: { type: String, required: true }, // created, assigned, status_changed, replied, ...
  oldValue: mongoose.Schema.Types.Mixed,
  newValue: mongoose.Schema.Types.Mixed,
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: { createdAt: true, updatedAt: false } });

export const TicketActivity = mongoose.model('TicketActivity', ticketActivitySchema);
