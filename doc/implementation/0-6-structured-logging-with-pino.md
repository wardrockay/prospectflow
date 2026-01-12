# Story 0.6: Structured Logging with Pino

**Epic**: 0 - Sprint 0: Foundation Infrastructure  
**Story ID**: 0.6  
**Story Points**: 3  
**Status**: 🔵 Ready for Dev  
**Dependencies**: Story 0.2 (Express.js API Foundation - completed)  
**Created**: 2026-01-12  
**Assignee**: Dev Team

---

## Story Overview

### User Story

**As a** DevOps engineer  
**I want** structured JSON logging throughout the application  
**So that** I can easily search, filter, and analyze logs in production

### Business Context

Proper logging infrastructure is essential for:

- **Debugging**: Quickly trace issues through request flows
- **Monitoring**: Track application health and performance
- **Compliance**: Maintain audit trails for security and regulatory requirements
- **Analytics**: Understand usage patterns and optimize performance

### Technical Context

**Current State**: Basic Pino logger exists in `apps/ingest-api/src/utils/logger.ts` with:

- Basic configuration
- pino-pretty for development
- Simple serializers for req/res

**Target State**: Production-ready logging infrastructure with:

- Request correlation IDs for distributed tracing
- Contextual child loggers per module
- Sensitive data redaction
- Performance logging utilities
- Configurable log levels per environment
- Production-optimized JSON output

**Technology Stack**:

- Pino 9.6.0 (already installed)
- pino-pretty (development)
- pino-http (HTTP request logging)

---

## Architecture Overview

### Logger Module Structure

```
apps/ingest-api/src/
├── utils/
│   ├── logger.ts                    # Root logger factory
│   └── logger.types.ts              # Logger type definitions
├── middlewares/
│   ├── logger.middleware.ts         # HTTP request logging (enhanced)
│   └── correlation-id.middleware.ts # Request correlation ID
└── config/
    └── env.ts                       # LOG_LEVEL configuration (exists)
```

### Child Logger Pattern

```typescript
// Service example with child logger
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('IngestService');

// Logs automatically include: { module: 'IngestService', ... }
logger.info({ campaignId }, 'Processing campaign import');
```

### Correlation ID Flow

```
Request → CorrelationIdMiddleware → Child Logger → All Logs Include requestId
         (generates/extracts UUID)   (binds requestId)
```

---

## Phase 1: Enhanced Logger Configuration (1 SP)

**Goal**: Upgrade the existing logger with production-ready configuration

### Task 1.1: Create Logger Types

**Objective**: Define TypeScript types for structured logging

**File**: `apps/ingest-api/src/utils/logger.types.ts`

```typescript
import type { Logger } from 'pino';

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
```

**Acceptance Criteria**:

- ✅ Types exported and usable in all modules
- ✅ Redacted fields list defined

---

### Task 1.2: Upgrade Root Logger

**Objective**: Enhance the logger with production configuration and child logger factory

**File**: `apps/ingest-api/src/utils/logger.ts` (replace existing)

