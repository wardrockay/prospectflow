import { Request, Response, NextFunction } from 'express';
import { httpRequestDuration, httpRequestsTotal } from '../config/metrics.js';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('MetricsMiddleware');

/**
 * Middleware to collect HTTP request metrics
 * Records request duration and count with labels
 */
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();

  // On response finish, record metrics
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000; // Convert to seconds
    const route = req.route?.path || req.path || 'unknown';
    const method = req.method;
    const statusCode = res.statusCode.toString();

    // Record duration histogram
    httpRequestDuration.observe({ method, route, status_code: statusCode }, duration);

    // Increment request counter
    httpRequestsTotal.inc({ method, route, status_code: statusCode });

    // Log slow requests (>1s)
    if (duration > 1) {
      logger.warn({ method, route, statusCode, duration }, 'Slow request detected');
    }
  });

  next();
};
