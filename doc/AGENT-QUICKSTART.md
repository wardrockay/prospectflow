# 🤖 Agent Quick Start

**READ THIS FIRST** - Essential context for all BMAD agents.

---

## 📍 Before Any Implementation

1. **MANDATORY:** Read [project-context.md](project-context.md)

   - Logging standards (Pino child loggers)
   - Multi-tenant isolation (`organisation_id`)
   - Error handling patterns
   - Deployment commands

2. **Check current sprint:** [sprint-status.yaml](sprint-status.yaml)

---

## 🚨 Critical Rules

### Logging (MANDATORY)

```typescript
// ✅ ALWAYS use child logger
import { createChildLogger } from '../utils/logger.js';
const logger = createChildLogger('MyService');
logger.info({ userId }, 'User created');

// ❌ NEVER import logger directly (ESLint error)
import { logger } from '../utils/logger.js';
```

### Multi-Tenant (MANDATORY)

```typescript
// ✅ ALWAYS filter by organisation_id
WHERE organisation_id = $1

// ❌ NEVER query without tenant isolation
```

### Testing (MANDATORY)

```bash
# Run before committing
make test-unit
```

---

## 📁 Key Paths

| Path                     | Purpose                                    |
| ------------------------ | ------------------------------------------ |
| `apps/ingest-api/src/`   | Main API code                              |
| `apps/ingest-api/tests/` | Tests (unit, integration, security)        |
| `packages/`              | Shared packages (auth-core, messaging)     |
| `infra/`                 | Docker configs (postgres, redis, rabbitmq) |

---

## 🔗 Full Documentation

| Topic         | Document                                               |
| ------------- | ------------------------------------------------------ |
| All Standards | [project-context.md](project-context.md)               |
| Architecture  | [reference/ARCHITECTURE.md](reference/ARCHITECTURE.md) |
| Testing Guide | [TESTING_WORKFLOW.md](TESTING_WORKFLOW.md)             |
| Sprint Status | [sprint-status.yaml](sprint-status.yaml)               |
