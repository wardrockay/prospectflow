# Story 0.7: Error Tracking with Sentry

**Epic**: 0 - Sprint 0: Foundation Infrastructure  
**Story ID**: 0.7  
**Story Points**: 2  
**Status**: ready-for-review  
**Dependencies**: Story 0.2 (Express.js API Foundation - ✅ done), Story 0.6 (Structured Logging - ✅ done)  
**Created**: 2026-01-12  
**Assignee**: Dev Team

---

## Story Overview

### User Story

**As a** DevOps engineer  
**I want** centralized error tracking and alerting  
**So that** I'm notified immediately when production errors occur

### Business Context

Centralized error tracking is essential for:

- **Rapid Incident Response**: Immediate notification when production errors occur
- **Root Cause Analysis**: Stack traces, breadcrumbs, and context for debugging
- **Error Prioritization**: Group similar errors and prioritize fixes
- **Proactive Monitoring**: Catch issues before users report them
- **Release Tracking**: Correlate errors with specific deployments

### Technical Context

**Current State**:

- Structured logging with Pino (Story 0.6) ✅
- Error handler middleware logs errors locally (`apps/ingest-api/src/middlewares/error.middleware.ts`)
- No centralized error aggregation or alerting

**Target State**:

- Sentry SDK integrated for automatic error capture
- Errors enriched with user/org context
- Performance monitoring for slow transactions
- Alert rules for critical errors
- Release tracking for deployment correlation

**Technology Stack**:

- `@sentry/node` (Sentry SDK for Node.js)
- `@sentry/profiling-node` (Performance profiling - optional)
- Express.js integration via Sentry handlers

---

## Architecture Overview

### Sentry Integration Flow

```
Error Occurs → Error Handler Middleware → Sentry.captureException()
                                        ↓
                              Sentry Dashboard
                              - Stack trace
                              - Request context
                              - User/Org context
                              - Breadcrumbs
                              - Release/Environment
```

### Module Structure

```
apps/ingest-api/src/
├── config/
│   ├── env.ts                    # Add SENTRY_DSN config
│   └── sentry.ts                 # NEW: Sentry initialization
├── middlewares/
│   ├── error.middleware.ts       # MODIFY: Add Sentry capture
│   └── sentry.middleware.ts      # NEW: Sentry request handler
└── app.ts                        # MODIFY: Add Sentry handlers
```

### Context Enrichment

```typescript
// User context attached to all errors
Sentry.setUser({
  id: req.user?.user_id,
  email: req.user?.email,
});

// Organization context as tag
Sentry.setTag('organisation_id', req.user?.organisation_id);
```

---

## Acceptance Criteria

| ID  | Criteria                                         | Verification Method                        |
| --- | ------------------------------------------------ | ------------------------------------------ |
| AC1 | Sentry SDK initialized with DSN on app startup   | Check Sentry dashboard for incoming events |
| AC2 | Environment set correctly (dev, staging, prod)   | Verify `environment` tag in Sentry         |
| AC3 | Uncaught exceptions automatically captured       | Throw test error, verify in dashboard      |
| AC4 | Errors include user ID, org ID, request context  | Check error details in Sentry              |
| AC5 | Breadcrumbs show recent actions leading to error | Verify breadcrumbs in error detail         |
| AC6 | Expected errors (400 validation) filtered out    | Validation errors not sent to Sentry       |
| AC7 | Release tracking configured                      | Verify `release` tag matches deployment    |
| AC8 | PII scrubbed from error reports                  | Check no passwords/tokens in Sentry        |

---

## Tasks / Subtasks

- [x] **Task 1: Sentry Configuration** (AC: 1, 2, 7)

  - [x] 1.1 Add Sentry environment variables to env schema
  - [x] 1.2 Create `src/config/sentry.ts` initialization module
  - [x] 1.3 Add SENTRY_DSN to `.env` files (dev, test, production)

