/**
 * Indian Phone Number Normalization & Validation Utility
 * Supports only Indian (+91) mobile numbers.
 * Valid Indian mobiles: 10 digits, starting with 6, 7, 8, or 9.
 */

/**
 * Normalizes an Indian phone number to E.164 canonical format.
 * Examples:
 *   "9876543210"       → "+919876543210"
 *   "+91 9876543210"   → "+919876543210"
 *   "+91 98765 43210"  → "+919876543210"
 *   "09876543210"      → "+919876543210" (strips leading trunk 0)
 *   "919876543210"     → "+919876543210" (strips leading 91 prefix)
 *
 * @param {string} rawPhone
 * @returns {string} E.164 formatted phone number e.g. "+919876543210"
 */
export const normalizePhoneNumber = (rawPhone) => {
  if (!rawPhone) return '';

  // Strip all non-digit characters except leading '+'
  let cleaned = String(rawPhone).trim();

  // Remove everything except digits
  let digits = cleaned.replace(/\D/g, '');

  // Strip leading trunk '0' (e.g. 09876543210 → 9876543210)
  if (digits.startsWith('0') && digits.length === 11) {
    digits = digits.slice(1);
  }

  // Strip country code '91' prefix (e.g. 919876543210 → 9876543210)
  if (digits.startsWith('91') && digits.length === 12) {
    digits = digits.slice(2);
  }

  // Must now be exactly 10 digits
  if (digits.length !== 10) {
    // Return as-is with + prefix for graceful fallback
    return `+91${digits}`;
  }

  return `+91${digits}`;
};

/**
 * Format phone number for human-friendly display.
 * e.g. "+919876543210" → "+91 98765 43210"
 *
 * @param {string} phone
 * @returns {string}
 */
export const formatDisplayPhone = (phone) => {
  if (!phone) return '';
  const normalized = normalizePhoneNumber(phone);
  if (normalized.startsWith('+91') && normalized.length === 13) {
    const national = normalized.slice(3); // 10 digits
    return `+91 ${national.slice(0, 5)} ${national.slice(5)}`;
  }
  return normalized;
};

/**
 * Validates whether the phone is a valid Indian mobile number.
 * Rules:
 *   - Exactly 10 national digits
 *   - Starts with 6, 7, 8, or 9
 *
 * @param {string} rawPhone
 * @returns {boolean}
 */
export const isValidPhoneNumber = (rawPhone) => {
  if (!rawPhone || typeof rawPhone !== 'string') return false;
  const normalized = normalizePhoneNumber(rawPhone);

  // E.164 Indian mobile: +91 followed by exactly 10 digits starting with 6-9
  return /^\+91[6-9]\d{9}$/.test(normalized);
};

/**
 * Builds a flexible MongoDB query to find a user by Indian phone number
 * regardless of how it was stored (E.164, national, display format).
 *
 * @param {string} inputPhone
 * @returns {object} Mongoose $or query object
 */
export const buildPhoneQuery = (inputPhone) => {
  const raw = String(inputPhone || '').trim();
  const normalized = normalizePhoneNumber(raw);
  const digits = raw.replace(/\D/g, '');
  const last10 = digits.length >= 10 ? digits.slice(-10) : digits;

  return {
    $or: [
      { phone: raw },
      { phone: normalized },
      { phone: formatDisplayPhone(normalized) },
      { phone: new RegExp(`${last10}$`) },
    ],
  };
};
