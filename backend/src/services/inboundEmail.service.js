import sanitizeHtml from 'sanitize-html';
import { Ticket, TicketMessage, TicketActivity, EmailEvent, User } from '../database/index.js';
import {
  EMAIL_DIRECTION,
  EMAIL_STATUS,
  MESSAGE_SOURCE,
  MESSAGE_TYPE,
  TICKET_STATUS,
  ROLES,
} from '../constants/index.js';
import { logger } from '../utils/logger.js';
import { ioService } from './socket.service.js';
import { emailService } from './email.service.js';

// Strip common email quote replies (e.g., "On Sun, Jan 1 wrote:", "-----Original Message-----")
export const stripQuotedEmail = (text = '') => {
  if (!text) return '';
  const lines = text.split(/\r?\n/);
  const cleanLines = [];

  for (const line of lines) {
    // Stop at common reply separators
    if (
      /^On\s+.+wrote:$/i.test(line.trim()) ||
      /^-----Original Message-----/i.test(line.trim()) ||
      /^_{10,}/.test(line.trim()) ||
      /^From:\s+.+/i.test(line.trim()) ||
      line.trim().startsWith('>')
    ) {
      break;
    }
    cleanLines.push(line);
  }

  const result = cleanLines.join('\n').trim();
  return result || text.trim();
};

// Extract ticket number using header matching, reply-to matching, and subject fallback
export const extractTicketIdentifier = ({ headers = {}, to = '', subject = '' }) => {
  // 1. Check explicit X-Ticket-Number header
  if (headers['x-ticket-number']) {
    return headers['x-ticket-number'].trim();
  }

  // 2. Check In-Reply-To or References headers: <ticket-TKT-2026-000001@...>
  const refHeader = headers['references'] || headers['in-reply-to'] || '';
  const refMatch = refHeader.match(/<ticket-(TKT-\d{4}-\d{6})@/i);
  if (refMatch) return refMatch[1];

  // 3. Check To / Delivered-To email tag: support+TKT-2026-000001@domain
  const toAddresses = Array.isArray(to) ? to.join(' ') : to;
  const tagMatch = toAddresses.match(/support\+(TKT-\d{4}-\d{6})@/i);
  if (tagMatch) return tagMatch[1];

  // 4. Fallback: Parse subject for [TKT-2026-000001]
  const subjectMatch = subject.match(/\[(TKT-\d{4}-\d{6})\]/i);
  if (subjectMatch) return subjectMatch[1];

  return null;
};

// Sanitize HTML body to prevent XSS injection
export const sanitizeEmailBody = (htmlOrText = '') => {
  return sanitizeHtml(htmlOrText, {
    allowedTags: ['p', 'br', 'strong', 'em', 'u', 'b', 'i', 'ul', 'ol', 'li', 'span', 'blockquote', 'pre', 'code'],
    allowedAttributes: {
      span: ['style'],
    },
  });
};

