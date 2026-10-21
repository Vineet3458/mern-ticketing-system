import rateLimit from 'express-rate-limit';

const make = (windowMs, max, message) =>
  rateLimit({ windowMs, max, standardHeaders: true, legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ success: false, message, errors: null }) });

export const globalLimiter = make(15 * 60 * 1000, 300, 'Too many requests, please try again later');
export const authLimiter = make(15 * 60 * 1000, 20, 'Too many auth attempts, try again later');
export const otpLimiter = make(10 * 60 * 1000, 5, 'Too many OTP requests, try again later');
export const ticketCreateLimiter = make(60 * 60 * 1000, 30, 'Ticket creation limit reached');
export const inboundEmailLimiter = make(60 * 1000, 60, 'Inbound email rate limit exceeded');
