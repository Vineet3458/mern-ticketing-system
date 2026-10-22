import nodemailer from 'nodemailer';
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
  ticketEventTemplate,
  otpTemplate,
} from '../templates/email/index.js';

// ─────────────────────────────────────────────────────────────────────────────
// Nodemailer transporter singleton — Gmail SMTP via App Password
// ─────────────────────────────────────────────────────────────────────────────
let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  const { gmailUser, gmailAppPassword } = env.email;

  if (!gmailUser || !gmailAppPassword || gmailAppPassword === 'your_16_char_app_password_here') {
    logger.warn('╔══════════════════════════════════════════════════════════');
    logger.warn('║  [Email] ⚠️  Gmail SMTP not configured — emails will be');
    logger.warn('║  logged to console instead of sent.');
    logger.warn('║');
    logger.warn('║  To enable real email delivery:');
    logger.warn('║  1. Enable 2-Step Verification on your Google account');
    logger.warn('║  2. Visit https://myaccount.google.com/apppasswords');
    logger.warn('║  3. Create an App Password for "Mail"');
    logger.warn('║  4. Set in .env:');
    logger.warn('║     GMAIL_USER=your@gmail.com');
    logger.warn('║     GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx');
    logger.warn('╚══════════════════════════════════════════════════════════');
    return null;
  }

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailAppPassword.replace(/\s/g, ''), // strip spaces from app password
    },
  });

  logger.info(`[Email] ✅ Nodemailer Gmail transporter initialized (${gmailUser})`);
  return transporter;
};

// ─────────────────────────────────────────────────────────────────────────────
// Console fallback used when SMTP is not configured.
// ─────────────────────────────────────────────────────────────────────────────
const logEmailToConsole = ({ to, subject, html, ticketNumber, sensitive = false }) => {
  const previewText = sensitive
    ? '(redacted)'
    : (html ? html.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, 400) : '(no body)');

  logger.warn('╔══════════════════════════════════════════════════════════');
  logger.warn('║  [DEV EMAIL — printed to console, SMTP not configured]');
  logger.warn(`║  📬 To      : ${Array.isArray(to) ? to.join(', ') : to}`);
  logger.warn(`║  📌 Subject : ${subject}`);
  if (ticketNumber) logger.warn(`║  🎫 Ticket  : ${ticketNumber}`);
  logger.warn(`║  📝 Preview : ${previewText}...`);
  logger.warn('╚══════════════════════════════════════════════════════════');
};