- [x] **Task 2: Express Integration** (AC: 1, 3, 5)

  - [x] 2.1 Create `src/middlewares/sentry.middleware.ts` request handler
  - [x] 2.2 Update `app.ts` to add Sentry handlers (must be first middleware)
  - [x] 2.3 Configure Sentry error handler before custom error handler

- [x] **Task 3: Context Enrichment** (AC: 4, 5)

  - [x] 3.1 Add user context (user_id, email) to Sentry scope
  - [x] 3.2 Add organisation_id as custom tag
  - [x] 3.3 Add request ID correlation with Pino logs
  - [x] 3.4 Configure breadcrumbs for HTTP requests

- [x] **Task 4: Error Filtering & Sampling** (AC: 6, 8)

  - [x] 4.1 Filter out expected 400 validation errors
  - [x] 4.2 Configure error sampling rate for production
  - [x] 4.3 Configure data scrubbing for PII (passwords, tokens)

- [x] **Task 5: Error Handler Integration** (AC: 3, 4)

  - [x] 5.1 Update `error.middleware.ts` to capture errors with Sentry
  - [x] 5.2 Integrate with existing Pino logging

- [x] **Task 6: Testing & Verification** (AC: all)
  - [x] 6.1 Create test route to trigger error (`/api/v1/test/error`)
  - [x] 6.2 Verify error appears in Sentry dashboard
  - [x] 6.3 Unit tests for Sentry utilities

---

## Dev Notes

### Sentry DSN

Obtain DSN from Sentry project settings:

1. Create project at https://sentry.io or self-hosted instance
2. Project Settings → Client Keys (DSN)
3. Use different DSNs per environment (recommended) or single DSN with environment tags

### Middleware Order (CRITICAL)

Sentry handlers must be in specific order in `app.ts`:

```typescript
// 1. Sentry request handler FIRST (captures request data)
app.use(Sentry.Handlers.requestHandler());

// 2. Sentry tracing handler for performance (optional)
app.use(Sentry.Handlers.tracingHandler());

// 3. Other middlewares...
app.use(correlationIdMiddleware);
app.use(loggerMiddleware);

// 4. Routes...
app.use('/api/v1', router);

// 5. Sentry error handler BEFORE custom error handler
app.use(Sentry.Handlers.errorHandler());

// 6. Custom error handler LAST
app.use(errorHandler);
```

### Filtering Expected Errors

Don't send validation errors (400) to Sentry - they're expected:

```typescript
beforeSend(event, hint) {
  const error = hint.originalException;
  if (error instanceof ZodError) {
    return null; // Don't send to Sentry
  }
  if (error instanceof AppError && error.statusCode < 500) {
    return null; // Don't send 4xx errors
  }
  return event;
}
```

### Integration with Pino Logging

Sentry and Pino work together:

- **Pino**: Local structured logs for debugging, log aggregation
- **Sentry**: Error aggregation, alerting, release tracking

Link them via request ID:

```typescript
// In error handler
logger.error({ requestId, sentryEventId }, 'Error captured');
Sentry.setTag('requestId', requestId);
```

### Project Structure Notes

- Follows existing middleware pattern in `apps/ingest-api/src/middlewares/`
- Configuration in `src/config/` alongside existing `env.ts`, `cognito.ts`
- Integrates with existing error classes (`AppError`, `ValidationError`)
- Uses `createChildLogger` pattern from Story 0.6

### References