```typescript
// src/utils/logger.ts
import pino, { Logger, LoggerOptions } from 'pino';
import { env } from '../config/env.js';
import { REDACTED_FIELDS, type LogContext } from './logger.types.js';

/**
 * Pino logger configuration
 * - Development: pino-pretty with colors
 * - Production: JSON output for log aggregation
 */
const getLoggerConfig = (): LoggerOptions => {
  const isDevelopment = env.node_env === 'development' || env.node_env === 'dev';

  const baseConfig: LoggerOptions = {
    level: env.logLevel,
    // Add base context to all logs
    base: {
      service: 'ingest-api',
      environment: env.node_env,
    },
    // Timestamp format
    timestamp: pino.stdTimeFunctions.isoTime,
    // Redact sensitive fields
    redact: {
      paths: [
        ...REDACTED_FIELDS.map((f) => f),
        ...REDACTED_FIELDS.map((f) => `*.${f}`),
        ...REDACTED_FIELDS.map((f) => `*.*.${f}`),
        'req.headers.authorization',
        'req.headers.cookie',
        'res.headers.set-cookie',
      ],
      censor: '[REDACTED]',
    },
    // Custom serializers
    serializers: {
      req: (req) => ({
        method: req.method,
        url: req.url,
        query: req.query,
        params: req.params,
        headers: {
          'user-agent': req.headers?.['user-agent'],
          'content-type': req.headers?.['content-type'],
          'x-request-id': req.headers?.['x-request-id'],
        },
      }),
      res: (res) => ({
        statusCode: res.statusCode,
        headers: {
          'content-type': res.getHeader?.('content-type'),
        },
      }),
      err: pino.stdSerializers.err,
    },
    // Format error objects nicely
    formatters: {
      level: (label) => ({ level: label }),
      bindings: (bindings) => ({
        pid: bindings.pid,
        host: bindings.hostname,
      }),
    },
  };

  // Development: use pino-pretty for readable output
  if (isDevelopment) {
    return {
      ...baseConfig,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss.l',
          ignore: 'pid,hostname',
          singleLine: false,
          messageFormat: '{module} - {msg}',
        },
      },
    };
  }

  // Production: JSON output for log aggregation (ELK, CloudWatch, etc.)
  return baseConfig;
};

/**
 * Root logger instance
 */
export const logger: Logger = pino(getLoggerConfig());

/**
 * Create a child logger with module context
 * @param module - Module name for log context
 * @param context - Additional context to bind
 * @returns Child logger with bound context
 *
 * @example
 * const logger = createChildLogger('IngestService');
 * logger.info({ campaignId: '123' }, 'Processing campaign');
 * // Output: { module: 'IngestService', campaignId: '123', msg: 'Processing campaign' }
 */
export const createChildLogger = (module: string, context?: LogContext): Logger => {
  return logger.child({ module, ...context });
};

/**
 * Create a request-scoped child logger
 * Includes requestId for distributed tracing
 * @param requestId - Unique request identifier
 * @param context - Additional context (userId, organisationId, etc.)
 */
export const createRequestLogger = (
  requestId: string,
  context?: Omit<LogContext, 'requestId'>,
): Logger => {
  return logger.child({ requestId, ...context });
};

/**
 * Log performance metrics for an operation
 * @param logger - Logger instance to use
 * @param operation - Operation name
 * @param durationMs - Duration in milliseconds
 * @param success - Whether operation succeeded
 * @param metadata - Additional operation metadata
 */
export const logPerformance = (
  loggerInstance: Logger,
  operation: string,
  durationMs: number,
  success: boolean,
  metadata?: Record<string, unknown>,
): void => {
  const level = durationMs > 1000 ? 'warn' : 'info';
  loggerInstance[level](
    {
      performance: true,
      operation,
      durationMs,
      success,
      ...metadata,
    },
    `${operation} completed in ${durationMs}ms`,
  );
};

/**
 * Utility to time an async operation and log its performance
 * @param loggerInstance - Logger to use
 * @param operation - Operation name
 * @param fn - Async function to time
 * @returns Result of the function
 *
 * @example
 * const result = await timeOperation(logger, 'database.query', async () => {
 *   return await db.query('SELECT * FROM users');
 * });
 */
export const timeOperation = async <T>(
  loggerInstance: Logger,
  operation: string,
  fn: () => Promise<T>,
): Promise<T> => {
  const start = Date.now();
  try {
    const result = await fn();
    logPerformance(loggerInstance, operation, Date.now() - start, true);
    return result;
  } catch (error) {
    logPerformance(loggerInstance, operation, Date.now() - start, false, {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
};

export default logger;
```

**Acceptance Criteria**:

- ✅ Logger supports child logger pattern
- ✅ Sensitive data is redacted
- ✅ Development uses pino-pretty
- ✅ Production outputs JSON
- ✅ Performance logging utilities available

