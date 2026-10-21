import mongoose from 'mongoose';
import { TICKET_STATUS, TICKET_PRIORITY } from '../../constants/index.js';

const ticketSchema = new mongoose.Schema({
  ticketNumber: { type: String, unique: true },
  // Secure random token used in Reply-To / Message-ID for email threading
  threadToken: { type: String, unique: true },
  subject: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, required: true, trim: true, maxlength: 10000 },
  requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  requesterEmail: { type: String, required: true, lowercase: true, trim: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  assignedAt: Date,
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  priority: { type: String, enum: Object.values(TICKET_PRIORITY), default: TICKET_PRIORITY.MEDIUM },
  status: { type: String, enum: Object.values(TICKET_STATUS), default: TICKET_STATUS.OPEN, index: true },
  attachments: [{ filename: String, url: String, mimeType: String, size: Number }],
  lastMessageAt: Date,
  resolvedAt: Date,
  closedAt: Date,
}, { timestamps: true });

ticketSchema.index({ subject: 'text', ticketNumber: 'text' });

export const Ticket = mongoose.model('Ticket', ticketSchema);