- [Source: doc/planning/epics/epics.md#Story E0.7]
- [Source: doc/project-context.md#Error Handling]
- [Source: apps/ingest-api/src/middlewares/error.middleware.ts]
- [Source: doc/implementation/0-6-structured-logging-with-pino.md]
- [Sentry Express Guide](https://docs.sentry.io/platforms/javascript/guides/express/)

---

## Implementation Details

### Task 1.1: Environment Variables

**File**: `apps/ingest-api/src/config/env.ts`

Add to Zod schema:

```typescript
// Add to envSchema
SENTRY_DSN: z.string().optional(),
SENTRY_ENVIRONMENT: z.enum(['development', 'staging', 'production']).optional(),
SENTRY_TRACES_SAMPLE_RATE: z.string().transform(Number).default('0.1'),
SENTRY_RELEASE: z.string().optional(),
```

### Task 1.2: Sentry Configuration

**File**: `apps/ingest-api/src/config/sentry.ts` (NEW)

```typescript
import * as Sentry from '@sentry/node';
import { env } from './env.js';
import { createChildLogger } from '../utils/logger.js';
import { AppError } from '../errors/AppError.js';
import { ZodError } from 'zod';

const logger = createChildLogger('Sentry');

export const initSentry = (): void => {
  if (!env.sentryDsn) {
    logger.warn('SENTRY_DSN not configured, error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: env.sentryDsn,
    environment: env.sentryEnvironment || env.node_env,
    release: env.sentryRelease || `ingest-api@${process.env.npm_package_version}`,

    // Performance monitoring
    tracesSampleRate: env.sentryTracesSampleRate,

    // Don't send expected errors
    beforeSend(event, hint) {
      const error = hint.originalException;

      // Filter validation errors
      if (error instanceof ZodError) {
        return null;
      }

      // Filter client errors (4xx)
      if (error instanceof AppError && error.statusCode < 500) {
        return null;
      }

      return event;
    },

    // Scrub sensitive data
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === 'http') {
        // Remove auth headers from breadcrumbs
        if (breadcrumb.data?.headers) {
          delete breadcrumb.data.headers.authorization;
          delete breadcrumb.data.headers.cookie;
        }
      }
      return breadcrumb;
    },

    // Additional integrations
    integrations: [Sentry.httpIntegration({ tracing: true }), Sentry.expressIntegration()],
  });

  logger.info({ environment: env.sentryEnvironment }, 'Sentry initialized');
};

export { Sentry };
```

### Task 2.2: App.ts Integration

**File**: `apps/ingest-api/src/app.ts`

```typescript
// Add at top of file
import * as Sentry from '@sentry/node';
import { initSentry } from './config/sentry.js';

// Initialize Sentry BEFORE creating app
initSentry();

const app = express();

// Sentry request handler must be first
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

// ... existing middlewares ...

// Sentry error handler BEFORE custom error handler
app.use(Sentry.Handlers.errorHandler());
app.use(errorHandler);
```

### Task 3: Context Enrichment

**File**: `apps/ingest-api/src/middlewares/sentry.middleware.ts` (NEW)

```typescript
import * as Sentry from '@sentry/node';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to enrich Sentry context with user and request data
 * Should run after authentication middleware
 */
export const sentryContextMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Set user context
  if (req.user) {
    Sentry.setUser({
      id: req.user.user_id,
      email: req.user.email,
    });
    Sentry.setTag('organisation_id', req.user.organisation_id);
  }

  // Link with Pino request ID
  if (req.requestId) {
    Sentry.setTag('requestId', req.requestId);
  }

  next();
};
```

### Task 5: Error Handler Integration

**File**: `apps/ingest-api/src/middlewares/error.middleware.ts`

Add Sentry capture for server errors:

```typescript
import * as Sentry from '@sentry/node';

// In errorHandler function, for 5xx errors:
if (!(err instanceof AppError) || err.statusCode >= 500) {
  Sentry.captureException(err, {
    tags: {
      requestId: req.requestId,
      path: req.path,
      method: req.method,
    },
    extra: {
      userId: req.user?.user_id,
      organisationId: req.user?.organisation_id,
    },
  });
}
```

### Task 6.1: Test Route

**File**: `apps/ingest-api/src/routes/test.routes.ts` (NEW - dev only)

```typescript
import { Router } from 'express';

const router = Router();

// Only available in development
if (process.env.NODE_ENV !== 'production') {
  router.get('/error', (req, res) => {
    throw new Error('Test error for Sentry');
  });

  router.get('/async-error', async (req, res) => {
    await Promise.reject(new Error('Test async error for Sentry'));
  });
}

export default router;
```

---

## Dependencies

| Dependency                               | Status  | Notes                                      |
| ---------------------------------------- | ------- | ------------------------------------------ |
| Story 0.2 (Express.js API Foundation)    | ✅ Done | Required for middleware infrastructure     |
| Story 0.6 (Structured Logging with Pino) | ✅ Done | Integration with request ID, error logging |

### NPM Packages to Install

```bash
pnpm add @sentry/node --filter prospectflow-ingest-api
```

---

## Testing Requirements

### Unit Tests

**File**: `apps/ingest-api/tests/unit/config/sentry.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as Sentry from '@sentry/node';

vi.mock('@sentry/node');

describe('Sentry Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not initialize without DSN', async () => {
    process.env.SENTRY_DSN = '';
    const { initSentry } = await import('../../../src/config/sentry.js');
    initSentry();
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it('should initialize with valid DSN', async () => {
    process.env.SENTRY_DSN = 'https://test@sentry.io/123';
    const { initSentry } = await import('../../../src/config/sentry.js');
    initSentry();
    expect(Sentry.init).toHaveBeenCalled();
  });
});
```

### Integration Tests

Verify error capture in Sentry dashboard manually:

1. Start dev server with SENTRY_DSN configured
2. Call `/api/v1/test/error`
3. Check Sentry dashboard for new error event
4. Verify context (user, org, request ID) present

---

## Definition of Done

- [x] `@sentry/node` installed and configured
- [x] Sentry initialized on app startup
- [x] Environment variables added to `.env` files
- [x] Error handler captures server errors
- [x] User/org context attached to errors
- [x] Request ID correlates with Pino logs
- [x] Validation errors (400) filtered out
- [x] PII scrubbed from error reports
- [x] Test error verified in Sentry dashboard
- [x] Unit tests passing
- [x] Documentation updated

---

## Estimated Effort

| Task      | Story Points | Description                      |
| --------- | ------------ | -------------------------------- |
| Task 1    | 0.5 SP       | Sentry configuration & env setup |
| Task 2    | 0.5 SP       | Express integration              |
| Task 3    | 0.25 SP      | Context enrichment               |
| Task 4    | 0.25 SP      | Error filtering & sampling       |
| Task 5    | 0.25 SP      | Error handler integration        |
| Task 6    | 0.25 SP      | Testing & verification           |
| **Total** | **2 SP**     |                                  |

---

## Dev Agent Record

### Agent Model Used

GPT-5

### Debug Log References

### Completion Notes List

- Task 1 completed: Sentry configuration with env schema, initialization module, and env files updated. Unit tests passing.
- Task 2 completed: Express integration with SDK-compatible Sentry handlers. Integration tests passing.
- Task 3 completed: Context enrichment middleware for user/org/requestId. Unit tests passing.
- Task 4 completed: Error filtering (ZodError, AppError<500) and PII scrubbing (auth headers/cookies). Unit tests passing.
- Task 5 completed: Error handler integration with Sentry.captureException for 5xx errors.
- Task 6 completed: Test routes created (/api/v1/test/error), comprehensive unit and integration tests implemented.
- All 121 unit tests passing across 16 test files.

### File List

- apps/ingest-api/src/config/env.ts (updated)
- apps/ingest-api/src/config/sentry.ts (new)
- apps/ingest-api/src/app.ts (updated)
- apps/ingest-api/src/middlewares/sentry.middleware.ts (new)
- apps/ingest-api/src/middlewares/error.middleware.ts (updated)
- apps/ingest-api/src/routes/test.routes.ts (new)
- apps/ingest-api/src/routes/index.ts (updated)
- apps/ingest-api/env/.env.example (updated)
- apps/ingest-api/env/.env.dev (updated)
- apps/ingest-api/env/.env.test (updated)
- apps/ingest-api/env/.env.production (updated)
- apps/ingest-api/tests/unit/config/sentry.test.ts (new)
- apps/ingest-api/tests/integration/sentry.integration.test.ts (new)
- apps/ingest-api/tests/unit/middlewares/sentry.middleware.test.ts (new)
- apps/ingest-api/tests/unit/config/sentry.beforeSend.test.ts (new)
