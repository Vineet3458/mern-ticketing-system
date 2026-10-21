import { Resend } from 'resend';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { EmailEvent } from '../database/index.js';
import { EMAIL_DIRECTION, EMAIL_STATUS } from '../constants/index.js';
import { emailQueue } from '../queues/email.queue.js';
import {
  ticketCreatedTemplate,
  ticketAssignedTemplate,
  ticketReplyTemplate,
  ticketStatusChangedTemplate,
  otpTemplate,
} from '../templates/email/index.js';

// ─────────────────────────────────────────────────────────────────────────────
// Resend client singleton — created once on first use
// ─────────────────────────────────────────────────────────────────────────────
let resendClient = null;

const getResendClient = () => {
  if (resendClient) return resendClient;

  if (!env.email.resendApiKey) {
    logger.warn('[Resend] ⚠️  RESEND_API_KEY is not set.');
    logger.warn('[Resend] 📝 Get a free API key at https://resend.com and add it to .env as RESEND_API_KEY');
    logger.warn('[Resend] 📧 Emails will be skipped until the key is configured.');
    return null;
  }

  resendClient = new Resend(env.email.resendApiKey);
  logger.info('[Resend] ✅ Resend client initialized successfully');
  return resendClient;
};

// ─────────────────────────────────────────────────────────────────────────────
// Core send function
// ─────────────────────────────────────────────────────────────────────────────
export const sendRawEmail = async ({
  to,
  subject,
  html,
  ticketNumber = null,
  ticketId = null,
  headers = {},
}) => {
  const client = getResendClient();

  // If no API key is configured, log and skip gracefully — never crash
  if (!client) {
    logger.warn(`[Resend] 📭 Email skipped (no API key) — To: ${to} | Subject: "${subject}"`);
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  try {
    // Build the final subject with ticket number prefix when applicable
    const finalSubject =
      ticketNumber && !subject.includes(ticketNumber)
        ? `[${ticketNumber}] ${subject}`
        : subject;

    // Build custom email headers for threading in email clients
    const customHeaders = { ...headers };
    if (ticketNumber) {
      customHeaders['X-Ticket-Number'] = ticketNumber;
      customHeaders['References'] = `<ticket-${ticketNumber}@bitmax.local>`;
      customHeaders['In-Reply-To'] = `<ticket-${ticketNumber}@bitmax.local>`;
    }

    const { data, error } = await client.emails.send({
      from: env.email.from,
      to: Array.isArray(to) ? to : [to],
      reply_to: ticketNumber
        ? `BitMax Support <support+${ticketNumber}@bitmax.local>`
        : env.email.from,
      subject: finalSubject,
      html,
      headers: customHeaders,
    });

    if (error) {
      throw new Error(error.message || JSON.stringify(error));
    }

    logger.info(`[Resend] ✅ Email sent — To: ${to} | Subject: "${finalSubject}" | ID: ${data.id}`);

    // Persist outbound email event in the database
    await EmailEvent.create({
      providerMessageId: data.id,
      messageId: data.id,
      ticketId,
      direction: EMAIL_DIRECTION.OUTBOUND,
      status: EMAIL_STATUS.SENT,
      payload: { to, subject: finalSubject, ticketNumber },
      processedAt: new Date(),
    });

    return { success: true, id: data.id };
  } catch (err) {
    logger.error(`[Resend] ❌ Failed to send email to ${to}:`, err.message);

    // Persist the failure for audit purposes
    await EmailEvent.create({
      messageId: `failed_${Date.now()}`,
      ticketId,
      direction: EMAIL_DIRECTION.OUTBOUND,
      status: EMAIL_STATUS.FAILED,
      error: err.message,
      payload: { to, subject, ticketNumber },
      processedAt: new Date(),
    });

    // Never propagate — email failure should never crash an HTTP request
    return { success: false, error: err.message };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Background queue handler — processes jobs from emailQueue
// ─────────────────────────────────────────────────────────────────────────────
emailQueue.setHandler(async (job) => {
  const { type, payload } = job.data;

  switch (type) {
    case 'TICKET_CREATED':
      await sendRawEmail({
        to: payload.to,
        subject: `[Created] ${payload.subject}`,
        html: ticketCreatedTemplate({
          ticketNumber: payload.ticketNumber,
          subject: payload.subject,
          description: payload.description,
          priority: payload.priority,
          category: payload.category,
          clientUrl: env.clientUrl,
        }),
        ticketNumber: payload.ticketNumber,
        ticketId: payload.ticketId,
      });
      break;

    case 'TICKET_ASSIGNED':
      await sendRawEmail({
        to: payload.to,
        subject: `[Assigned] ${payload.subject}`,
        html: ticketAssignedTemplate({
          ticketNumber: payload.ticketNumber,
          subject: payload.subject,
          assignedAgentName: payload.assignedAgentName,
          clientUrl: env.clientUrl,
        }),
        ticketNumber: payload.ticketNumber,
        ticketId: payload.ticketId,
      });
      break;

    case 'TICKET_REPLY':
      await sendRawEmail({
        to: payload.to,
        subject: `[Reply] ${payload.subject}`,
        html: ticketReplyTemplate({
          ticketNumber: payload.ticketNumber,
          subject: payload.subject,
          senderName: payload.senderName,
          replyBody: payload.replyBody,
          clientUrl: env.clientUrl,
        }),
        ticketNumber: payload.ticketNumber,
        ticketId: payload.ticketId,
      });
      break;

    case 'STATUS_CHANGED':
      await sendRawEmail({
        to: payload.to,
        subject: `[Status: ${payload.status}] ${payload.subject}`,
        html: ticketStatusChangedTemplate({
          ticketNumber: payload.ticketNumber,
          subject: payload.subject,
          status: payload.status,
          actorName: payload.actorName,
          clientUrl: env.clientUrl,
        }),
        ticketNumber: payload.ticketNumber,
        ticketId: payload.ticketId,
      });
      break;

    case 'OTP':
      await sendRawEmail({
        to: payload.to,
        subject: 'Your BitMax Verification Code',
        html: otpTemplate({
          otp: payload.otp,
          name: payload.name,
          minutes: env.otp.expiresMinutes,
        }),
      });
      break;

    default:
      logger.warn(`[EmailQueue] Unknown job type: ${type}`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Public service API — called by ticket & auth services
// ─────────────────────────────────────────────────────────────────────────────
export const emailService = {
  queueTicketCreated: (ticket, requester) => {
    emailQueue.add('send_ticket_created', {
      type: 'TICKET_CREATED',
      payload: {
        to: requester.email || ticket.requesterEmail,
        ticketNumber: ticket.ticketNumber,
        ticketId: ticket._id,
        subject: ticket.subject,
        description: ticket.description,
        priority: ticket.priority,
        category: ticket.category,
      },
    });
  },

  queueTicketAssigned: (ticket, agent) => {
    if (!agent?.email) return;
    emailQueue.add('send_ticket_assigned', {
      type: 'TICKET_ASSIGNED',
      payload: {
        to: agent.email,
        ticketNumber: ticket.ticketNumber,
        ticketId: ticket._id,
        subject: ticket.subject,
        assignedAgentName: agent.name,
      },
    });
  },

  queueTicketReply: (ticket, reply, recipientEmail) => {
    if (!recipientEmail) return;
    emailQueue.add('send_ticket_reply', {
      type: 'TICKET_REPLY',
      payload: {
        to: recipientEmail,
        ticketNumber: ticket.ticketNumber,
        ticketId: ticket._id,
        subject: ticket.subject,
        senderName: reply.senderName || 'Support Representative',
        replyBody: reply.body,
      },
    });
  },

  queueStatusChanged: (ticket, actorName, recipientEmail) => {
    if (!recipientEmail) return;
    emailQueue.add('send_status_changed', {
      type: 'STATUS_CHANGED',
      payload: {
        to: recipientEmail,
        ticketNumber: ticket.ticketNumber,
        ticketId: ticket._id,
        subject: ticket.subject,
        status: ticket.status,
        actorName: actorName || 'System',
      },
    });
  },

  queueOTP: (to, name, otp) => {
    emailQueue.add('send_otp', {
      type: 'OTP',
      payload: { to, name, otp },
    });
  },
};
