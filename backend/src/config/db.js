import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

export const connectDB = async () => {
  mongoose.set('strictQuery', true);

  mongoose.connection.on('error', (err) => {
    logger.error(`[MongoDB] Connection error: ${err.message}`);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('[MongoDB] Connection lost');
  });

  const localUri = 'mongodb://127.0.0.1:27017/ticketing_system';

  try {
    await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    // Actively verify that the connection and replica set primary are reachable
    await mongoose.connection.db.admin().ping();
    logger.info('MongoDB connected successfully');
  } catch (err) {
    logger.warn(`Could not connect to configured MONGO_URI (${err.message})`);
    if (
      err.message?.includes('whitelist') ||
      err.message?.includes('SSL alert') ||
      err.message?.includes('tlsv1')
    ) {
      logger.warn(
        '[MongoDB Atlas] ⚠️ IP Whitelist Notice: Check https://cloud.mongodb.com -> Network Access to whitelist your current IP address (or 0.0.0.0/0 for development).'
      );
    }
    logger.info(`Falling back to local MongoDB instance (${localUri})...`);
    try {
      await mongoose.disconnect();
    } catch (_) {}

    try {
      await mongoose.connect(localUri, { serverSelectionTimeoutMS: 5000 });
      await mongoose.connection.db.admin().ping();
      logger.info('MongoDB connected to local instance successfully');
    } catch (localErr) {
      logger.error(`Failed to connect to local MongoDB (${localErr.message})`);
      throw localErr;
    }
  }
};

