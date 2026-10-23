const PROPERTY_KEYS = Object.freeze({
  apiUrl: 'BACKEND_API_URL',
  secret: 'APPS_SCRIPT_SECRET',
  pollStartedAt: 'POLL_STARTED_AT',
});

const MAX_THREADS_PER_POLL = 25;

function doGet() {
  return jsonResponse({ success: true, service: 'ticketing-email' });
}

function doPost(event) {
  try {
    const payload = JSON.parse(event.postData.contents || '{}');
    if (!hasValidSecret(payload.secret)) {
      return jsonResponse({ success: false, error: 'Unauthorized' });
    }

    if (payload.action && payload.action !== 'sendEmail') {
      return jsonResponse({ success: false, error: 'Unsupported action' });
    }

    const email = payload.email || payload;
    const html = typeof email.html === 'string' ? email.html.trim() : '';
    const text = typeof email.text === 'string' ? email.text.trim() : '';
    const recipients = typeof email.to === 'string'
      ? email.to.split(',').map((address) => address.trim()).filter(Boolean)
      : [];
    if (
      !recipients.length ||
      recipients.some((address) => !isValidEmail(address)) ||
      typeof email.subject !== 'string' ||
      !email.subject.trim() ||
      (!html && !text) ||
      email.subject.length > 200 ||
      html.length > 100000 ||
      text.length > 100000
    ) {
      return jsonResponse({ success: false, error: 'Invalid email payload' });
    }

    if (MailApp.getRemainingDailyQuota() < recipients.length) {
      return jsonResponse({ success: false, error: 'Daily email quota exceeded' });
    }

    GmailApp.sendEmail(
      recipients.join(','),
      email.subject,
      text || htmlToPlainText(html),
      {
        ...(html ? { htmlBody: html } : {}),
        name: 'BitMax Support',
        ...(isValidEmail(email.replyTo) ? { replyTo: email.replyTo } : {}),
      }
    );

    return jsonResponse({
      success: true,
      messageId: 'apps-script-' + Utilities.getUuid(),
    });
  } catch (error) {
    console.error('Email request failed: ' + error.message);
    return jsonResponse({ success: false, error: 'Email request failed' });
  }
}

function setupInboundPolling() {
  const properties = PropertiesService.getScriptProperties();
  requireProperties([PROPERTY_KEYS.apiUrl, PROPERTY_KEYS.secret]);

  if (!properties.getProperty(PROPERTY_KEYS.pollStartedAt)) {
    properties.setProperty(PROPERTY_KEYS.pollStartedAt, String(Date.now()));
  }

  ScriptApp.getProjectTriggers()
    .filter((trigger) => trigger.getHandlerFunction() === 'pollInbox')
    .forEach((trigger) => ScriptApp.deleteTrigger(trigger));

  ScriptApp.newTrigger('pollInbox').timeBased().everyMinutes(1).create();
}

function pollInbox() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;

  try {
    const config = requireProperties([
      PROPERTY_KEYS.apiUrl,
      PROPERTY_KEYS.secret,
      PROPERTY_KEYS.pollStartedAt,
    ]);
    const startedAt = Number(config[PROPERTY_KEYS.pollStartedAt]);
    if (!Number.isFinite(startedAt)) {
      throw new Error('Invalid inbox polling start time');
    }

    const afterDate = Utilities.formatDate(new Date(startedAt), 'GMT', 'yyyy/MM/dd');
    const threads = GmailApp.search('in:inbox is:unread after:' + afterDate, 0, MAX_THREADS_PER_POLL);

    threads.forEach((thread) => {
      thread.getMessages().forEach((message) => {
        if (!message.isUnread() || message.getDate().getTime() < startedAt) return;

        try {
          const response = forwardReply(config, message);
          const status = response.getResponseCode();
          if (status === 200 || status === 400) {
            message.markRead();
            return;
          }
          console.error('Backend rejected inbox message with HTTP ' + status + '; message left unread');
        } catch (error) {
          console.error('Could not forward inbox message; message left unread: ' + error.message);
        }
      });
    });
  } finally {
    lock.releaseLock();
  }
}

function forwardReply(config, message) {
  const from = message.getFrom();
  const addressMatch = from.match(/<([^>]+)>/);
  const emailFrom = (addressMatch ? addressMatch[1] : from).trim();
  const nameMatch = from.match(/^([^<]+)</);
  const references = message.getHeader('References') || '';
  const inReplyTo = message.getHeader('In-Reply-To') || '';
  const ticketHeader = message.getHeader('X-Ticket-Number') || '';
  const messageId = message.getHeader('Message-ID') || 'gmail-' + message.getId();

  return UrlFetchApp.fetch(config[PROPERTY_KEYS.apiUrl].replace(/\/+$/, '') + '/api/email/inbound/apps-script', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      secret: config[PROPERTY_KEYS.secret],
      from: emailFrom,
      senderName: nameMatch ? nameMatch[1].trim().replace(/^"|"$/g, '') : '',
      to: message.getTo() || '',
      subject: message.getSubject(),
      body: message.getPlainBody().slice(0, 100000),
      messageId,
      headers: {
        'x-ticket-number': ticketHeader,
        references,
        'in-reply-to': inReplyTo,
      },
    }),
    muteHttpExceptions: true,
  });
}

function testSendEmail() {
  const supportEmail = Session.getEffectiveUser().getEmail();
  if (!isValidEmail(supportEmail)) {
    throw new Error('Unable to determine the script owner email address');
  }
  GmailApp.sendEmail(
    supportEmail,
    'Ticketing email integration test',
    'This confirms Apps Script can send email from the configured Gmail account.'
  );
}

function hasValidSecret(candidate) {
  const expected = getSharedSecret();
  if (typeof candidate !== 'string' || !expected || candidate.length !== expected.length) return false;

  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= expected.charCodeAt(index) ^ candidate.charCodeAt(index);
  }
  return difference === 0;
}

function getSharedSecret() {
  const properties = PropertiesService.getScriptProperties();
  return properties.getProperty(PROPERTY_KEYS.secret) || properties.getProperty('EMAIL_API_SECRET') || '';
}

function requireProperties(keys) {
  const properties = PropertiesService.getScriptProperties();
  const values = Object.fromEntries(keys.map((key) => [key, properties.getProperty(key) || '']));
  if (keys.includes(PROPERTY_KEYS.secret) && !values[PROPERTY_KEYS.secret]) {
    values[PROPERTY_KEYS.secret] = properties.getProperty('EMAIL_API_SECRET') || '';
  }
  const missing = keys.filter((key) => !values[key]);
  if (missing.length) throw new Error('Missing Script Properties: ' + missing.join(', '));
  if (values[PROPERTY_KEYS.apiUrl] && !/^https:\/\/[^/]+/i.test(values[PROPERTY_KEYS.apiUrl])) {
    throw new Error('BACKEND_API_URL must be an HTTPS origin');
  }
  return values;
}

function isValidEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function htmlToPlainText(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function jsonResponse(body) {
  return ContentService.createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}
