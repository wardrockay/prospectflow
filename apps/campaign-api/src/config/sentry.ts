import * as Sentry from '@sentry/node';
import { execSync } from 'child_process';
import { env } from './env.js';
import { createChildLogger } from '../utils/logger.js';
import { AppError } from '../errors/AppError.js';
import { ZodError } from 'zod';

const logger = createChildLogger('Sentry');

/**
 * Get Git commit SHA for release tracking
 * Falls back to environment variable or package version
 */
const getRelease = (): string => {
  if (env.sentryRelease) {
    return env.sentryRelease;
  }

  try {
    const gitSha = execSync('git rev-parse --short HEAD', {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 1000, // 1 second max to prevent startup hang
    }).trim();
    return `campaign-api@${gitSha}`;
  } catch {
    // Fallback si Git n'est pas disponible (ex: dans un container)
    return `campaign-api@${process.env.npm_package_version ?? 'unknown'}`;
  }
};

export const initSentry = (): void => {
  if (!env.sentryDsn) {
    logger.warn('SENTRY_DSN not configured, error tracking disabled');
    return;
  }

  const release = getRelease();

  Sentry.init({
    dsn: env.sentryDsn,
    environment: env.sentryEnvironment || env.node_env,
    release,
    tracesSampleRate: env.sentryTracesSampleRate,
    beforeSend(event, hint) {
      const error = hint?.originalException as unknown;

      if (error instanceof ZodError) {
        return null;
      }
      if (error instanceof AppError && error.statusCode < 500) {
        return null;
      }
      return event;
    },
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === 'http') {
        if (breadcrumb.data && typeof breadcrumb.data === 'object') {
          // Remove auth headers from breadcrumbs
          if (breadcrumb.data.headers) {
            delete breadcrumb.data.headers.authorization;
            delete breadcrumb.data.headers.cookie;
          }
        }
      }
      return breadcrumb;
    },
  });

  logger.info(
    {
      environment: env.sentryEnvironment || env.node_env,
      release,
    },
    'Sentry initialized',
  );
};

export { Sentry };
