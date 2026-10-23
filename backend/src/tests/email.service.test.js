import { afterEach, describe, expect, it, vi } from 'vitest';
import nodemailer from 'nodemailer';
import { EmailEvent } from '../database/index.js';
import { env } from '../config/env.js';
import { sendRawEmail } from '../services/email.service.js';

describe('email delivery without SMTP', () => {
  const originalUser = env.email.gmailUser;
  const originalPassword = env.email.gmailAppPassword;

  afterEach(() => {
    env.email.gmailUser = originalUser;
    env.email.gmailAppPassword = originalPassword;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('does not make external requests when SMTP is not configured', async () => {
    env.email.gmailUser = '';
    env.email.gmailAppPassword = '';
    vi.spyOn(EmailEvent, 'create').mockResolvedValue({});
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await sendRawEmail({
      to: 'customer@example.com',
      subject: 'Ticket update',
      html: '<p>Your ticket was updated.</p>',
      ticketNumber: 'TKT-2026-000001',
    });

    expect(result).toMatchObject({
      success: true,
      skipped: true,
      reason: 'smtp_not_configured',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses Gmail SMTP with STARTTLS on port 587', async () => {
    env.email.gmailUser = 'support@example.com';
    env.email.gmailAppPassword = 'abcd efgh ijkl mnop';
    vi.spyOn(EmailEvent, 'create').mockResolvedValue({});
    const sendMail = vi.fn().mockResolvedValue({ messageId: 'message-123' });
    vi.spyOn(nodemailer, 'createTransport').mockReturnValue({ sendMail });

    const result = await sendRawEmail({
      to: 'customer@example.com',
      subject: 'Ticket update',
      html: '<p>Your ticket was updated.</p>',
    });

    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        requireTLS: true,
        auth: {
          user: 'support@example.com',
          pass: 'abcdefghijklmnop',
        },
      })
    );
    expect(sendMail).toHaveBeenCalledOnce();
    expect(result).toMatchObject({ success: true, id: 'message-123' });
  });
});
