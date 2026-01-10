# ingest-api

## Overview

ProspectFlow Ingest API - A multi-tenant Express.js API with layered architecture for ingesting and managing prospect data.

## Prerequisites

- Node.js 20.x
- PostgreSQL 14+ (for integration tests)
- RabbitMQ 3.x+ (for message queue)
- Docker & Docker Compose (for containerized testing)
- **Docker permissions**: User must be in `docker` group OR have sudo access

### Docker Setup (One-time)

If you get permission errors with docker commands:

```bash
# Add your user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify
docker ps  # Should work without sudo
```

### RabbitMQ Setup

Start RabbitMQ with Docker:

```bash
cd ../../infra/rabbitmq
docker compose up -d
```

RabbitMQ Management UI: http://localhost:15672 (admin/changeme)

## Installation

```bash
pnpm install
```

## Environment Variables

Create a `.env` file in the `env/` directory:

```bash
# Server
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/prospectflow
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# RabbitMQ
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USER=admin
RABBITMQ_PASS=changeme
RABBITMQ_MANAGEMENT_PORT=15672

# Redis (Session Store)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_SESSION_TTL=86400

# AWS Cognito Authentication
AWS_REGION=eu-west-1
COGNITO_USER_POOL_ID=eu-west-1_XXXXXXXX
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
COGNITO_ISSUER=https://cognito-idp.eu-west-1.amazonaws.com/eu-west-1_XXXXXXXX
```

See `env/.env.example` for all available configuration options.

## Authentication

ProspectFlow uses AWS Cognito for authentication with Redis session management.

### Quick Start

1. **Setup Cognito** (via Terraform):

   ```bash
   cd infra/cognito/terraform
   terraform init && terraform apply
   ```

2. **Start Redis**:

   ```bash
   cd infra/redis
   docker-compose up -d
   ```

3. **Configure environment** variables from Terraform outputs

4. **Create test user** in Cognito console

### Middleware Chain

Protected routes use three middlewares in order:

```typescript
import { cognitoAuthMiddleware } from './middlewares/cognito-auth.middleware';
import { sessionMiddleware } from './middlewares/session.middleware';
import { organisationScopeMiddleware } from './middlewares/organisation-scope.middleware';

router.get(
  '/protected',
  cognitoAuthMiddleware, // 1. Validate JWT
  sessionMiddleware, // 2. Create/retrieve session
  organisationScopeMiddleware, // 3. Attach organisation_id
  handler,
);
```

### Multi-Tenant Isolation

All database queries MUST include organisation filter:

```typescript
import {
  getOrganisationIdFromRequest,
  checkOrganisationAccess,
} from './middlewares/organisation-scope.middleware';

// For list queries
const orgId = getOrganisationIdFromRequest(req);
const results = await db.query('SELECT * FROM table WHERE organisation_id = $1', [orgId]);

// For single resource access
checkOrganisationAccess(resource.organisation_id, req.organisationId, 'resource-type');
```

### Documentation

- [Authentication Setup Guide](docs/auth-setup.md)
- [Troubleshooting Guide](docs/auth-troubleshooting.md)
- [Redis Runbook](docs/redis-runbook.md)

## Testing

### Quick Start

```bash
# From project root - recommended approach
make test-unit           # Unit tests only (fast, no infrastructure)
make test-integration    # Full integration tests (starts Redis, PostgreSQL, RabbitMQ)

# Or from apps/ingest-api
pnpm test:unit          # Unit tests
pnpm test               # All tests (requires infrastructure)
```

### Unit Tests (No Infrastructure Required)

Unit tests use mocks and don't require external services:

```bash
# From project root
make test-unit

# Or from apps/ingest-api
pnpm test:unit
```

Tests covered:

- Middleware logic (JWT validation, session management, organisation scope)
- Service layer (session service, user sync service)
- Controllers
- Queue publishers/consumers

### Integration Tests (Requires Infrastructure)

Integration tests require real infrastructure (PostgreSQL, Redis, RabbitMQ):

```bash
# From project root - starts infrastructure automatically
make test-integration    # Runs: make dev-ready → pnpm test integration

# Or manually
make dev-up              # Start PostgreSQL, RabbitMQ, Redis, ClickHouse
make dev-wait            # Wait for health checks
cd apps/ingest-api && pnpm test --run tests/integration tests/security
make dev-down            # Stop all services
```

Tests covered:

- Complete authentication flow (JWT → Session → User Sync)
- Multi-tenant isolation
- Security (session hijacking, token validation)

### Test Requirements

- **Unit tests**: Pass in any environment (mocked dependencies)
- **Integration tests**: Require:
  - PostgreSQL on `localhost:5432`
  - Redis on `localhost:6379`
  - RabbitMQ on `localhost:5672` (optional for most tests)

### CI/CD Docker Tests

```bash
pnpm test:docker       # Complete isolated test environment
```

See [docs/TESTING.md](docs/TESTING.md) for detailed testing guide.

## Architecture

### Message Queue (RabbitMQ)

The application uses RabbitMQ for asynchronous job processing:

**Queues:**

- `draft_queue` - Email draft generation jobs
- `followup_queue` - Follow-up scheduling jobs
- `reply_queue` - Reply detection jobs

**Usage Example - Publishing:**

```typescript
import { queuePublisher, QUEUES } from './queue';

const job = {
  id: '123',
  type: 'draft_generation',
  organisation_id: '456',
  payload: { campaign_id: 'abc' },
  created_at: new Date().toISOString(),
  retry_count: 0,
};

await queuePublisher.publish(QUEUES.DRAFT, job);
```

**Usage Example - Consuming:**

```typescript
import { QueueConsumer } from './queue';

class MyWorker extends QueueConsumer {
  get queueName(): string {
    return 'draft_queue';
  }

  async processJob(job: QueueJob): Promise<void> {
    // Your processing logic here
    console.log('Processing job:', job.id);
  }
}

const worker = new MyWorker();
await worker.start();
```

**Key Features:**

- Automatic retry with exponential backoff (max 3 retries)
- Dead letter queue for failed messages
- Publisher confirms for reliability
- Prefetch=1 for even load distribution
- Graceful shutdown support

See [docs/ARCHITECTURE_DECISIONS.md](docs/ARCHITECTURE_DECISIONS.md) for architectural decisions including:

- Response validation strategy (ADR-001)
- Test database sudo requirements (ADR-002)
- Integration test resilience (ADR-003)

## 📁 Structure de l'app ingest-api

```
├── .dockerignore
├── .editorconfig
├── .eslintrc.js
├── .gitignore
├── .node-version
├── .npmrc
├── .prettierrc
├── Dockerfile
├── README copy.md
├── README.md
├── cinit.conf
├── docker-compose.yaml
├── package.json
├── src
│   ├── app.ts
│   ├── config
│   │   ├── env.ts
│   │   └── redis.ts
│   ├── controllers
│   │   └── .gitkeep
│   ├── dto
│   │   └── .gitkeep
│   ├── entities
│   │   └── .gitkeep
│   ├── errors
│   │   └── http-error.ts
│   ├── mappers
│   │   └── .gitkeep
│   ├── middlewares
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   ├── has-permission.middleware.ts
│   │   └── logger.middleware.ts
│   ├── repositories
│   │   └── .gitkeep
│   ├── routes
│   │   └── .gitkeep
│   ├── schemas
│   │   └── .gitkeep
│   ├── services
│   │   └── .gitkeep
│   └── utils
│       ├── getOrSetCache.ts
│       └── logger.ts
├── tests
│   └── unit
│       └── basic.test.ts
├── tsconfig.json
└── vitest.config.ts
```
