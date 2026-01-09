# Testing Guide

This document explains the testing setup and how to run tests in the ingest-api.

## Test Structure

```
tests/
├── unit/                      # Unit tests (mocked dependencies)
│   ├── controllers/
│   ├── services/
│   ├── repositories/
│   └── middlewares/
└── integration/               # Integration tests (real DB)
    └── health.integration.test.ts
```

## Running Tests

### 1. Unit Tests Only (Fast - No DB Required)

```bash
pnpm test:unit
```

**What it does:**

- Runs all tests in `tests/unit/`
- Uses mocked dependencies (no real database)
- Fast execution (~100ms)
- Ideal for TDD and rapid feedback

---

### 2. Local Integration Tests (Quick DB Setup)

```bash
# Option A: Manual control
pnpm test:db:up           # Start test DB on localhost:5433
pnpm test                 # Run all tests (unit + integration)
pnpm test:db:down         # Stop and cleanup test DB

# Option B: Automatic (recommended)
pnpm test:integration     # Does all 3 steps above automatically
```

**What it does:**

- Launches PostgreSQL 16 test database in Docker (port 5433)
- Runs all tests including integration tests
- Cleans up database after tests
- Uses `docker-compose.test-db-only.yaml`

**Requirements:**

- Docker installed and running
- Port 5433 available

---

### 3. Full Docker Test Suite (CI/CD Approach)

```bash
pnpm test:docker
```

**What it does:**

- Builds complete isolated test environment
- Runs database + test runner in Docker containers
- Tests run inside container (not on host)
- Exactly replicates CI/CD pipeline
- Uses `docker-compose.test.yaml`

**Use when:**

- Final validation before commit
- Debugging CI/CD failures
- Ensuring consistent test environment

---

## Test Database Configuration

### Local Development (.env.test)

```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5433          # Exposed port on host
POSTGRES_DB=prospectflow_test
POSTGRES_USER=prospectflow
POSTGRES_PASSWORD=testpassword123
```

### Docker Environment (docker-compose.test.yaml)

```env
POSTGRES_HOST=prospectflow-test-db   # Container name
POSTGRES_PORT=5432                   # Internal container port
```

---

## Troubleshooting

### Integration tests failing with "Unable to connect to database"

**Solution 1:** Ensure test DB is running

```bash
docker ps | grep prospectflow-test-db
# If not running:
pnpm test:db:up
```

**Solution 2:** Check port availability

```bash
lsof -i :5433
# If port in use, stop conflicting service or change port in docker-compose.test-db-only.yaml
```

**Solution 3:** Wait for DB to be ready

```bash
docker logs prospectflow-test-db
# Should see: "database system is ready to accept connections"
```

### Port 5433 conflict

Edit `docker-compose.test-db-only.yaml` and change:

```yaml
ports:
  - '5434:5432' # Use different host port
```

Then update `.env.test`:

```env
POSTGRES_PORT=5434
```

---

## Coverage Reports

Generate test coverage:

```bash
pnpm test --coverage
```

View coverage report:

```bash
open coverage/index.html  # macOS
xdg-open coverage/index.html  # Linux
```

**Target:** Minimum 70% coverage per Story 0.2 requirements

---

## Best Practices

1. **Run unit tests frequently** during development (no DB needed)
2. **Run integration tests** before committing (validates real DB interactions)
3. **Run full docker suite** before pushing to main branch (CI/CD validation)
4. **Keep test DB clean** - Always use `pnpm test:db:down` to cleanup
5. **Never commit .env files** with real credentials

---

## Test Commands Quick Reference

| Command                 | Speed    | DB Required       | Use Case                              |
| ----------------------- | -------- | ----------------- | ------------------------------------- |
| `pnpm test:unit`        | ⚡ Fast  | ❌ No             | TDD, rapid feedback                   |
| `pnpm test:integration` | 🔥 Quick | ✅ Yes (auto)     | Pre-commit validation                 |
| `pnpm test`             | 🔥 Quick | ✅ Yes (manual)   | Run all tests with DB already running |
| `pnpm test:docker`      | 🐢 Slow  | ✅ Yes (isolated) | CI/CD simulation                      |
| `pnpm test:db:up`       | -        | -                 | Start test DB manually                |
| `pnpm test:db:down`     | -        | -                 | Stop test DB manually                 |
