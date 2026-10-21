import dotenv from 'dotenv';
dotenv.config();

const required = ['MONGO_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing required env variable: ${key}`);
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
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
    // Resend API key — get yours free at https://resend.com
    resendApiKey: process.env.RESEND_API_KEY || '',
    // "From" address — must be a verified domain in your Resend account
    // In dev you can use: onboarding@resend.dev (works without domain verification)
    from: process.env.EMAIL_FROM || 'BitMax Support <onboarding@resend.dev>',
  },
  isProd: process.env.NODE_ENV === 'production',
};

