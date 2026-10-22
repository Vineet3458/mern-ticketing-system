import { afterEach, describe, expect, it, vi } from 'vitest';
import nodemailer from 'nodemailer';
import { EmailEvent } from '../database/index.js';
import { env } from '../config/env.js';
import { sendRawEmail } from '../services/email.service.js';

describe('Google Apps Script email fallback', () => {
  const originalUrl = env.email.appsScriptUrl;
  const originalSecret = env.email.appsScriptSecret;
  const originalUser = env.email.gmailUser;
  const originalPassword = env.email.gmailAppPassword;

  afterEach(() => {
    env.email.appsScriptUrl = originalUrl;
    env.email.appsScriptSecret = originalSecret;
    env.email.gmailUser = originalUser;
    env.email.gmailAppPassword = originalPassword;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('uses Apps Script when SMTP is not configured', async () => {
    env.email.appsScriptUrl = 'https://script.google.com/macros/s/example/exec';
    env.email.appsScriptSecret = 'test-secret';
    env.email.gmailUser = '';
    env.email.gmailAppPassword = '';
    vi.spyOn(EmailEvent, 'create').mockResolvedValue({});
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, messageId: 'apps-script-message-id' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await sendRawEmail({
      to: 'customer@example.com',
      subject: 'Ticket update',
      html: '<p>Your ticket was updated.</p>',
      ticketNumber: 'TKT-2026-000001',
    });

    expect(result).toEqual({ success: true, id: 'apps-script-message-id' });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [, request] = fetchMock.mock.calls[0];
    expect(JSON.parse(request.body)).toMatchObject({
      secret: 'test-secret',
      to: 'customer@example.com',
      subject: '[TKT-2026-000001] Ticket update',
      html: '<p>Your ticket was updated.</p>',
    });
  });

  it('uses Apps Script when SMTP fails because its connection is unavailable', async () => {
    env.email.appsScriptUrl = 'https://script.google.com/macros/s/example/exec';
    env.email.appsScriptSecret = 'test-secret';
    env.email.gmailUser = 'sender@example.com';
    env.email.gmailAppPassword = 'test-password';
    vi.spyOn(EmailEvent, 'create').mockResolvedValue({});
    const sendMail = vi.fn().mockRejectedValue(new Error('SMTP connection timed out'));
    vi.spyOn(nodemailer, 'createTransport').mockReturnValue({ sendMail });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, messageId: 'fallback-message-id' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await sendRawEmail({
      to: 'customer@example.com',
      subject: 'Ticket update',
      html: '<p>Your ticket was updated.</p>',
    });

    expect(sendMail).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(result).toMatchObject({
      success: true,
      id: 'fallback-message-id',
      fallback: 'google_apps_script',
    });
  });

  it('returns a delivery error when Apps Script fallback fails after SMTP fails', async () => {
    env.email.appsScriptUrl = 'https://script.google.com/macros/s/example/exec';
    env.email.appsScriptSecret = 'test-secret';
    env.email.gmailUser = 'sender@example.com';
    env.email.gmailAppPassword = 'test-password';
    vi.spyOn(EmailEvent, 'create').mockResolvedValue({});
    vi.spyOn(nodemailer, 'createTransport').mockReturnValue({
      sendMail: vi.fn().mockRejectedValue(new Error('SMTP connection timed out')),
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: false, message: 'Unauthorized' }),
    }));

    const result = await sendRawEmail({
      to: 'customer@example.com',
      subject: 'Ticket update',
      html: '<p>Your ticket was updated.</p>',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Google Apps Script fallback failed (Unauthorized)');
  });
});
