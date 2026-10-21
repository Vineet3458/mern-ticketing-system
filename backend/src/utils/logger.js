// Simple logger. Can be swapped for Winston/Pino later without touching callers.
const log = (level, msg, ...rest) =>
  console[level === 'error' ? 'error' : 'log'](`[${new Date().toISOString()}] [${level.toUpperCase()}]`, msg, ...rest);

export const logger = {
  info: (m, ...r) => log('info', m, ...r),
  warn: (m, ...r) => log('warn', m, ...r),
  error: (m, ...r) => log('error', m, ...r),
};
