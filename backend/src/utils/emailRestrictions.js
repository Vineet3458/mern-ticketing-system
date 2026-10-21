import { ApiError } from './ApiError.js';

/**
 * Common disposable / temporary / spam email domains to block.
 */
export const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  '10minutemail.com',
  'tempmail.com',
  'temp-mail.org',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.biz',
  'guerrillamail.org',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
  'trashmail.com',
  'trashmail.net',
  'trashmail.org',
  'dispostable.com',
  'sharklasers.com',
  'getairmail.com',
  'throwawaymail.com',
  'getnada.com',
  'nada.ltd',
  'inboxkitten.com',
  'fakemailgenerator.com',
  'mohmal.com',
  'generator.email',
  'crazymailing.com',
  'maildrop.cc',
  'mailnesia.com',
  'burnermail.io',
  'discard.email',
  'tempinbox.com',
  'mytemp.email',
  'dropmail.me',
  'clipmail.eu',
  'fakeinbox.com',
  'trashymail.com',
  'mailcatch.com',
  'tempemail.co',
  'luxusmail.org',
  'byom.de',
  'trash-mail.com',
  'emailfake.com',
  'harakirimail.com',
]);

/**
 * Extract normalized domain from email string.
 * @param {string} email
 * @returns {string}
 */
export const getEmailDomain = (email) => {
  if (!email || typeof email !== 'string') return '';
  const parts = email.trim().toLowerCase().split('@');
  return parts.length === 2 ? parts[1].trim() : '';
};

/**
 * Validate an email against syntax, length, disposable blacklist,
 * and optional allowed/blocked domain lists.
 *
 * @param {string} email - Email candidate to validate
 * @param {object} [options]
 * @param {boolean} [options.disallowDisposable=true] - Disallow known throwaway domains
 * @param {string[]} [options.allowedDomains] - Strict whitelist of domains (if provided)
 * @param {string[]} [options.blockedDomains] - Custom blacklist of domains
 * @returns {{ valid: boolean, reason?: string, domain?: string }}
 */
export const checkEmailRestrictions = (email, options = {}) => {
  const {
    disallowDisposable = true,
    allowedDomains = process.env.ALLOWED_EMAIL_DOMAINS
      ? process.env.ALLOWED_EMAIL_DOMAINS.split(',').map((d) => d.trim().toLowerCase()).filter(Boolean)
      : null,
    blockedDomains = process.env.BLOCKED_EMAIL_DOMAINS
      ? process.env.BLOCKED_EMAIL_DOMAINS.split(',').map((d) => d.trim().toLowerCase()).filter(Boolean)
      : [],
  } = options;

  if (!email || typeof email !== 'string') {
    return { valid: false, reason: 'Email address is required.' };
  }

  const cleanEmail = email.trim().toLowerCase();

  // Length constraint
  if (cleanEmail.length > 100) {
    return { valid: false, reason: 'Email address exceeds maximum allowed length of 100 characters.' };
  }

  // Basic RFC format & anti-injection validation
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(cleanEmail)) {
    return { valid: false, reason: 'Please provide a valid, well-formed email address.' };
  }

  // Reject consecutive dots in local part or domain
  if (cleanEmail.includes('..')) {
    return { valid: false, reason: 'Email addresses cannot contain consecutive periods (..).' };
  }

  const domain = getEmailDomain(cleanEmail);
  if (!domain) {
    return { valid: false, reason: 'Invalid email domain format.' };
  }

  // Check TLD length (e.g. .com, .org, .co.in)
  const tld = domain.split('.').pop();
  if (!tld || tld.length < 2) {
    return { valid: false, reason: 'Email domain has an invalid top-level domain.' };
  }

  // Check disposable email blacklist
  if (disallowDisposable && DISPOSABLE_DOMAINS.has(domain)) {
    return {
      valid: false,
      domain,
      reason: `Email domain "${domain}" is a temporary/disposable service and is not allowed. Please use a permanent email address.`,
    };
  }

  // Check custom blocked domains
  if (blockedDomains && blockedDomains.length > 0) {
    if (blockedDomains.includes(domain)) {
      return {
        valid: false,
        domain,
        reason: `Email domain "${domain}" is restricted and blocked on this platform.`,
      };
    }
  }

  // Check strict whitelist if configured
  if (allowedDomains && allowedDomains.length > 0) {
    if (!allowedDomains.includes(domain)) {
      return {
        valid: false,
        domain,
        reason: `Only email addresses from approved domains (${allowedDomains.join(', ')}) are allowed.`,
      };
    }
  }

  return { valid: true, domain };
};

/**
 * Throws an ApiError.badRequest if the email fails restriction checks.
 * @param {string} email
 * @param {object} [options]
 */
export const assertEmailNotRestricted = (email, options = {}) => {
  const check = checkEmailRestrictions(email, options);
  if (!check.valid) {
    throw ApiError.badRequest(check.reason);
  }
  return check;
};