---

## Phase 2: Request Correlation & HTTP Logging (1 SP)

**Goal**: Implement request correlation IDs and enhanced HTTP logging

### Task 2.1: Create Correlation ID Middleware

**Objective**: Generate/extract unique request IDs for tracing

**File**: `apps/ingest-api/src/middlewares/correlation-id.middleware.ts`

```typescript
// src/middlewares/correlation-id.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { createRequestLogger } from '../utils/logger.js';
import type { Logger } from 'pino';

// Extend Express Request to include logger
declare global {
  namespace Express {
    interface Request {
      requestId: string;
      log: Logger;
    }
  }
}

/**
 * Header names for correlation ID
 */
const CORRELATION_HEADERS = ['x-request-id', 'x-correlation-id', 'x-trace-id'] as const;

/**
 * Extract correlation ID from request headers or generate new one
 */
const getOrCreateRequestId = (req: Request): string => {
  for (const header of CORRELATION_HEADERS) {
    const value = req.headers[header];
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }
  return randomUUID();
};

/**
 * Correlation ID middleware
 * - Extracts or generates unique request ID
 * - Attaches request-scoped logger to request object
 * - Adds request ID to response headers for client tracing
 */
export const correlationIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Get or create request ID
  const requestId = getOrCreateRequestId(req);
  req.requestId = requestId;

  // Get user context from authentication (if available)
  const userId = req.user?.user_id;
  const organisationId = req.user?.organisation_id;

  // Create request-scoped logger
  req.log = createRequestLogger(requestId, {
    userId,
    organisationId,
    method: req.method,
    path: req.path,
  });

  // Add request ID to response headers
  res.setHeader('x-request-id', requestId);

  next();
};
```

**Acceptance Criteria**:

- ✅ Request ID extracted from incoming headers or generated
- ✅ Request-scoped logger attached to `req.log`
- ✅ Request ID returned in response headers

---

### Task 2.2: Enhance HTTP Logger Middleware

**Objective**: Comprehensive HTTP request/response logging with timing

**File**: `apps/ingest-api/src/middlewares/logger.middleware.ts` (replace existing)

