import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';
import { normalizePhoneNumber, formatDisplayPhone } from '../utils/phoneUtils.js';

class SmsService {
  constructor() {
    this.outbox = [];
  }

  /**
   * Dispatch an OTP SMS to a recipient mobile phone number.
   * Supports:
   * 1. Twilio API (if TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER are present in .env)
   * 2. Fast2SMS API (if FAST2SMS_API_KEY is present in .env)
   * 3. Built-in SMS Outbox & logger with clean E.164 normalization
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

    let providerDispatched = false;
    let providerName = 'console_outbox';

    // 1. Try Twilio if configured in environment
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
    const twilioFrom = process.env.TWILIO_PHONE_NUMBER;

    if (twilioSid && twilioAuth && twilioFrom) {
      try {
        const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
        const auth = Buffer.from(`${twilioSid}:${twilioAuth}`).toString('base64');

        const params = new URLSearchParams();
        params.append('To', e164Phone);
        params.append('From', twilioFrom);
        params.append('Body', textBody);

        const resp = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        });

        const data = await resp.json();
        if (resp.ok) {
          logger.info(`📱 [Twilio SMS] Real SMS dispatched to ${e164Phone}. Twilio SID: ${data.sid}`);
          providerDispatched = true;
          providerName = 'twilio';
        } else {
          logger.error(`❌ [Twilio SMS] Dispatch failed: ${data.message || JSON.stringify(data)}`);
        }
      } catch (err) {
        logger.error(`❌ [Twilio SMS] Error dispatching: ${err.message}`);
      }
    }

    // 2. Try Fast2SMS if configured in environment
    const fast2smsKey = process.env.FAST2SMS_API_KEY;
    const isKeyConfigured = fast2smsKey && !fast2smsKey.startsWith('YOUR_');
    if (!providerDispatched && isKeyConfigured) {
      try {
        const rawDigits = e164Phone.replace(/\D/g, '').slice(-10);
        const resp = await fetch('https://www.fast2sms.com/dev/bulkV2', {
          method: 'POST',
          headers: {
            authorization: fast2smsKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            route: 'otp',
            variables_values: otp,
            numbers: rawDigits,
          }),
        });
        const data = await resp.json();
        if (data.return === true) {
          logger.info(`📱 [Fast2SMS] Real SMS dispatched to +91${rawDigits}. Request ID: ${data.request_id}`);
          providerDispatched = true;
          providerName = 'fast2sms';
        } else {
          logger.error(`❌ [Fast2SMS] Dispatch failed. Status: ${resp.status}. Response: ${JSON.stringify(data)}`);
        }
      } catch (err) {
        logger.error(`❌ [Fast2SMS] Network/parse error: ${err.message}`);
      }
    }

    // Keep the verification code and message body out of application logs.
    logger.info(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    logger.info(`📱 [SMS SERVICE] DISPATCHED TO: ${displayPhone} (${e164Phone})`);
    if (providerDispatched) {
      logger.info(`📡 CARRIER STATUS: Live SMS transmitted via ${providerName}`);
    } else {
      logger.info(`💡 CARRIER NOTE: Live provider ready. Configure TWILIO_* or FAST2SMS_API_KEY in .env to deliver via cellular carrier.`);
    }
    logger.info(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    return {
      success: true,
      messageId,
      phone: e164Phone,
      displayPhone,
      provider: providerName,
      deliveredToCarrier: providerDispatched,
      otp,
    };
  }

  getRecentDispatches() {
    return this.outbox;
  }
}

export const smsService = new SmsService();