export const processInboundEmail = async ({
  from,
  senderName = '',
  to = '',
  subject = '',
  body = '',
  html = '',
  messageId = '',
  headers = {},
  attachments = [],
}) => {
  const normFrom = (from || '').toLowerCase().trim();
  const effectiveMessageId = messageId || `inbound_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  logger.info(`[InboundEmail] Processing incoming email from: ${normFrom} | Message-ID: ${effectiveMessageId}`);

  // 1. Deduplication check
  const existingEvent = await EmailEvent.findOne({
    messageId: effectiveMessageId,
    direction: EMAIL_DIRECTION.INBOUND,
  });

  if (existingEvent) {
    logger.warn(`[InboundEmail] Duplicate email ignored. Message-ID: ${effectiveMessageId}`);
    return {
      success: false,
      status: EMAIL_STATUS.DUPLICATE,
      message: 'Duplicate email message ignored',
    };
  }

  // 2. Extract Ticket Identifier
  const ticketNumber = extractTicketIdentifier({ headers, to, subject });

  if (!ticketNumber) {
    logger.warn(`[InboundEmail] No ticket identifier found in email from: ${normFrom}. Ignoring.`);
    await EmailEvent.create({
      messageId: effectiveMessageId,
      direction: EMAIL_DIRECTION.INBOUND,
      status: EMAIL_STATUS.IGNORED,
      error: 'No valid ticket identifier in headers, recipient address, or subject',
      payload: { from: normFrom, to, subject },
    });
    return {
      success: false,
      status: EMAIL_STATUS.IGNORED,
      message: 'No associated ticket found for email',
    };
  }

  // 3. Find Ticket
  const ticket = await Ticket.findOne({ ticketNumber });
  if (!ticket) {
    logger.warn(`[InboundEmail] Ticket ${ticketNumber} not found in database. Ignoring.`);
    await EmailEvent.create({
      messageId: effectiveMessageId,
      direction: EMAIL_DIRECTION.INBOUND,
      status: EMAIL_STATUS.IGNORED,
      error: `Ticket ${ticketNumber} does not exist`,
      payload: { from: normFrom, to, subject, ticketNumber },
    });
    return {
      success: false,
      status: EMAIL_STATUS.IGNORED,
      message: `Ticket ${ticketNumber} not found`,
    };
  }

  // 4. Verify sender authorization
  const senderUser = await User.findOne({ email: normFrom });
  const assignedUser = ticket.assignedTo
    ? await User.findById(ticket.assignedTo).select('_id email')
    : null;
  const isRequester = ticket.requesterEmail.toLowerCase() === normFrom;
  const isAssignedUser =
    senderUser && assignedUser && senderUser._id.toString() === assignedUser._id.toString();

  if (!isRequester && !isAssignedUser) {
    logger.warn(`[InboundEmail] Unauthorized sender ${normFrom} tried replying to ${ticketNumber}`);
    await EmailEvent.create({
      ticketId: ticket._id,
      messageId: effectiveMessageId,
      direction: EMAIL_DIRECTION.INBOUND,
      status: EMAIL_STATUS.FAILED,
      error: `Sender is not the requester or assigned agent: ${normFrom}`,
      payload: { from: normFrom, to, subject, ticketNumber },
    });
    return {
      success: false,
      status: EMAIL_STATUS.FAILED,
      message: 'Sender is not authorized to reply to this ticket',
    };
  }

  // 5. Clean & sanitize reply content
  const rawContent = body ? stripQuotedEmail(body) : (html ? stripQuotedEmail(html.replace(/<[^>]*>?/gm, '')) : '');
  const cleanBody = sanitizeEmailBody(rawContent || '(Empty email reply content)');

  // 6. Check if ticket is resolved/closed -> reopen workflow
  const wasClosedOrResolved = [TICKET_STATUS.RESOLVED, TICKET_STATUS.CLOSED].includes(ticket.status);
  let oldStatus = ticket.status;

  if (wasClosedOrResolved) {
    ticket.status = TICKET_STATUS.REOPENED;
    ticket.reopenedAt = new Date();
    await ticket.save();

    await TicketActivity.create({
      ticketId: ticket._id,
      actorId: senderUser?._id || null,
      actorName: senderName || senderUser?.name || normFrom,
      action: 'ticket_reopened',
      oldValue: oldStatus,
      newValue: TICKET_STATUS.REOPENED,
      metadata: { reason: 'Customer replied via email', source: 'email' },
    });
    logger.info(`[InboundEmail] Ticket ${ticketNumber} automatically reopened from email reply`);
  }

  // 7. Create TicketMessage
  const senderRole = senderUser?.role || (isRequester ? ROLES.CUSTOMER : ROLES.CUSTOMER);
  const formattedAttachments = (attachments || []).map((att) => ({
    name: att.filename || att.name || 'attachment',
    url: att.url || `/uploads/${att.filename || 'file'}`,
    size: att.size || 0,
    mimeType: att.contentType || att.mimeType || 'application/octet-stream',
  }));

  const message = await TicketMessage.create({
    ticketId: ticket._id,
    senderId: senderUser?._id || null,
    senderEmail: normFrom,
    senderName: senderName || senderUser?.name || normFrom.split('@')[0],
    senderRole,
    type: MESSAGE_TYPE.PUBLIC,
    body: cleanBody,
    attachments: formattedAttachments,
    source: MESSAGE_SOURCE.EMAIL,
    emailMessageId: effectiveMessageId,
  });

  // 8. Update ticket timestamp
  ticket.lastMessageAt = new Date();
  await ticket.save();

  // 9. Create Activity
  await TicketActivity.create({
    ticketId: ticket._id,
    actorId: senderUser?._id || null,
    actorName: senderName || senderUser?.name || normFrom,
    action: 'reply_added',
    newValue: cleanBody.substring(0, 80),
    metadata: { source: 'email', messageId: message._id },
  });

  // 10. Record EmailEvent
  await EmailEvent.create({
    ticketId: ticket._id,
    messageId: effectiveMessageId,
    direction: EMAIL_DIRECTION.INBOUND,
    status: EMAIL_STATUS.PROCESSED,
    payload: {
      from: normFrom,
      to,
      subject,
      ticketNumber,
      messageId: message._id,
    },
    processedAt: new Date(),
  });

  const actorName = senderName || senderUser?.name || normFrom;
  if (wasClosedOrResolved) {
    const statusRecipients = [ticket.requesterEmail, assignedUser?.email]
      .filter(Boolean)
      .map((email) => email.toLowerCase())
      .filter((email, index, all) => all.indexOf(email) === index && email !== normFrom);
    statusRecipients.forEach((email) => emailService.queueStatusChanged(ticket, actorName, email));
    ioService.emitTicketStatusUpdated(ticket._id.toString(), {
      ticketId: ticket._id.toString(),
      ticketNumber: ticket.ticketNumber,
      status: ticket.status,
    });
  }

  const replyRecipient = isRequester ? assignedUser?.email : ticket.requesterEmail;
  if (replyRecipient && replyRecipient.toLowerCase() !== normFrom) {
    emailService.queueTicketReply(ticket, message, replyRecipient);
  }

  // 11. Broadcast via Socket.IO
  ioService.emitTicketMessage(ticket._id.toString(), {
    ticketId: ticket._id.toString(),
    ticketNumber: ticket.ticketNumber,
    message,
    status: ticket.status,
  });

  return {
    success: true,
    status: EMAIL_STATUS.PROCESSED,
    ticketNumber: ticket.ticketNumber,
    messageId: message._id,
    reopened: wasClosedOrResolved,
  };
};