```typescript
// src/middlewares/logger.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import type { HttpLogEntry } from '../utils/logger.types.js';

/**
 * Paths to exclude from request logging (high frequency, low value)
 */
const EXCLUDED_PATHS = ['/health', '/ready', '/metrics', '/favicon.ico'];

/**
 * Check if path should be logged
 */
const shouldLogPath = (path: string): boolean => {
  return !EXCLUDED_PATHS.some((excluded) => path.startsWith(excluded));
};

/**
 * HTTP request logging middleware
 * - Logs request start and completion
 * - Measures request duration
 * - Includes authentication context
 * - Handles errors gracefully
 */
export const loggerMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Skip excluded paths
  if (!shouldLogPath(req.path)) {
    return next();
  }

  const start = process.hrtime.bigint();
  const requestId = req.requestId || 'unknown';

  // Use request-scoped logger if available, fallback to root
  const log = req.log || logger;

  // Log request start (debug level)
  log.debug(
    {
      event: 'request_start',
      method: req.method,
      url: req.originalUrl,
      userAgent: req.get('user-agent'),
      contentLength: req.get('content-length'),
    },
    `→ ${req.method} ${req.originalUrl}`,
  );

  // Capture response finish
  res.on('finish', () => {
    const durationNs = process.hrtime.bigint() - start;
    const durationMs = Number(durationNs / BigInt(1_000_000));

    const logEntry: HttpLogEntry = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
      requestId,
      userId: req.user?.user_id,
      organisationId: req.user?.organisation_id,
      userAgent: req.get('user-agent'),
      ip: req.ip || req.socket.remoteAddress,
    };

    // Determine log level based on status code
    const isError = res.statusCode >= 400;
    const isServerError = res.statusCode >= 500;

    // Include error details if present
    if (res.locals.error instanceof Error) {
      const errorEntry = {
        ...logEntry,
        event: 'request_error',
        error: {
          message: res.locals.error.message,
          name: res.locals.error.name,
          // Stack only in non-production
          ...(process.env.NODE_ENV !== 'production' && {
            stack: res.locals.error.stack,
          }),
        },
      };

      if (isServerError) {
        log.error(errorEntry, `✗ ${req.method} ${req.originalUrl} ${res.statusCode}`);
      } else {
        log.warn(errorEntry, `⚠ ${req.method} ${req.originalUrl} ${res.statusCode}`);
      }
    } else {
      const event = isError ? 'request_failed' : 'request_completed';
      const logData = { ...logEntry, event };

      // Slow request warning (> 1s)
      if (durationMs > 1000) {
        log.warn(
          { ...logData, slow: true },
          `⚠ Slow request: ${req.method} ${req.originalUrl} took ${durationMs}ms`,
        );
      } else if (isError) {
        log.warn(logData, `⚠ ${req.method} ${req.originalUrl} ${res.statusCode}`);
      } else {
        log.info(logData, `← ${req.method} ${req.originalUrl} ${res.statusCode} (${durationMs}ms)`);
      }
    }
  });

  // Handle connection close (client disconnect)
  res.on('close', () => {
    if (!res.writableFinished) {
      const durationNs = process.hrtime.bigint() - start;
      const durationMs = Number(durationNs / BigInt(1_000_000));

      log.warn(
        {
          event: 'request_aborted',
          method: req.method,
          url: req.originalUrl,
          durationMs,
          requestId,
        },
        `⚡ Request aborted: ${req.method} ${req.originalUrl}`,
      );
    }
  });

  next();
};
```

**Acceptance Criteria**:

- ✅ All HTTP requests logged with timing
- ✅ Health check endpoints excluded
- ✅ Error responses include error details
- ✅ Slow requests trigger warnings
- ✅ Client disconnections logged

---

## Phase 3: Module Integration & Testing (1 SP)

**Goal**: Integrate logging across all modules and verify functionality

### Task 3.1: Update Application Setup

**Objective**: Wire up logging middleware in correct order

**File**: `apps/ingest-api/src/app.ts` - Add correlation middleware before logger

```typescript
// Middleware order (add correlationIdMiddleware before loggerMiddleware):
// 1. correlationIdMiddleware - Generates request ID
// 2. loggerMiddleware - Logs HTTP requests
// 3. Other middlewares...
```

**Changes Required**:

1. Import correlation middleware:

```typescript
import { correlationIdMiddleware } from './middlewares/correlation-id.middleware.js';
```

2. Add before loggerMiddleware:

```typescript
app.use(correlationIdMiddleware);
app.use(loggerMiddleware);
```

---

### Task 3.2: Update Services with Child Loggers

**Objective**: Refactor existing services to use child loggers

**Example Pattern** for all services:

```typescript
// Before:
import { logger } from '../utils/logger.js';

export class IngestService {
  async process() {
    logger.info('Processing...');
  }
}

// After:
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('IngestService');

export class IngestService {
  async process() {
    logger.info('Processing...');
  }
}
```

**Files to Update**:

- `src/services/ingest.service.ts`
- `src/services/base.service.ts`
- `src/repositories/ingest.repository.ts`
- `src/repositories/base.repository.ts`
- `src/queue/rabbitmq.client.ts`
- `src/queue/queue.publisher.ts`
- `src/queue/queue.consumer.ts`
- `src/config/database.ts`
- `src/config/redis.ts`
- `src/config/auth.ts`

---

### Task 3.3: Create Unit Tests

**Objective**: Verify logger functionality

