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

# Redis (optional)
REDIS_HOST=localhost
REDIS_PORT=6379
```

See `env/.env.example` for all available configuration options.

## Testing

### Unit Tests (No DB Required)

```bash
pnpm test:unit
```

### Integration Tests (DB Required)

Integration tests require a PostgreSQL test database. Two options:

**Option 1: Automatic (with sudo/docker group)**

```bash
pnpm test:integration  # Starts DB, runs tests, stops DB
```

**Option 2: Manual Control**

```bash
pnpm test:db:up        # Start test DB
pnpm test              # Run all tests
pnpm test:db:down      # Stop test DB
```

**Option 3: Full Docker (CI/CD)**

```bash
pnpm test:docker       # Complete isolated test environment
```

### Test Requirements

- **Unit tests**: Pass in any environment (mocked dependencies)
- **Integration tests**: Require PostgreSQL on `localhost:5433` or gracefully report DB unavailable

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
