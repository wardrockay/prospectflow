// src/app.ts
/// <reference path="./types/express.ts" />
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { loggerMiddleware } from './middlewares/logger.middleware.js';
import { env } from './config/env.js';
import { errorHandler } from './middlewares/error.middleware.js';
import router from './routes/index.js';

const app = express();

// Trust proxy configuration (must be set before security middleware)
app.set('trust proxy', true);

// Security middleware
app.use(helmet());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(loggerMiddleware);

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

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
  });
});

// Error handler (must be last)
app.use(errorHandler);

export default app;