**File**: `apps/ingest-api/tests/unit/utils/logger.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  logger,
  createChildLogger,
  createRequestLogger,
  timeOperation,
} from '../../../src/utils/logger.js';

describe('Logger Module', () => {
  describe('createChildLogger', () => {
    it('should create child logger with module context', () => {
      const childLogger = createChildLogger('TestModule');
      expect(childLogger).toBeDefined();
      expect(childLogger.bindings().module).toBe('TestModule');
    });

    it('should include additional context', () => {
      const childLogger = createChildLogger('TestModule', { customField: 'value' });
      const bindings = childLogger.bindings();
      expect(bindings.module).toBe('TestModule');
      expect(bindings.customField).toBe('value');
    });
  });

  describe('createRequestLogger', () => {
    it('should create logger with request ID', () => {
      const requestId = 'test-request-123';
      const requestLogger = createRequestLogger(requestId);
      expect(requestLogger.bindings().requestId).toBe(requestId);
    });

    it('should include user context', () => {
      const requestLogger = createRequestLogger('req-123', {
        userId: 'user-456',
        organisationId: 'org-789',
      });
      const bindings = requestLogger.bindings();
      expect(bindings.userId).toBe('user-456');
      expect(bindings.organisationId).toBe('org-789');
    });
  });

  describe('timeOperation', () => {
    it('should time successful operations', async () => {
      const childLogger = createChildLogger('Test');
      const infoSpy = vi.spyOn(childLogger, 'info');

      const result = await timeOperation(childLogger, 'test.operation', async () => {
        return 'success';
      });

      expect(result).toBe('success');
      expect(infoSpy).toHaveBeenCalled();
    });

    it('should log failed operations and rethrow', async () => {
      const childLogger = createChildLogger('Test');
      const infoSpy = vi.spyOn(childLogger, 'info');

      await expect(
        timeOperation(childLogger, 'test.operation', async () => {
          throw new Error('Test error');
        }),
      ).rejects.toThrow('Test error');

      expect(infoSpy).toHaveBeenCalled();
    });
  });
});
```

**File**: `apps/ingest-api/tests/unit/middlewares/correlation-id.middleware.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { correlationIdMiddleware } from '../../../src/middlewares/correlation-id.middleware.js';

// Mock logger
vi.mock('../../../src/utils/logger', () => ({
  logger: { child: vi.fn(() => ({ info: vi.fn(), debug: vi.fn() })) },
  createRequestLogger: vi.fn(() => ({ info: vi.fn(), debug: vi.fn() })),
}));

describe('Correlation ID Middleware', () => {
  const mockNext: NextFunction = vi.fn();

  const createMockRequest = (headers: Record<string, string> = {}): Partial<Request> => ({
    headers,
    method: 'GET',
    path: '/test',
  });

  const createMockResponse = (): Partial<Response> => ({
    setHeader: vi.fn(),
  });

  it('should generate request ID when not provided', () => {
    const req = createMockRequest() as Request;
    const res = createMockResponse() as Response;

    correlationIdMiddleware(req, res, mockNext);

    expect(req.requestId).toBeDefined();
    expect(req.requestId).toMatch(/^[0-9a-f-]{36}$/); // UUID format
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', req.requestId);
    expect(mockNext).toHaveBeenCalled();
  });

  it('should extract x-request-id from headers', () => {
    const requestId = 'existing-request-id-123';
    const req = createMockRequest({ 'x-request-id': requestId }) as Request;
    const res = createMockResponse() as Response;

    correlationIdMiddleware(req, res, mockNext);

    expect(req.requestId).toBe(requestId);
  });

  it('should extract x-correlation-id from headers', () => {
    const correlationId = 'correlation-id-456';
    const req = createMockRequest({ 'x-correlation-id': correlationId }) as Request;
    const res = createMockResponse() as Response;

    correlationIdMiddleware(req, res, mockNext);

    expect(req.requestId).toBe(correlationId);
  });

  it('should attach request logger to request', () => {
    const req = createMockRequest() as Request;
    const res = createMockResponse() as Response;

    correlationIdMiddleware(req, res, mockNext);

    expect(req.log).toBeDefined();
  });
});
```

