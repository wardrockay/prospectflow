// src/utils/logger.types.ts

/**
 * Standard log context included in all log entries
 */
export interface LogContext {
  /** Unique request identifier for tracing */
  requestId?: string;
  /** Module/service name that generated the log */
  module?: string;
  /** User ID from authentication */
  userId?: string;
  /** Organisation ID for multi-tenant context */
  organisationId?: string;
  /** Additional custom fields */
  [key: string]: unknown;
}

/**
 * Performance log entry for operation timing
 */
export interface PerformanceLogEntry {
  /** Operation name (e.g., 'database.query', 'api.external') */
  operation: string;
  /** Duration in milliseconds */
  durationMs: number;
  /** Success or failure */
  success: boolean;
  /** Additional operation metadata */
  metadata?: Record<string, unknown>;
}

/**
 * HTTP request log entry
 */
export interface HttpLogEntry {
  method: string;
  url: string;
  statusCode: number;
  durationMs: number;
  requestId: string;
  userId?: string;
  organisationId?: string;
  userAgent?: string;
  ip?: string;
}

/**
 * Error log entry with context
 */
export interface ErrorLogEntry {
  message: string;
  stack?: string;
  code?: string;
  requestId?: string;
  userId?: string;
  organisationId?: string;
  endpoint?: string;
  [key: string]: unknown;
}

/**
 * Fields that should be redacted from logs
 */
export const REDACTED_FIELDS = [
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'idToken',
  'authorization',
  'cookie',
  'apiKey',
  'secret',
  'creditCard',
  'ssn',
] as const;

export type RedactedField = (typeof REDACTED_FIELDS)[number];
