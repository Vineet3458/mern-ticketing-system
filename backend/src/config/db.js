import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

export const connectDB = async () => {
  mongoose.set('strictQuery', true);
  try {
    await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 5000 });
    logger.info(`MongoDB connected: ${mongoose.connection.host}`);
  } catch (err) {
    logger.warn(`Could not connect to configured MONGO_URI (${err.message}). Falling back to local MongoDB...`);
    const localUri = 'mongodb://127.0.0.1:27017/ticketing_system';
    await mongoose.connect(localUri, { serverSelectionTimeoutMS: 5000 });
    logger.info(`MongoDB connected to local instance: ${mongoose.connection.host}`);
  }
};

