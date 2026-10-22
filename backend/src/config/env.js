import dotenv from 'dotenv';
dotenv.config();

const required = ['MONGO_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing required env variable: ${key}`);
}

const isHosted = Boolean(process.env.RENDER_EXTERNAL_URL || process.env.VERCEL);
const nodeEnv = process.env.NODE_ENV || (isHosted ? 'production' : 'development');

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
    // Gmail SMTP via Nodemailer
    // 1. Enable 2-Step Verification on your Google account
    // 2. Go to https://myaccount.google.com/apppasswords → create App Password
    // 3. Set GMAIL_USER=your@gmail.com and GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
    gmailUser: process.env.GMAIL_USER || '',
    gmailAppPassword: process.env.GMAIL_APP_PASSWORD || '',
    appsScriptUrl: process.env.GOOGLE_APPS_SCRIPT_URL || '',
    appsScriptSecret: process.env.EMAIL_API_SECRET || '',
    from: process.env.EMAIL_FROM || `BitMax Support <${process.env.GMAIL_USER || 'noreply@bitmax.local'}>`,
    inboundAddress: process.env.INBOUND_EMAIL_ADDRESS || process.env.GMAIL_USER || '',
    imapEnabled: process.env.GMAIL_IMAP_ENABLED === 'true',
    imapHost: process.env.GMAIL_IMAP_HOST || 'imap.gmail.com',
    imapPort: Number(process.env.GMAIL_IMAP_PORT) || 993,
    imapPollIntervalMs: Number(process.env.GMAIL_IMAP_POLL_INTERVAL_MS) || 60_000,
  },
  isProd: nodeEnv === 'production',
  isDev: nodeEnv === 'development',
  isTest: nodeEnv === 'test',
};
