import http from 'http';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import app from './app.js';
import { logger } from './utils/logger.js';
import { initSocket } from './services/socket.service.js';

const start = async () => {
  await connectDB();
  const httpServer = http.createServer(app);
  initSocket(httpServer, env.clientUrl);

  httpServer.listen(env.port, () => {
    logger.info(`Server running on port ${env.port} (${env.nodeEnv})`);
    logger.info(`API Documentation: http://localhost:${env.port}/api/docs`);
  });
};

start().catch((err) => {
  logger.error('Failed to start server', err);
  process.exit(1);
});

