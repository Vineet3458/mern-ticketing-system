import mongoose from 'mongoose';
import { EMAIL_DIRECTION, EMAIL_STATUS } from '../../constants/index.js';

const emailEventSchema = new mongoose.Schema({
  providerMessageId: { type: String, index: true },
  messageId: { type: String, index: true },
  ticketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', index: true },
  direction: { type: String, enum: Object.values(EMAIL_DIRECTION), required: true },
  status: { type: String, enum: Object.values(EMAIL_STATUS), default: EMAIL_STATUS.QUEUED },
  to: String,
  from: String,
  subject: String,
  error: String,
  processedAt: Date,
}, { timestamps: true });

export const EmailEvent = mongoose.model('EmailEvent', emailEventSchema);
