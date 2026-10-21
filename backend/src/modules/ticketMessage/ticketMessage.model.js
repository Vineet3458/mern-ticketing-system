import mongoose from 'mongoose';
import { MESSAGE_TYPE, MESSAGE_SOURCE, ROLES } from '../../constants/index.js';

const ticketMessageSchema = new mongoose.Schema({
  ticketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true, index: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  senderEmail: { type: String, lowercase: true, trim: true },
  senderRole: { type: String, enum: [...Object.values(ROLES), 'system'] },
  type: { type: String, enum: Object.values(MESSAGE_TYPE), default: MESSAGE_TYPE.PUBLIC },
  body: { type: String, required: true },          // sanitized HTML/text
  attachments: [{ filename: String, url: String, mimeType: String, size: Number }],
  source: { type: String, enum: Object.values(MESSAGE_SOURCE), default: MESSAGE_SOURCE.WEB },
  // Email metadata (for dedupe + troubleshooting)
  emailMessageId: { type: String },
  emailMeta: { inReplyTo: String, references: [String], subject: String, rawHeaders: Object },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

// Prevent duplicate inbound emails per ticket
ticketMessageSchema.index(
  { ticketId: 1, emailMessageId: 1 },
  { unique: true, partialFilterExpression: { emailMessageId: { $type: 'string' } } }
);

export const TicketMessage = mongoose.model('TicketMessage', ticketMessageSchema);