// ─────────────────────────────────────────────────────────────────────────────
// Core send function — used by the queue handler below
// ─────────────────────────────────────────────────────────────────────────────
export const sendRawEmail = async ({
  to,
  subject,
  html,
  ticketNumber = null,
  ticketId = null,
  sensitive = false,
}) => {
  const transport = getTransporter();
  const toList = Array.isArray(to) ? to : [to];

  // ── No SMTP configured: log to console and persist as skipped_dev ──────────
  if (!transport) {
    logEmailToConsole({ to, subject, html, ticketNumber, sensitive });

    await EmailEvent.create({
      messageId: `dev_console_${Date.now()}`,
      ticketId,
      direction: EMAIL_DIRECTION.OUTBOUND,
      status: EMAIL_STATUS.SKIPPED_DEV,
      error: sensitive
        ? 'Gmail SMTP not configured — email content was redacted from console'
        : 'Gmail SMTP not configured — see console for email content',
      payload: { to, subject, ticketNumber },
      processedAt: new Date(),
    });

    return { success: true, skipped: true, reason: 'smtp_not_configured' };
  }

  // ── Build final subject with ticket number prefix ──────────────────────────
  const finalSubject =
    ticketNumber && !subject.includes(ticketNumber)
      ? `[${ticketNumber}] ${subject}`
      : subject;

  try {
    const info = await transport.sendMail({
      from: env.email.from,
      to: toList.join(', '),
      subject: finalSubject,
      html,
      ...(ticketNumber && env.email.inboundAddress ? { replyTo: env.email.inboundAddress } : {}),
      // Email threading headers (for ticket conversations)
      headers: ticketNumber
        ? {
            'X-Ticket-Number': ticketNumber,
            References: `<ticket-${ticketNumber}@bitmax.support>`,
            'In-Reply-To': `<ticket-${ticketNumber}@bitmax.support>`,
          }
        : {},
    });

    logger.info(
      `[Email] ✅ Sent — To: ${toList.join(', ')} | Subject: "${finalSubject}" | MsgID: ${info.messageId}`
    );

    await EmailEvent.create({
      providerMessageId: info.messageId,
      messageId: info.messageId,
      ticketId,
      direction: EMAIL_DIRECTION.OUTBOUND,
      status: EMAIL_STATUS.SENT,
      payload: { to, subject: finalSubject, ticketNumber },
      processedAt: new Date(),
    });

    return { success: true, id: info.messageId };
  } catch (err) {
    logger.error(`[Email] ❌ Failed to send to ${toList.join(', ')}:`, err.message);

    await EmailEvent.create({
      messageId: `failed_${Date.now()}`,
      ticketId,
      direction: EMAIL_DIRECTION.OUTBOUND,
      status: EMAIL_STATUS.FAILED,
      error: err.message,
      payload: { to, subject: finalSubject, ticketNumber },
      processedAt: new Date(),
    });

    // Never propagate — email failure must never crash an HTTP request
    return { success: false, error: err.message };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Background queue handler — processes jobs from emailQueue
// Each job type maps to a template and a sendRawEmail call
// ─────────────────────────────────────────────────────────────────────────────
emailQueue.setHandler(async (job) => {
  const { type, payload } = job.data;

  switch (type) {
    // ── Customer: ticket confirmation ─────────────────────────────────────────
    case 'TICKET_CREATED':
      await sendRawEmail({
        to: payload.to,
        subject: `Your ticket has been received: ${payload.subject}`,
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

    // ── Agent: new ticket assignment notification ─────────────────────────────
    case 'TICKET_ASSIGNED':
      await sendRawEmail({
        to: payload.to,
        subject: `New ticket assigned to you: ${payload.subject}`,
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

    // ── Ticket reply notification ─────────────────────────────────────────────
    case 'TICKET_REPLY':
      await sendRawEmail({
        to: payload.to,
        subject: `New reply on your ticket: ${payload.subject}`,
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

    // ── Status change notification ────────────────────────────────────────────
    case 'STATUS_CHANGED':
      await sendRawEmail({
        to: payload.to,
        subject: `Ticket status updated [${payload.status}]: ${payload.subject}`,
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

    case 'TICKET_EVENT':
      await sendRawEmail({
        to: payload.to,
        subject: payload.eventTitle,
        html: ticketEventTemplate({
          ticketNumber: payload.ticketNumber,
          subject: payload.subject,
          eventTitle: payload.eventTitle,
          eventDetails: payload.eventDetails,
          clientUrl: env.clientUrl,
        }),
        ticketNumber: payload.ticketNumber,
        ticketId: payload.ticketId,
      });
      break;

    // ── OTP verification email ────────────────────────────────────────────────
    case 'OTP':
      await sendRawEmail({
        to: payload.to,
        subject: 'Your BitMax Verification Code',
        html: otpTemplate({
          otp: payload.otp,
          name: payload.name,
          minutes: env.otp.expiresMinutes,
        }),
        sensitive: true,
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
  /**
   * Queue a ticket-created confirmation email to the customer.
   */
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

  /**
   * Queue a ticket-assigned notification email to the assigned agent.
   */
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

  /**
   * Queue a reply notification email to the recipient (customer or agent).
   */
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

  /**
   * Queue a status-change notification email to the recipient.
   */
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

  queueTicketEvent: (ticket, recipientEmail, eventTitle, eventDetails) => {
    if (!recipientEmail) return;
    emailQueue.add('send_ticket_event', {
      type: 'TICKET_EVENT',
      payload: {
        to: recipientEmail,
        ticketNumber: ticket.ticketNumber,
        ticketId: ticket._id,
        subject: ticket.subject,
        eventTitle,
        eventDetails,
      },
    });
  },

  /**
   * Queue an OTP verification email.
   */
  queueOTP: (to, name, otp) => {
    emailQueue.add('send_otp', {
      type: 'OTP',
      payload: { to, name, otp },
    });
  },
};
