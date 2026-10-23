import dotenv from 'dotenv';
dotenv.config();

const required = ['MONGO_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing required env variable: ${key}`);
}

const isHosted = Boolean(process.env.RENDER_EXTERNAL_URL || process.env.VERCEL);
const nodeEnv = process.env.NODE_ENV || (isHosted ? 'production' : 'development');
const emailProvider = process.env.EMAIL_PROVIDER || 'smtp';
if (!['smtp', 'apps_script'].includes(emailProvider)) {
  throw new Error('EMAIL_PROVIDER must be either "smtp" or "apps_script"');
}
if (emailProvider === 'apps_script') {
  if (!process.env.APPS_SCRIPT_URL || !process.env.APPS_SCRIPT_SECRET) {
    throw new Error('APPS_SCRIPT_URL and APPS_SCRIPT_SECRET are required when EMAIL_PROVIDER=apps_script');
  }
  if (!/^https:\/\/[^/]+/i.test(process.env.APPS_SCRIPT_URL)) {
    throw new Error('APPS_SCRIPT_URL must be an HTTPS URL');
  }
}

const clientUrls = (
  process.env.CLIENT_URL ||
  process.env.RENDER_EXTERNAL_URL ||
  'http://localhost:5173'
)
  .split(',')
  .map((url) => url.trim().replace(/\/+$/, ''))
  .filter(Boolean);

export const env = {
  nodeEnv,
  port: Number(process.env.PORT) || 5000,
  serveFrontend: process.env.SERVE_FRONTEND !== 'false',
  clientUrl: clientUrls[0],
  clientUrls,
  mongoUri: process.env.MONGO_URI,
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
  },
  otp: {
    expiresMinutes: Number(process.env.OTP_EXPIRES_MINUTES) || 5,
    maxAttempts: Number(process.env.OTP_MAX_ATTEMPTS) || 5,
  },
  email: {
    provider: emailProvider,
    appsScriptUrl: process.env.APPS_SCRIPT_URL || '',
    appsScriptSecret: process.env.APPS_SCRIPT_SECRET || '',
    gmailUser: process.env.GMAIL_USER || '',
    gmailAppPassword: process.env.GMAIL_APP_PASSWORD || '',
    from: process.env.EMAIL_FROM || `BitMax Support <${process.env.GMAIL_USER || 'noreply@bitmax.local'}>`,
    imapEnabled: process.env.GMAIL_IMAP_ENABLED === 'true',
    imapHost: process.env.GMAIL_IMAP_HOST || 'imap.gmail.com',
    imapPort: Number(process.env.GMAIL_IMAP_PORT) || 993,
    imapPollIntervalMs: Number(process.env.GMAIL_IMAP_POLL_INTERVAL_MS) || 60_000,
  },
  isProd: nodeEnv === 'production',
  isDev: nodeEnv === 'development',
  isTest: nodeEnv === 'test',
};
