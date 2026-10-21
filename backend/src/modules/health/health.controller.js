import mongoose from 'mongoose';
import { sendResponse } from '../../utils/ApiResponse.js';

export const healthCheck = (req, res) =>
  sendResponse(res, 200, 'Service is healthy', {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
