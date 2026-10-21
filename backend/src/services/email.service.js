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
  otpTemplate,
} from '../templates/email/index.js';

let transporter = null;

const getTransporter = async () => {
  if (transporter) return transporter;

  if (env.email.host && env.email.user) {
    transporter = nodemailer.createTransport({
      host: env.email.host,
      port: env.email.port,
      secure: env.email.port === 465,
      auth: {
        user: env.email.user,
        pass: env.email.pass,
      },
    });
    logger.info(`[EmailService] Configured SMTP transporter with ${env.email.host}`);
  } else {
    // Development / fallback stream transport
    transporter = nodemailer.createTransport({
      streamTransport: true,
      newline: 'unix',
      buffer: true,
    });
    logger.info('[EmailService] Using simulated local transport (logs emails without external SMTP requirement)');
  }

  return transporter;
};

export const sendRawEmail = async ({
  to,
  subject,
  html,
  text,
  ticketNumber = null,
  ticketId = null,
  headers = {},
}) => {
  try {
    const transport = await getTransporter();
    const messageId = `<${Date.now()}.${Math.random().toString(36).substring(2, 9)}@bitmax.local>`;

    const customHeaders = { ...headers };
    if (ticketNumber) {
      customHeaders['X-Ticket-Number'] = ticketNumber;
      customHeaders['References'] = `<ticket-${ticketNumber}@bitmax.local>`;
      customHeaders['In-Reply-To'] = `<ticket-${ticketNumber}@bitmax.local>`;
    }

    const mailOptions = {
      from: env.email.from,
      to,
      subject: ticketNumber && !subject.includes(ticketNumber) ? `[${ticketNumber}] ${subject}` : subject,
      html,
      text: text || html.replace(/<[^>]*>?/gm, ''),
      messageId,
      replyTo: ticketNumber ? `BitMax Support <support+${ticketNumber}@bitmax.local>` : env.email.from,
      headers: customHeaders,
    };

    const info = await transport.sendMail(mailOptions);

    if (info && info.message) {
      logger.info(`[EmailService Outbound] To: ${to} | Subject: "${mailOptions.subject}" | Message-ID: ${messageId}`);
    }

    // Record outbound email event
    await EmailEvent.create({
      providerMessageId: info?.messageId || messageId,
      messageId,
      ticketId,
      direction: EMAIL_DIRECTION.OUTBOUND,
      status: EMAIL_STATUS.SENT,
      payload: {
        to,
        subject: mailOptions.subject,
        ticketNumber,
      },
      processedAt: new Date(),
    });

    return { success: true, messageId };
  } catch (err) {
    logger.error('[EmailService] Failed to send email:', err.message);

    await EmailEvent.create({
      messageId: `failed_${Date.now()}`,
      ticketId,
      direction: EMAIL_DIRECTION.OUTBOUND,
      status: EMAIL_STATUS.FAILED,
      error: err.message,
      payload: { to, subject, ticketNumber },
      processedAt: new Date(),
    });

    throw err;
  }
};

// Queue processor registration
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
    if (!agent || !agent.email) return;
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

  queueTicketReply: (ticket, reply, recipientEmail, recipientName) => {
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
