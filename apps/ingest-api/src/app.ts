// src/app.ts
/// <reference path="./types/express.ts" />
import express from 'express';
import * as Sentry from '@sentry/node';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { correlationIdMiddleware } from './middlewares/correlation-id.middleware.js';
import { loggerMiddleware } from './middlewares/logger.middleware.js';
import { sentryContextMiddleware } from './middlewares/sentry.middleware.js';
import { metricsMiddleware } from './middlewares/metrics.middleware.js';
import { env } from './config/env.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { initSentry } from './config/sentry.js';
import { register, initMetrics } from './config/metrics.js';
import router from './routes/index.js';

// Initialize Sentry BEFORE registering middlewares
initSentry();

// Initialize Prometheus metrics
initMetrics();

const app = express();
// Sentry request/tracing handlers (SDK v7/v8 compatibility)
const requestHandler =
  (Sentry as any).Handlers?.requestHandler?.() ?? ((req: any, _res: any, next: any) => next());
const tracingHandler =
  (Sentry as any).Handlers?.tracingHandler?.() ?? ((_req: any, _res: any, next: any) => next());
const errorHandlerSentry =
  (Sentry as any).Handlers?.errorHandler?.() ??
  ((err: any, _req: any, _res: any, next: any) => next(err));

// Must be first to capture request context
app.use(requestHandler);
// Optional performance tracing handler
app.use(tracingHandler);

// Trust proxy configuration (must be set before security middleware)
app.set('trust proxy', true);

// Security middleware
app.use(helmet());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Correlation ID must come before logger middleware
app.use(correlationIdMiddleware);
app.use(loggerMiddleware);
app.use(metricsMiddleware); // Metrics collection after logger, before routes
app.use(sentryContextMiddleware);

app.use(
  cors({
    origin: env.corsOrigin,
    credentials: true,
  }),
);

app.use('/api/v1', router);

// Health check (no auth required)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Prometheus metrics endpoint (no auth required)
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (error) {
    res.status(500).end(error);
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
  });
});

// Sentry error handler BEFORE custom error handler
app.use(errorHandlerSentry);
// Error handler (must be last)
app.use(errorHandler);

export default app;
