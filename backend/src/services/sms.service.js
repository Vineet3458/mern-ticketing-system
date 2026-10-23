import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';
import { normalizePhoneNumber, formatDisplayPhone } from '../utils/phoneUtils.js';

class SmsService {
  constructor() {
    this.outbox = [];
  }

  /**
   * Record an OTP SMS locally without dispatching it to an external provider.
   *
   * @param {object} params
   * @param {string} params.phone - Destination mobile phone number (E.164 or national format)
   * @param {string} params.otp - 6-digit verification code
   * @param {string} [params.name] - User name
   * @param {number} [params.expiresMinutes=5] - Expiration duration in minutes
   * @returns {Promise<{ success: boolean, messageId: string, phone: string, provider: string, deliveredToCarrier: boolean, otp: string }>}
   */
  async sendPhoneOTP({ phone, otp, name = 'User', expiresMinutes = env.otp?.expiresMinutes || 5 }) {
    // Canonical E.164 format (+919876543210) and Human-friendly display (+91 98765 43210)
    const e164Phone = normalizePhoneNumber(phone);
    const displayPhone = formatDisplayPhone(e164Phone);

    const messageId = `sms_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const textBody = `[BitMax Support] Hello ${name}, your verification code is ${otp}. Valid for ${expiresMinutes} minutes. Do not share this code with anyone.`;

    const smsRecord = {
      messageId,
      phone: e164Phone,
      displayPhone,
      textBody,
      otp,
      sentAt: new Date(),
    };

    this.outbox.unshift(smsRecord);
    if (this.outbox.length > 50) this.outbox.pop();

    // Keep the verification code and message body out of application logs.
    logger.info(`[SMS SERVICE] OTP recorded locally for ${displayPhone}; no SMS provider is configured.`);

    return {
      success: true,
      messageId,
      phone: e164Phone,
      displayPhone,
      provider: 'console_outbox',
      deliveredToCarrier: false,
      otp,
    };
  }

  getRecentDispatches() {
    return this.outbox;
  }
}

export const smsService = new SmsService();
