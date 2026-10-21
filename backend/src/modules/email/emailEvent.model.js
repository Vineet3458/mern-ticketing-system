import mongoose from 'mongoose';
import { EMAIL_DIRECTION, EMAIL_STATUS } from '../../constants/index.js';

const emailEventSchema = new mongoose.Schema(
  {
    providerMessageId: {
      type: String,
      default: null,
      index: true,
    },
    messageId: {
      type: String,
      default: null,
      index: true,
    },
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
      default: null,
      index: true,
    },
    direction: {
      type: String,
      enum: Object.values(EMAIL_DIRECTION),
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(EMAIL_STATUS),
      default: EMAIL_STATUS.PROCESSED,
      index: true,
    },
    error: {
      type: String,
      default: null,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    processedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export const EmailEvent = mongoose.model('EmailEvent', emailEventSchema);
