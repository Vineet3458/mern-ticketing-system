import crypto from 'crypto';

/**
 * Generate a cryptographically secure numeric OTP using Node.js built-in crypto.
 * @param {number} length - Number of digits (default 6)
 * @returns {string} - Generated OTP string
 */
export const generateOTP = (length = 6) => {
  const min = 10 ** (length - 1);
  const max = 10 ** length;
  return crypto.randomInt(min, max).toString();
};

/**
 * Hash an OTP using Node.js built-in crypto (HMAC-SHA256 with random salt).
 * @param {string|number} otp - Plaintext OTP
 * @returns {Promise<string>} - Salted hash formatted as `salt:hash`
 */
export const hashOTP = async (otp) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHmac('sha256', salt).update(String(otp)).digest('hex');
  return `${salt}:${hash}`;
};

/**
 * Compare candidate OTP against stored hash using crypto.timingSafeEqual to prevent timing attacks.
 * Supports backwards compatibility for legacy bcrypt hashes.
 * @param {string|number} candidate - Candidate OTP entered by user
 * @param {string} storedHash - Stored hash string
 * @returns {Promise<boolean>} - True if matching, false otherwise
 */
export const compareOTP = async (candidate, storedHash) => {
  if (!candidate || !storedHash) return false;

  try {
    // Graceful fallback for legacy bcrypt hashes
    if (typeof storedHash === 'string' && storedHash.startsWith('$2')) {
      const bcrypt = (await import('bcryptjs')).default;
      return bcrypt.compare(String(candidate), storedHash);
    }

    const parts = storedHash.split(':');
    if (parts.length !== 2) return false;

    const [salt, expectedHash] = parts;
    const computedHash = crypto.createHmac('sha256', salt).update(String(candidate)).digest('hex');

    const expectedBuffer = Buffer.from(expectedHash, 'hex');
    const computedBuffer = Buffer.from(computedHash, 'hex');

    if (expectedBuffer.length !== computedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, computedBuffer);
  } catch {
    return false;
  }
};

