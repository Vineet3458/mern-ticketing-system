import { afterEach, describe, expect, it, vi } from 'vitest';
import { checkEmailRestrictions } from '../utils/emailRestrictions.js';
import { smsService } from '../services/sms.service.js';

describe('removed optional integrations', () => {
  const originalAllowedDomains = process.env.ALLOWED_EMAIL_DOMAINS;
  const originalBlockedDomains = process.env.BLOCKED_EMAIL_DOMAINS;

  afterEach(() => {
    if (originalAllowedDomains === undefined) {
      delete process.env.ALLOWED_EMAIL_DOMAINS;
    } else {
      process.env.ALLOWED_EMAIL_DOMAINS = originalAllowedDomains;
    }
    if (originalBlockedDomains === undefined) {
      delete process.env.BLOCKED_EMAIL_DOMAINS;
    } else {
      process.env.BLOCKED_EMAIL_DOMAINS = originalBlockedDomains;
    }
    vi.unstubAllGlobals();
  });

  it('does not apply removed email domain allow/block lists', () => {
    process.env.ALLOWED_EMAIL_DOMAINS = 'company.example';
    process.env.BLOCKED_EMAIL_DOMAINS = 'example.com';

    expect(checkEmailRestrictions('person@example.com')).toMatchObject({ valid: true });
  });

  it('records phone OTP locally without calling an SMS provider', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await smsService.sendPhoneOTP({
      phone: '+91 9876543210',
      otp: '123456',
      name: 'Test User',
    });

    expect(result).toMatchObject({
      provider: 'console_outbox',
      deliveredToCarrier: false,
      otp: '123456',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
