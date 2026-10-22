import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export const errorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let errors = err.errors || null;

  if (err.name === 'ValidationError' && err.errors && !err.isOperational) {
    statusCode = 400; message = 'Validation failed';
    errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err.code === 11000) {
    statusCode = 409; message = 'Duplicate value: ' + Object.keys(err.keyValue || {}).join(', ');
  } else if (err.name === 'CastError') {
    statusCode = 400; message = `Invalid ${err.path}`;
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401; message = 'Invalid or expired token';
  }

  if (statusCode >= 500) logger.error(err);

  res.status(statusCode).json({
    success: false,
    message: statusCode >= 500 && env.isProd ? 'Internal server error' : message,
    errors,
    ...(env.isProd ? {} : { stack: err.stack }),
  });
};
