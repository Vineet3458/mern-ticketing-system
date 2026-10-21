import mongoose from 'mongoose';
import { MESSAGE_TYPE, MESSAGE_SOURCE, ROLES } from '../../constants/index.js';

const ticketMessageSchema = new mongoose.Schema(
  {
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    senderEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    senderName: {
      type: String,
      default: '',
      trim: true,
    },
    senderRole: {
      type: String,
      enum: [...Object.values(ROLES), 'system'],
      default: ROLES.CUSTOMER,
    },
    type: {
      type: String,
      enum: Object.values(MESSAGE_TYPE),
      default: MESSAGE_TYPE.PUBLIC,
      index: true,
    },
    body: {
      type: String,
      required: [true, 'Message body cannot be empty'],
      trim: true,
    },
    attachments: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true },
        size: { type: Number, default: 0 },
        mimeType: { type: String, default: '' },
      },
    ],
    source: {
      type: String,
      enum: Object.values(MESSAGE_SOURCE),
      default: MESSAGE_SOURCE.WEB,
    },
    emailMessageId: {
      type: String,
      default: undefined,
    },
  },
  { timestamps: true }
);

ticketMessageSchema.index({ ticketId: 1, createdAt: 1 });
ticketMessageSchema.index(
  { emailMessageId: 1 },
  { unique: true, partialFilterExpression: { emailMessageId: { $type: 'string' } } }
);

export const TicketMessage = mongoose.model('TicketMessage', ticketMessageSchema);
