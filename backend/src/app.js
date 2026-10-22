import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { globalLimiter } from './middleware/rateLimiter.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

import swaggerUi from 'swagger-ui-express';
import { swaggerDocument } from './docs/swagger.js';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();

if (process.env.RENDER_EXTERNAL_URL || process.env.VERCEL) {
  app.set('trust proxy', 1);
}

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: false,
  })
);
app.use(cors({ origin: env.clientUrls, credentials: true }));
app.use(globalLimiter);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use(mongoSanitize()); // MongoDB operator injection protection
app.use(hpp());
app.use(compression());
if (!env.isProd) app.use(morgan('dev'));

// Swagger / OpenAPI documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.get('/api/docs.json', (req, res) => res.json(swaggerDocument));

app.use('/api', routes);

const frontendDist = resolve(dirname(fileURLToPath(import.meta.url)), '../../frontend/dist');
app.use(express.static(frontendDist, { index: false }));
app.get('*', (req, res, next) => {
  if (req.path === '/api' || req.path.startsWith('/api/')) return next();
  return res.sendFile(resolve(frontendDist, 'index.html'), (error) => {
    if (error) next(error);
  });
});

app.use(notFound);
app.use(errorHandler);

export default app;
