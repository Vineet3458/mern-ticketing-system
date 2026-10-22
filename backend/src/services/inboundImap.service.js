import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { processInboundEmail } from './inboundEmail.service.js';

const MESSAGE_BATCH_SIZE = 25;

let pollTimer = null;
let pollInProgress = false;

const getAddress = (addressHeader) =>
  addressHeader?.value
    ?.flatMap((entry) => entry.group || [entry])
    .find((entry) => entry.address)?.address || '';

const getHeaderText = (headers, name) => {
  const value = headers.get(name);
  return Array.isArray(value) ? value.join(' ') : value?.toString() || '';
};

export const parseImapMessage = async (source) => {
  const parsed = await simpleParser(source);

  return {
    from: getAddress(parsed.from),
    senderName: parsed.from?.value?.find((entry) => entry.address)?.name || '',
    to: [parsed.to, parsed.cc]
      .flatMap((header) => header?.value || [])
      .flatMap((entry) => entry.group || [entry])
      .map((entry) => entry.address)
      .filter(Boolean)
      .join(', '),
    subject: parsed.subject || '',
    body: parsed.text || '',
    html: typeof parsed.html === 'string' ? parsed.html : '',
    messageId: parsed.messageId || '',
    headers: {
      'x-ticket-number': getHeaderText(parsed.headers, 'x-ticket-number'),
      references: getHeaderText(parsed.headers, 'references'),
      'in-reply-to': getHeaderText(parsed.headers, 'in-reply-to'),
    },
  };
};

const pollInbox = async () => {
  const { gmailUser, gmailAppPassword, imapHost, imapPort } = env.email;
  const client = new ImapFlow({
    host: imapHost,
    port: imapPort,
    secure: true,
    auth: {
      user: gmailUser,
      pass: gmailAppPassword.replace(/\s/g, ''),
    },
    logger: false,
    connectionTimeout: 15_000,
    socketTimeout: 30_000,
  });

  client.on('error', (error) => {
    logger.error('[InboundIMAP] Connection error:', error.message);
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');

    try {
      const uids = await client.search({ seen: false }, { uid: true });
      if (uids === false || uids === undefined) {
        throw new Error('Gmail IMAP did not return the unread message search result');
      }

      for (let offset = 0; offset < uids.length; offset += MESSAGE_BATCH_SIZE) {
        const batch = uids.slice(offset, offset + MESSAGE_BATCH_SIZE);
        const messages = [];

        for await (const message of client.fetch(batch, { uid: true, source: true }, { uid: true })) {
          if (message.source) messages.push(message);
        }

        for (const message of messages) {
          try {
            const inboundMessage = await parseImapMessage(message.source);
            const result = await processInboundEmail(inboundMessage);
            await client.messageFlagsAdd(message.uid, ['\\Seen'], { uid: true });
            logger.info(
              `[InboundIMAP] Processed UID ${message.uid}: ${result.status} ${inboundMessage.messageId || '(no Message-ID)'}`
            );
          } catch (error) {
            logger.error(`[InboundIMAP] Failed to process UID ${message.uid}; it will be retried:`, error.message);
          }
        }
      }
    } finally {
      lock.release();
    }
  } finally {
    if (client.usable) {
      await client.logout();
    } else {
      client.close();
    }
  }
};

const runPoll = async () => {
  if (pollInProgress) return;
  pollInProgress = true;

  try {
    await pollInbox();
  } catch (error) {
    logger.error('[InboundIMAP] Inbox polling failed; it will retry on the next interval:', error.message);
  } finally {
    pollInProgress = false;
  }
};

export const startInboundImap = () => {
  if (!env.email.imapEnabled) {
    logger.info('[InboundIMAP] Polling disabled; set GMAIL_IMAP_ENABLED=true to receive replies from Gmail');
    return;
  }

  if (
    !env.email.gmailUser ||
    !env.email.gmailAppPassword ||
    /^x{4}(?:\s*x{4}){3}$/i.test(env.email.gmailAppPassword.trim())
  ) {
    logger.warn('[InboundIMAP] Polling enabled but GMAIL_USER or a real GMAIL_APP_PASSWORD is not configured');
    return;
  }

  if (pollTimer) return;

  logger.info(
    `[InboundIMAP] Polling ${env.email.imapHost}:${env.email.imapPort}/INBOX every ${env.email.imapPollIntervalMs}ms`
  );
  void runPoll();
  pollTimer = setInterval(() => void runPoll(), env.email.imapPollIntervalMs);
  pollTimer.unref();
};

export const stopInboundImap = () => {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
};