---

## Phase 4: Documentation & Verification

### Task 4.1: Update README

**Objective**: Document logging conventions

Add to `apps/ingest-api/README.md`:

````markdown
## Logging

### Configuration

- `LOG_LEVEL`: Set via environment variable (debug, info, warn, error)
- Development: Uses `pino-pretty` for readable colored output
- Production: JSON format for log aggregation

### Request Correlation

All requests include a unique `requestId` for distributed tracing:

- Extracted from headers: `x-request-id`, `x-correlation-id`, `x-trace-id`
- Generated if not provided
- Returned in response header: `x-request-id`

### Child Loggers

Use module-scoped child loggers for context:

```typescript
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('MyService');
logger.info({ data }, 'Operation completed');
```
````

### Performance Logging

Time operations automatically:

```typescript
import { timeOperation } from '../utils/logger.js';

const result = await timeOperation(logger, 'database.query', async () => {
  return await db.query(sql);
});
```

### Sensitive Data

The following fields are automatically redacted:

- password, token, accessToken, refreshToken, idToken
- authorization, cookie, apiKey, secret
- creditCard, ssn

```

---

## Acceptance Criteria Summary

| ID | Criteria | Verification |
|----|----------|--------------|
| AC1 | Pino configured with production-ready settings | `pnpm build` succeeds, JSON output in production |
| AC2 | Request correlation IDs generated/extracted | Check `x-request-id` in response headers |
| AC3 | All logs include requestId when in request context | Verify log output contains `requestId` |
| AC4 | Sensitive data redacted from logs | Check logs don't contain passwords/tokens |
| AC5 | Child loggers include module context | Verify `module` field in log output |
| AC6 | Performance logging utilities functional | Use `timeOperation` and verify output |
| AC7 | HTTP request/response logging complete | All endpoints logged with timing |
| AC8 | Unit tests passing | `pnpm test` passes |

---

## Definition of Done

- [ ] Logger types defined (`logger.types.ts`)
- [ ] Root logger upgraded with child logger factory
- [ ] Correlation ID middleware implemented
- [ ] HTTP logger middleware enhanced
- [ ] Services updated to use child loggers
- [ ] Unit tests written and passing
- [ ] Documentation updated
- [ ] Logs verified in development (pino-pretty)
- [ ] Logs verified in production mode (JSON)
- [ ] Sensitive data redaction confirmed

---

## Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| Story 0.2 (Express.js API Foundation) | ✅ Done | Required for middleware infrastructure |
| Story 0.4 (Cognito Authentication) | ✅ Done | User context for logging |

---

## Technical Notes

### Log Levels Guide

| Level | Usage |
|-------|-------|
| `error` | Application errors requiring immediate attention |
| `warn` | Unexpected but recoverable situations, slow operations |
| `info` | Normal operation events, request completion |
| `debug` | Detailed debugging information |

### Production Considerations

1. **Log Volume**: Set `LOG_LEVEL=info` in production to avoid debug spam
2. **Log Aggregation**: JSON format compatible with ELK, CloudWatch, Datadog
3. **Sampling**: Consider sampling high-frequency debug logs
4. **Retention**: Configure log rotation/retention per environment

### Migration Notes

Existing code uses `logger` directly. Migration path:
1. Replace `import { logger }` with `import { createChildLogger }`
2. Create module-scoped child logger: `const logger = createChildLogger('ModuleName')`
3. Existing `logger.info()` calls continue to work

---

## Estimated Effort

| Phase | Story Points | Description |
|-------|--------------|-------------|
| Phase 1 | 1 SP | Logger configuration & types |
| Phase 2 | 1 SP | Correlation ID & HTTP logging |
| Phase 3 | 1 SP | Integration & testing |
| **Total** | **3 SP** | |
```
