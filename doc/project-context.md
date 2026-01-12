# ProspectFlow - Project Context

**Version:** 1.1  
**Last Updated:** January 12, 2026  
**Status:** Active Development

---

## 📍 Quick Navigation

| Section          | Jump To                                                     |
| ---------------- | ----------------------------------------------------------- |
| **Logging**      | [Logging Standards](#logging-standards-mandatory)           |
| **Multi-Tenant** | [Multi-Tenant Isolation](#multi-tenant-isolation-mandatory) |
| **Errors**       | [Error Handling](#error-handling)                           |
| **Tests**        | [Testing Standards](#testing-standards)                     |
| **Deploy**       | [Deployment & Infrastructure](#deployment--infrastructure)  |
| **Files**        | [File Structure](#file-structure)                           |

---

## Overview

ProspectFlow is a multi-tenant B2B sales automation platform built with:

- **Backend:** Express.js + TypeScript (Node 20)
- **Database:** PostgreSQL 18 (multi-tenant with `organisation_id`)
- **Queue:** RabbitMQ
- **Cache/Sessions:** Redis
- **Authentication:** AWS Cognito

---

## Coding Standards

### Logging Standards (MANDATORY)

All services, repositories, controllers, and modules **MUST** use structured logging with Pino child loggers.

#### ✅ Required Pattern

```typescript
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('MyServiceName');

// Log with context object first, message second
logger.info({ userId, orderId }, 'Order created');
logger.error({ err: error, context: 'payment' }, 'Payment failed');
```

#### ❌ Forbidden Pattern

```typescript
// NEVER import logger directly
import { logger } from '../utils/logger.js'; // ❌ ESLint error

// NEVER use template strings for logs
logger.info(`Order ${orderId} created`); // ❌ Not parseable
```

#### Log Levels

| Level   | Usage                                             |
| ------- | ------------------------------------------------- |
| `debug` | Detailed debugging info (disabled in production)  |
| `info`  | Normal operations, request completion             |
| `warn`  | Unexpected but recoverable, slow operations (>1s) |
| `error` | Errors impacting users, requiring attention       |

#### Request Context

In controllers, use `req.log` to include the `requestId` for distributed tracing:

```typescript
export const myController = async (req: Request, res: Response) => {
  req.log.info({ body: req.body }, 'Processing request');
};
```

#### Performance Timing

Use `timeOperation` for database queries and external API calls:

```typescript
import { timeOperation } from '../utils/logger.js';

const result = await timeOperation(logger, 'database.fetchUsers', async () => {
  return await db.query('SELECT * FROM users');
});
```

#### Templates

When creating new files, use the templates:

- Services: `src/services/_template.service.ts`
- Repositories: `src/repositories/_template.repository.ts`

---

### Multi-Tenant Isolation (MANDATORY)

All database queries **MUST** include `organisation_id` filtering:

```typescript
// ✅ ALWAYS include organisation_id
const results = await db.query('SELECT * FROM crm.companies WHERE organisation_id = $1', [
  req.organisationId,
]);

// ❌ NEVER query without tenant isolation
const results = await db.query('SELECT * FROM crm.companies');
```

---

### Error Handling

Use custom error classes from `src/errors/`:

- `ValidationError` → 400
- `AppError` → Custom status code
- `DatabaseError` → 500

```typescript
import { ValidationError } from '../errors/ValidationError.js';

if (!isValid) {
  throw new ValidationError('Invalid input data');
}
```

---

### Testing Standards

- **Unit tests:** Required for all services, repositories, utilities
- **Naming:** `*.test.ts` co-located or in `tests/unit/`
- **Coverage:** All acceptance criteria must have tests
- **Mocking:** Mock external dependencies (DB, Redis, RabbitMQ)

```typescript
// Mock logger in tests
vi.mock('../../../src/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  createChildLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));
```

---

### File Structure

```
apps/ingest-api/src/
├── config/         # Configuration (env, database, redis, auth)
├── controllers/    # HTTP handlers (thin, delegate to services)
├── services/       # Business logic
├── repositories/   # Database access
├── middlewares/    # Express middlewares
├── routes/         # Route definitions
├── schemas/        # Zod validation schemas
├── errors/         # Custom error classes
├── utils/          # Utilities (logger, helpers)
├── queue/          # RabbitMQ publishers/consumers
└── types/          # TypeScript type definitions
```

---

### Import Conventions

- Always use `.js` extension for local imports (ESM)
- Group imports: external → internal → types

```typescript
// External
import { Router } from 'express';
import { z } from 'zod';

// Internal
import { createChildLogger } from '../utils/logger.js';
import { myService } from '../services/my.service.js';

// Types
import type { Request, Response } from 'express';
```

---

## Environment Configuration

Required environment variables are validated via Zod in `src/config/env.ts`.

Key variables:

- `NODE_ENV`: development | test | production
- `LOG_LEVEL`: debug | info | warn | error
- `POSTGRES_*`: Database connection
- `COGNITO_*`: AWS Cognito authentication

---

## Deployment & Infrastructure

### Quick Reference Commands

All deployment operations are managed via the root `Makefile`. Use `make help` for the full list.

#### Development Environment

```bash
# Start all infrastructure (PostgreSQL, RabbitMQ, Redis, ClickHouse)
make dev-up

# Start and wait for all services to be healthy
make dev-ready

# Stop all services
make dev-down

# Check service status
make dev-status
```

#### Production Environment (VPS)

```bash
# Start entire production stack
make prod-up

# Stop everything
make prod-down

# Restart all services
make prod-restart

# Check health of all services
make health
```

#### Service Management (Interactive)

```bash
# Restart specific service (interactive menu)
make service-restart

# Direct restart without menu
make service-restart SERVICE=ingest-api
make service-restart SERVICE=ui-web
make service-restart SERVICE=postgres

# View logs
make service-logs SERVICE=ingest-api
```

#### Deploy Individual Applications

```bash
# Deploy UI Web
make deploy-ui

# Deploy Ingest API
make deploy-api
```

#### NGINX & SSL

```bash
# Start reverse proxy
make nginx-up

# Initialize SSL (first time only)
make nginx-init-ssl

# Renew SSL certificate
make nginx-renew-ssl

# Reload NGINX config
make nginx-reload
```

---

### Infrastructure Components

| Service    | Container Name            | Port(s)     | Health Check           |
| ---------- | ------------------------- | ----------- | ---------------------- |
| PostgreSQL | `prospectflow-postgres`   | 5432        | `pg_isready`           |
| RabbitMQ   | `prospectflow-rabbitmq`   | 5672, 15672 | `rabbitmq-diagnostics` |
| Redis      | `prospectflow-redis`      | 6379        | `redis-cli ping`       |
| ClickHouse | `clickhouse-server`       | 8123, 9000  | `clickhouse-client`    |
| Ingest API | `prospectflow-ingest-api` | 3000        | `/health` endpoint     |
| UI Web     | `prospectflow-ui-web`     | 4000        | HTTP request           |
| NGINX      | `prospectflow-nginx`      | 80, 443     | `nginx -t`             |

---

### Docker Network

All services run on `prospectflow-network`. Created automatically by:

```bash
make network-create
```

---

### Environment Files

Environment variables are synced to VPS via:

```bash
make sync-env
```

Each app has its own `.env` file:

- `apps/ingest-api/env/.env`
- `apps/ui-web/.env`
- Infrastructure configs in `infra/*/`

---

### Metrics & Monitoring Standards (MANDATORY)

All services **MUST** expose Prometheus metrics at `/metrics` endpoint.

#### ✅ HTTP Metrics (Automatic)

```typescript
// Already configured in app.ts with metricsMiddleware
// Tracks: request count, duration, status codes by route
```

#### ✅ Database Metrics

```typescript
import { trackDatabaseQuery } from '../utils/metrics.utils.js';

// Wrap ALL database queries with tracking
const users = await trackDatabaseQuery('SELECT', 'iam', async () => {
  return await db.query('SELECT * FROM iam.users WHERE organisation_id = $1', [orgId]);
});
```

#### ✅ Business Metrics

```typescript
import { emailsSentTotal, draftsGeneratedTotal } from '../config/metrics.js';

// Increment business counters with labels
emailsSentTotal.inc({
  organisation_id: req.organisationId,
  campaign_id: campaignId,
  success: 'true',
});

draftsGeneratedTotal.inc({
  organisation_id: req.organisationId,
  success: 'false',
});
```

#### 🚨 Important Rules

- **DO NOT** add high-cardinality labels (user_id, request_id) to HTTP metrics
- **DO** use `organisation_id` for business metrics (multi-tenant tracking)
- **DO** track query duration for all DB operations
- **DO** use histogram buckets for latency (0.005 to 10 seconds)

#### Monitoring Stack

```bash
# Start Prometheus + Grafana + Alertmanager
make monitoring-up

# Access dashboards
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3001 (admin/admin)
# Alertmanager: http://localhost:9093
```

---

### Testing Workflow

```bash
# Run unit tests (no infrastructure required)
make test-unit

# Run integration tests (requires dev-ready)
make test-integration

# Ensure environment ready for tests
make test-ready
```

---

### Production URLs

- **Application:** https://app.lightandshutter.fr
- **API:** https://app.lightandshutter.fr/api
- **RabbitMQ Management:** http://localhost:15672 (internal only)

---

### VPS Access

```bash
# SSH connect to VPS
make vps-connect

# Full deploy (sync + restart)
make vps-deploy
```

---

## References

- [Architecture Documentation](./reference/ARCHITECTURE.md)
- [API README](../apps/ingest-api/README.md)
- [Testing Workflow](./TESTING_WORKFLOW.md)
- [Makefile](../Makefile) - Full command reference
