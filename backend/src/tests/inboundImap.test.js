import { describe, expect, it } from 'vitest';
import { parseImapMessage } from '../services/inboundImap.service.js';
import { isAssignmentNotificationMessage } from '../services/inboundEmail.service.js';

describe('Gmail IMAP message parsing', () => {
  it('extracts ticket conversation fields from a Gmail reply', async () => {
    const message = await parseImapMessage(
      [
        'From: Jane Doe <jane@example.com>',
        'To: support@gmail.com',
        'Subject: Re: [TKT-2026-000123] Cannot access account',
        'Message-ID: <reply-123@example.com>',
        'In-Reply-To: <ticket-TKT-2026-000123@bitmax.support>',
        'References: <ticket-TKT-2026-000123@bitmax.support>',
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=utf-8',
        '',
        'I still cannot access my account.',
      ].join('\r\n')
    );

    expect(message).toMatchObject({
      from: 'jane@example.com',
      senderName: 'Jane Doe',
      to: 'support@gmail.com',
      subject: 'Re: [TKT-2026-000123] Cannot access account',
      body: 'I still cannot access my account.',
      messageId: '<reply-123@example.com>',
      headers: {
        'in-reply-to': '<ticket-TKT-2026-000123@bitmax.support>',
        references: '<ticket-TKT-2026-000123@bitmax.support>',
      },
    });
  });

  describe('ticket assignment notification filtering', () => {
    it('recognizes requester assignment notification emails as system messages', () => {
      expect(
        isAssignmentNotificationMessage(
          'Your ticket has been assigned to Vineet Yadav. View Ticket Details'
        )
      ).toBe(true);
    });

    it('recognizes agent assignment notification emails as system messages', () => {
      expect(
        isAssignmentNotificationMessage(
          'Hello Sarah, a support ticket has been assigned to you for investigation and resolution.'
        )
      ).toBe(true);
    });

    it('does not hide ordinary ticket replies mentioning assignment', () => {
      expect(
        isAssignmentNotificationMessage(
          'I assigned the issue to the support team, but still need help.'
        )
      ).toBe(false);
    });
  });
});
