# ProspectFlow - Project Context

**Version:** 1.2  
**Last Updated:** February 2, 2026  
**Status:** Active Development

---

## 📍 Quick Navigation

| Section          | Jump To                                                     |
| ---------------- | ----------------------------------------------------------- |
| **Logging**      | [Logging Standards](#logging-standards-mandatory)           |
| **Multi-Tenant** | [Multi-Tenant Isolation](#multi-tenant-isolation-mandatory) |
| **B2C Lead Mag** | [B2C Lead Magnet System](#b2c-lead-magnet-system)          |
| **Errors**       | [Error Handling](#error-handling)                           |
| **Tests**        | [Testing Standards](#testing-standards)                     |
| **Deploy**       | [Deployment & Infrastructure](#deployment--infrastructure)  |
| **Files**        | [File Structure](#file-structure)                           |

---

## Overview

ProspectFlow is a **dual-purpose platform** combining:

### B2B Sales Automation (Core)
Multi-tenant sales automation platform for prospect outreach and campaign management.

- **Backend:** Express.js + TypeScript (Node 20)
- **Database:** PostgreSQL 18 (multi-tenant with `organisation_id`)
- **Queue:** RabbitMQ
- **Cache/Sessions:** Redis
- **Authentication:** AWS Cognito

### B2C Lead Generation (New)
RGPD-compliant lead magnet delivery system for capturing emails from Light & Shutter landing page.

- **Backend:** Nuxt Server API routes
- **Database:** PostgreSQL `public` schema with `lm_` prefix (tables: `lm_subscribers`, `lm_consent_events`, `lm_download_tokens`)
- **Email:** Amazon SES (etienne.maillot@lightandshutter.fr)
- **Storage:** Amazon S3 (lead-magnets bucket)
- **Landing Page:** Separate Nuxt repo (connects via API)

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

**B2B Context:** All database queries **MUST** include `organisation_id` filtering:

```typescript
// ✅ ALWAYS include organisation_id for B2B tables
const results = await db.query('SELECT * FROM crm.companies WHERE organisation_id = $1', [
  req.organisationId,
]);

// ❌ NEVER query without tenant isolation
const results = await db.query('SELECT * FROM crm.companies');
```

**B2C Context:** Lead magnet tables in `public` schema use `lm_` prefix and **DO NOT** require `organisation_id`:

```typescript
// ✅ B2C lead magnet queries (no organisation_id)
const subscriber = await db.query('SELECT * FROM public.lm_subscribers WHERE email = $1', [
  email,
]);

// ✅ B2C tables are isolated by purpose, not tenant
const tokens = await db.query('SELECT * FROM public.lm_download_tokens WHERE subscriber_id = $1', [
  subscriberId,
]);
```

---

## B2C Lead Magnet System

### Architecture Overview

```
Landing Page (Nuxt, separate repo)
    ↓ CORS enabled API calls
ProspectFlow Nuxt Server API (/api/lead-magnet/*)
    ↓
PostgreSQL public schema
    - lm_subscribers (email list with status)
    - lm_consent_events (RGPD audit log, immutable)
    - lm_download_tokens (access control, SHA-256 hashed)
    ↓
AWS Services (Terraform managed in /infra)
    - S3: lightandshutter-lead-magnets bucket
    - SES: etienne.maillot@lightandshutter.fr (out of sandbox)
```

### Database Schema Conventions

#### Table Naming: `lm_` Prefix
All B2C lead magnet tables use the `lm_` namespace prefix:
- `lm_subscribers` - Email list and subscriber state
- `lm_consent_events` - RGPD compliance audit trail (append-only)
- `lm_download_tokens` - Token-based access control

**Rationale:** OVH managed PostgreSQL does not support custom schemas. Using `lm_` prefix in `public` schema provides logical separation from B2B tables.

#### Schema Location
All tables created in `public` schema:
```sql
CREATE TABLE public.lm_subscribers (...);
CREATE TABLE public.lm_consent_events (...);
CREATE TABLE public.lm_download_tokens (...);
```

#### Primary Keys & Foreign Keys
- **UUIDs:** All tables use `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- **Cascading Deletes:** `ON DELETE CASCADE` for RGPD right-to-be-forgotten compliance
- **No organisation_id:** B2C tables are single-tenant by design

### API Endpoints (Nuxt Server Routes)

```typescript
// apps/ui-web/server/api/lead-magnet/
POST   /api/lead-magnet/submit           // Email submission + double opt-in email
GET    /api/lead-magnet/confirm/:token   // Token validation + S3 signed URL generation
GET    /api/lead-magnet/stats            // Analytics (protected)
```

### RGPD Compliance

#### Double Opt-in Flow
1. User submits email → `lm_subscribers.status = 'pending'`
2. Confirmation email sent via SES
3. User clicks link → `lm_subscribers.status = 'confirmed'`
4. `lm_consent_events` logs all actions (signup, confirm, unsubscribe)

#### Audit Trail
- **Immutable logs:** `lm_consent_events` is append-only
- **Captured data:** IP address, user agent, consent text, privacy policy version
- **Right to be forgotten:** Cascading deletes remove all related data

#### Token Security
- **Storage:** SHA-256 hash only (never plain tokens)
- **Expiry:** 48-hour window for downloads
- **Reusability:** Tokens can be reused within 48h (tracked via `use_count`)

### AWS Integration (Terraform)

#### S3 Configuration
```hcl
# infra/aws-leadmagnet/s3.tf
bucket: lightandshutter-lead-magnets
path: /lead-magnets/guide-mariee-sereine.pdf
access: Private (signed URLs only)
cors: Enabled for download requests
```

#### SES Configuration
```hcl
# infra/aws-leadmagnet/ses.tf
from: etienne.maillot@lightandshutter.fr
domain: lightandshutter.fr (verified)
status: Out of sandbox (production sending)
dns: SPF + DKIM configured
```

#### IAM Permissions
```hcl
# Minimal permissions principle
s3:GetObject (lead-magnets bucket only)
ses:SendEmail
```

### Environment Variables

```bash
# apps/ui-web/.env or .env.example
AWS_REGION=eu-west-3
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
S3_BUCKET_NAME=lightandshutter-lead-magnets
S3_FILE_KEY=lead-magnets/guide-mariee-sereine.pdf
SES_FROM_EMAIL=etienne.maillot@lightandshutter.fr
BASE_URL=https://lightandshutter.fr
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

### File Structure (B2C)

```
apps/ui-web/
├── server/
│   ├── api/
│   │   └── lead-magnet/
│   │       ├── submit.post.ts       # Email capture endpoint
│   │       ├── confirm/
│   │       │   └── [token].get.ts   # Token validation + download
│   │       └── stats.get.ts         # Analytics (admin)
│   └── utils/
│       ├── token.ts                 # Token generation + hashing
│       ├── email.ts                 # SES integration
│       └── s3.ts                    # S3 signed URL generation
├── pages/
│   └── lead-magnet/
│       ├── succes.vue               # Download success page
│       ├── expire.vue               # Token expired page
│       └── invalide.vue             # Invalid token page

infra/
├── postgres/
│   └── migrations/
│       └── 002_lead_magnet_schema.sql  # lm_* tables
└── aws-leadmagnet/                  # Terraform for S3 + SES
    ├── main.tf
    ├── s3.tf
    ├── ses.tf
    ├── iam.tf
    └── variables.tf
```

### Migration Strategy

**Migration File:** `infra/postgres/migrations/002_lead_magnet_schema.sql`

```sql
-- Create lm_subscribers table in public schema
CREATE TABLE public.lm_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','confirmed','unsubscribed','bounced')),
  source TEXT,
  tags JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  last_email_sent_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_lm_subscribers_email_lower ON public.lm_subscribers(LOWER(email));
CREATE INDEX idx_lm_subscribers_status ON public.lm_subscribers(status);
CREATE INDEX idx_lm_subscribers_created_at ON public.lm_subscribers(created_at DESC);

-- Create lm_consent_events table (RGPD audit log)
CREATE TABLE public.lm_consent_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID NOT NULL REFERENCES public.lm_subscribers(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('signup','confirm','unsubscribe')),
  consent_text TEXT,
  privacy_policy_version TEXT,
  ip INET,
  user_agent TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lm_consent_events_subscriber ON public.lm_consent_events(subscriber_id, occurred_at DESC);

-- Create lm_download_tokens table
CREATE TABLE public.lm_download_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID NOT NULL REFERENCES public.lm_subscribers(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  purpose TEXT NOT NULL CHECK (purpose IN ('confirm_and_download','download_only')),
  expires_at TIMESTAMPTZ NOT NULL,
  max_uses INT NOT NULL DEFAULT 999,
  use_count INT NOT NULL DEFAULT 0,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lm_download_tokens_subscriber ON public.lm_download_tokens(subscriber_id, created_at DESC);
CREATE INDEX idx_lm_download_tokens_expires ON public.lm_download_tokens(expires_at) WHERE use_count < max_uses;
```

### Success Metrics (KPIs)

| Metric                     | Target   | Measurement                          |
| -------------------------- | -------- | ------------------------------------ |
| Email Capture Rate         | 15-25%   | Form submissions / Page visitors     |
| Confirmation Rate          | 40-60%   | Confirmed / Total signups            |
| Download Completion Rate   | 80-95%   | Downloaded / Confirmed               |
| Time to Confirm            | < 2h     | Median `confirmed_at - created_at`   |
| Overall Conversion         | 30-50%   | Downloaded / Total signups           |

### Token Security Standards (CRITICAL)

**For B2C Lead Magnet download tokens:**

#### ✅ Required Security Practices

```typescript
// 1. Generate cryptographically secure tokens
import crypto from 'crypto';
const plainToken = crypto.randomBytes(32).toString('base64url');  // ✅ CORRECT

// 2. Always hash before storage (SHA-256)
const tokenHash = crypto.createHash('sha256').update(plainToken).digest('hex');
await db.query('INSERT INTO lm_download_tokens (token_hash) VALUES ($1)', [tokenHash]);

// 3. Never log plain tokens (privacy breach)
logger.info({ tokenHash }, 'Token created');  // ✅ CORRECT
logger.debug({ token: plainToken });  // ❌ NEVER DO THIS
```

#### ❌ Forbidden Practices

```typescript
// NEVER use Math.random() - not cryptographically secure
const badToken = Math.random().toString(36);  // ❌ CRITICAL SECURITY FLAW

// NEVER store plain tokens in database
await db.query('INSERT INTO lm_download_tokens (token) VALUES ($1)', [plainToken]);  // ❌ 

// NEVER log plain tokens (even in debug mode)
console.log('Generated token:', plainToken);  // ❌ SECURITY BREACH
logger.info({ token: plainToken }, 'Token created');  // ❌ PRIVACY VIOLATION
```

#### Token Lifecycle

1. **Generation:** `crypto.randomBytes(32)` → base64url encode
2. **Hashing:** SHA-256 hash for database storage
3. **Distribution:** Plain token sent ONCE in email, never stored
4. **Verification:** Hash incoming token, compare with DB hash
5. **Expiry:** Check `expires_at` and `use_count < max_uses`

#### CI/CD Token Security Check

Add to pre-commit or CI pipeline:
```bash
# Detect plain token logging (fails if found)
grep -rn "logger.*\btoken[^H]" src/ && echo "❌ Plain token logging detected" && exit 1
```

### Epic & Stories

- **Epic:** EPIC-LM-001 (52 story points)
- **Artifact:** `doc/lead-magnet-delivery-system-epic.md`
- **Stories:**
  - LM-001: Database Schema & Infrastructure (8 pts) - MUST
  - LM-002: Email Capture & Double Opt-in (13 pts) - MUST
  - LM-003: Download Delivery & Token Management (13 pts) - MUST
  - LM-004: Analytics Dashboard (8 pts) - SHOULD
  - LM-005: Email Template Design (5 pts) - SHOULD
  - LM-006: Rate Limiting & Abuse Prevention (5 pts) - COULD

---

### Multi-Tenant Isolation (MANDATORY) - B2B Only

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

### WSL Memory Management (CRITICAL for Windows Development)

#### 🚨 OOM-Kill Prevention

Vitest parallel execution can trigger WSL OOM-kills. **All test configurations MUST:**

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    threads: false,           // Disable parallel threads
    maxConcurrency: 5,        // Limit concurrent tests
  },
});
```

#### WSL Configuration

Create/edit `C:\Users\<username>\.wslconfig`:

```ini
[wsl2]
memory=8GB              # Adjust based on your RAM (50-75% of total)
swap=8GB                # Equal to memory allocation
processors=4            # Limit CPU cores
```

Apply changes:

```powershell
# PowerShell (Admin)
wsl --shutdown
```

#### Test Execution Best Practices

```bash
# ✅ Safe: Write to file, then tail
pnpm test:unit > /tmp/unit.log 2>&1 || true
tail -50 /tmp/unit.log

# ❌ Dangerous: Pipe to head/tail (can trigger OOM faster)
pnpm test:unit | tail -50

# ✅ Limit Node memory
NODE_OPTIONS="--max-old-space-size=2048" pnpm test:unit

# ✅ Monitor memory during tests
watch -n 0.5 "free -h; ps -eo pid,cmd,rss --sort=-rss | head -n 12"
```

#### Symptoms of OOM Issues

- Tests crash mid-execution
- WSL becomes unresponsive
- `dmesg` shows: `Out of memory: Killed process ... (node)`
- VS Code Remote extension disconnects
- `journald corrupted` errors after reboot

#### Troubleshooting

```bash
# Check WSL memory usage
free -h

# View OOM-kill logs
dmesg | grep -i "killed process"

# Check current WSL config
wsl --status
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

### PostgreSQL Database (OVH Managed)

**CRITICAL:** PostgreSQL est hébergé sur OVH CloudDB avec **accès restreint par IP**.

- **Host:** `me456214-001.eu.clouddb.ovh.net:35787`
- **Databases:**
  - `prospectflow` - Production
  - `prospectflow-dev` - Development/Staging
- **Users:**
  - `flyway` - Migrations (credentials in `infra/postgres/env/.env.dev`)
  - `prospectflow` - Application access
- **Accès:** **Uniquement depuis le VPS** (whitelist IP)

**⚠️ LIMITATIONS OVH CloudDB:**

1. **Schémas personnalisés:** Impossible de créer des schémas (iam, crm, etc.) avec `CREATE SCHEMA`
2. **Extensions:** Impossible de créer des extensions (pgcrypto, citext) - doivent être pré-installées par OVH
3. **Rôles:** Impossible de créer des rôles avec `CREATE ROLE` - contact support OVH requis
4. **RLS:** Row Level Security non disponible sans rôle applicatif personnalisé

**Solutions implémentées:**
- Utiliser uniquement le schéma `public` avec des préfixes de tables
- Commenter les `CREATE EXTENSION` (extensions pré-installées par OVH)
- Commenter les `CREATE ROLE` et RLS policies (sécurité à gérer au niveau application)

**Convention des préfixes:**
- Tables IAM: `iam_users`, `iam_organisations`, `iam_roles`
- Tables CRM: `crm_companies`, `crm_contacts`
- Tables Outreach: `outreach_campaigns`, `outreach_emails`
- Tables Lead Magnet: `lm_subscribers`, `lm_consent_events`, `lm_download_tokens` ✅

**Configuration Flyway:**
```yaml
FLYWAY_SCHEMAS: public  # Uniquement public (pas iam, crm, etc.)
FLYWAY_DEFAULT_SCHEMA: public
```

**Testing Migrations:**
```bash
# Les migrations ne peuvent PAS être testées localement
# Elles doivent être déployées sur le VPS

# 1. Se connecter au VPS
make vps-connect

# 2. Sur le VPS, exécuter Flyway
cd ~/starlightcoder/prospectflow/infra/postgres
export APP_ENV=dev
docker compose run --rm flyway migrate

# 3. Vérifier l'état
docker compose run --rm flyway info
```

**Migration depuis l'ancien système avec schémas:**
Si des migrations existantes utilisent `CREATE SCHEMA iam`, `CREATE SCHEMA crm`, etc., elles doivent être adaptées ou ignorées (baseline) car OVH CloudDB ne permet pas la création de schémas personnalisés.

---

## Deployment & Infrastructure

### Infrastructure Overview

**All services and infrastructure run in Docker containers on a VPS accessible via:**

```bash
ssh vps
```

All production services (APIs, workers, databases, monitoring) are containerized and managed through Docker Compose on this VPS.

**PostgreSQL Database:** Hébergé séparément sur OVH CloudDB (accès VPS uniquement).

### Quick Reference Commands

All deployment operations are managed via the root `Makefile`. Use `make help` for the full list.

#### Development Environment

```bash
# Network setup (run once)
make network-create

# Tiered startup (recommended for selective development)
make infra-only       # Start infrastructure only (PostgreSQL, RabbitMQ, Redis, ClickHouse)
make apps-only        # Start applications only (Ingest API, UI Web)
make full-stack       # Start everything including monitoring

# Legacy combined startup
make dev-up           # Start all infrastructure
make dev-ready        # Start infrastructure and wait for health checks
make dev-down         # Stop all services

# Health and status
make health           # Check health status of all services
make dev-status       # Show container status

# Service tier management
make apps-restart     # Restart only applications (keeps infrastructure running)
make infra-restart    # Restart infrastructure (stops apps first)
make dev-restart      # Restart everything
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
