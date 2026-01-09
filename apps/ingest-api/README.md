# ingest-api

## Overview

ProspectFlow Ingest API - A multi-tenant Express.js API with layered architecture for ingesting and managing prospect data.

## Prerequisites

- Node.js 20.x
- PostgreSQL 14+ (for integration tests)
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

## Installation

```bash
pnpm install
```

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
