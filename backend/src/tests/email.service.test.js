import { afterEach, describe, expect, it, vi } from 'vitest';
import nodemailer from 'nodemailer';
import { EmailEvent } from '../database/index.js';
import { env } from '../config/env.js';
import { sendRawEmail } from '../services/email.service.js';

describe('email delivery without SMTP', () => {
  const originalUser = env.email.gmailUser;
  const originalPassword = env.email.gmailAppPassword;
  const originalProvider = env.email.provider;
  const originalAppsScriptUrl = env.email.appsScriptUrl;
  const originalAppsScriptSecret = env.email.appsScriptSecret;

  afterEach(() => {
    env.email.gmailUser = originalUser;
    env.email.gmailAppPassword = originalPassword;
    env.email.provider = originalProvider;
    env.email.appsScriptUrl = originalAppsScriptUrl;
    env.email.appsScriptSecret = originalAppsScriptSecret;
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

  it('sends through the configured Apps Script web app without opening SMTP', async () => {
    env.email.provider = 'apps_script';
    env.email.appsScriptUrl = 'https://script.google.com/macros/s/deployment/exec';
    env.email.appsScriptSecret = 'test-shared-secret';
    vi.spyOn(EmailEvent, 'create').mockResolvedValue({});
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, messageId: 'apps-script-message-123' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const createTransportSpy = vi.spyOn(nodemailer, 'createTransport');

    const result = await sendRawEmail({
      to: 'customer@example.com',
      subject: 'Ticket update',
      html: '<p>Your ticket was updated.</p>',
      ticketNumber: 'TKT-2026-000001',
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      action: 'sendEmail',
      secret: 'test-shared-secret',
      email: {
        to: 'customer@example.com',
        subject: '[TKT-2026-000001] Ticket update',
      },
    });
    expect(createTransportSpy).not.toHaveBeenCalled();
    expect(result).toMatchObject({ success: true, id: 'apps-script-message-123' });
  });

  it('records Apps Script delivery failures instead of reporting success', async () => {
    env.email.provider = 'apps_script';
    env.email.appsScriptUrl = 'https://script.google.com/macros/s/deployment/exec';
    env.email.appsScriptSecret = 'test-shared-secret';
    vi.spyOn(EmailEvent, 'create').mockResolvedValue({});
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: false, error: 'Email request failed' }),
    }));

    const result = await sendRawEmail({
      to: 'customer@example.com',
      subject: 'Ticket update',
      html: '<p>Your ticket was updated.</p>',
    });

    expect(result).toMatchObject({ success: false, error: 'Email request failed' });
    expect(EmailEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed', error: 'Email request failed' })
    );
  });
});
