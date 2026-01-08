# 🚀 ProspectFlow - Quick Reference Guide

**Last Updated:** January 8, 2025  
**For:** Developers, DevOps, Product Managers

---

## 📌 Project Quick Facts

| Item | Value |
|------|-------|
| **Project Name** | ProspectFlow |
| **Type** | B2B Email Outreach Automation Platform |
| **Stage** | Early Development (Foundation Phase) |
| **Primary Language** | TypeScript |
| **Main Framework** | Express.js (Node.js) |
| **Database** | PostgreSQL 18 (Multi-tenant) |
| **Package Manager** | pnpm |
| **Architecture** | Microservices (Monorepo) |
| **Active Services** | 1 of 8 planned |

---

## 🏃‍♂️ Quick Start Commands

### First Time Setup

```bash
# Clone repository
git clone <repository-url>
cd prospectflow

# Install dependencies
pnpm install

# Start infrastructure
cd infra/postgres
pnpm db:up

# Run migrations
pnpm db:migrate

# Start API
cd apps/ingest-api
pnpm dev
```

### Daily Development

```bash
# Start database
cd infra/postgres && pnpm db:up

# Start API (with hot reload)
cd apps/ingest-api && pnpm dev

# Run tests
pnpm test

# Run tests with coverage
pnpm test -- --coverage

# Build for production
pnpm build

# View logs
docker compose logs -f postgres
docker compose logs -f ingest-api
```

### Database Operations

```bash
# Create new migration
cd infra/postgres
pnpm db:new crm "add tags to companies"

# Run pending migrations
pnpm db:migrate

# Check migration status
pnpm db:info

# Generate schema snapshot
pnpm db:schema

# Access PostgreSQL
docker exec -it prospectflow-postgres psql -U prospectflow -d prospectflow

# Access pgAdmin
# Open http://localhost:5050
```

---

## 🌐 Service Endpoints

| Service | URL | Status | Purpose |
|---------|-----|--------|---------|
| **Ingest API** | http://localhost:3000 | ✅ Active | Data ingestion |
| **pgAdmin** | http://localhost:5050 | ✅ Active | DB management |
| **ClickHouse** | http://localhost:8123 | ⚙️ Ready | Analytics |
| **Tabix** | http://localhost:8080 | ⚙️ Ready | ClickHouse UI |
| **RabbitMQ** | http://localhost:15672 | ⚙️ Ready | Queue management |

### API Routes

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/v1/ingest` | ⏳ Soon | Import Pharow data |
| GET | `/health` | ❌ No | Health check |
| GET | `/metrics` | ❌ No | Prometheus metrics |

---

## 🗄️ Database Access

### Connection Strings

```bash
# PostgreSQL (Development)
postgresql://prospectflow:changeme@localhost:5432/prospectflow

# PostgreSQL (Production) - Use from env vars
postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}

# ClickHouse
http://localhost:8123
```

### Common Queries

```sql
-- Check all tables
SELECT schemaname, tablename 
FROM pg_tables 
WHERE schemaname IN ('iam', 'crm', 'outreach', 'tracking');

-- Count records by schema
SELECT 
  'iam.organisations' as table_name, 
  COUNT(*) as count 
FROM iam.organisations
UNION ALL
SELECT 
  'crm.companies', 
  COUNT(*) 
FROM crm.companies
UNION ALL
SELECT 
  'crm.people', 
  COUNT(*) 
FROM crm.people
UNION ALL
SELECT 
  'crm.positions', 
  COUNT(*) 
FROM crm.positions;

-- View recent migrations
SELECT * FROM flyway_schema_history 
ORDER BY installed_on DESC 
LIMIT 10;

-- Check for data by organisation
SELECT 
  o.name as org_name,
  COUNT(DISTINCT c.id) as companies,
  COUNT(DISTINCT p.id) as people,
  COUNT(DISTINCT pos.id) as positions
FROM iam.organisations o
LEFT JOIN crm.companies c ON c.organisation_id = o.id
LEFT JOIN crm.people p ON p.organisation_id = o.id
LEFT JOIN crm.positions pos ON pos.organisation_id = o.id
GROUP BY o.id, o.name;
```

---

## 📁 Project Structure Cheat Sheet

```
prospectflow/
│
├── apps/                           # Applications
│   └── ingest-api/                # ✅ ACTIVE API
│       ├── src/
│       │   ├── app.ts             # Express app setup
│       │   ├── config/            # Configuration
│       │   ├── controllers/       # Request handlers
│       │   ├── services/          # Business logic
│       │   ├── repositories/      # Database access
│       │   ├── routes/            # Route definitions
│       │   ├── schemas/           # Zod schemas
│       │   ├── entities/          # Type definitions
│       │   ├── middlewares/       # Express middleware
│       │   └── utils/             # Utilities
│       ├── tests/                 # Test files
│       ├── env/                   # Environment configs
│       ├── package.json
│       ├── tsconfig.json
│       ├── Dockerfile
│       └── docker-compose.yaml
│
├── packages/                       # Shared libraries (all planned)
│   ├── email-core/
│   ├── gmail/
│   ├── firestore/
│   ├── messaging/
│   └── odoo/
│
├── infra/                          # Infrastructure
│   ├── postgres/                  # ✅ ACTIVE
│   │   ├── db/
│   │   │   ├── migrations/        # Flyway SQL files
│   │   │   └── schema.sql         # Generated snapshot
│   │   ├── scripts/
│   │   │   ├── db-new-migration.mjs
│   │   │   └── db-schema.sh
│   │   ├── docker-compose.yaml
│   │   └── package.json
│   ├── clickhouse/                # ⚙️ CONFIGURED
│   ├── redis/                     # ⚙️ CONFIGURED
│   └── rabbitmq/                  # ⚙️ CONFIGURED
│
├── doc/                            # Documentation
│   └── implementation-artifacts/
│
├── package.json                    # Root package
├── pnpm-workspace.yaml            # Workspace config
├── tsconfig.json                  # TypeScript config
├── .gitignore
├── README.md
│
└── Analysis Documents (NEW)
    ├── COMPREHENSIVE_PROJECT_ANALYSIS.md
    ├── ANALYSIS_SUMMARY.md
    ├── ACTION_PLAN.md
    ├── ARCHITECTURE.md
    └── QUICK_REFERENCE.md (this file)
```

---

## 🔧 Environment Variables

### Required Variables

```bash
# Application
NODE_ENV=development|test|production
PORT=3000
LOG_LEVEL=debug|info|warn|error

# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=prospectflow
POSTGRES_PASSWORD=changeme
POSTGRES_DB=prospectflow

# Security (COMING SOON)
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRATION=24h
CORS_ORIGIN=http://localhost:3000
```

### Optional Variables

```bash
# Redis (when implemented)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# RabbitMQ (when implemented)
RABBITMQ_URL=amqp://localhost:5672

# ClickHouse (when implemented)
CLICKHOUSE_HOST=localhost
CLICKHOUSE_PORT=8123
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=
```

---

## 🐛 Troubleshooting Guide

### Common Issues

#### 1. Port Already in Use

```bash
# Check what's using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

#### 2. Database Connection Failed

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check logs
docker logs prospectflow-postgres

# Restart PostgreSQL
cd infra/postgres
docker compose restart postgres
```

#### 3. Migration Errors

```bash
# Check migration status
cd infra/postgres
pnpm db:info

# Repair Flyway metadata (if corrupted)
pnpm db:repair

# Manual rollback (if needed)
docker exec -it prospectflow-postgres psql -U prospectflow -d prospectflow
DELETE FROM flyway_schema_history WHERE version = 'X';
```

#### 4. TypeScript Compilation Errors

```bash
# Clean build
rm -rf dist/
pnpm build

# Check TypeScript config
cat tsconfig.json

# Install missing types
pnpm add -D @types/<package-name>
```

#### 5. Docker Network Issues

```bash
# Check if network exists
docker network ls | grep prospectflow

# Create network if missing
docker network create prospectflow-network

# Inspect network
docker network inspect prospectflow-network
```

---

## 🧪 Testing Guide

### Run Tests

```bash
# All tests
cd apps/ingest-api
pnpm test

# Watch mode
pnpm test -- --watch

# With coverage
pnpm test -- --coverage

# Specific test file
pnpm test -- tests/unit/ingest.test.ts

# Update snapshots
pnpm test -- -u
```

### Test Database Setup

```bash
# Create test database
docker exec -it prospectflow-postgres psql -U prospectflow -c "CREATE DATABASE prospectflow_test;"

# Run migrations on test DB
export POSTGRES_DB=prospectflow_test
cd infra/postgres
pnpm db:migrate
```

---

## 📊 Performance Monitoring

### Metrics to Watch

```bash
# Application metrics (when implemented)
curl http://localhost:3000/metrics

# Database performance
docker exec -it prospectflow-postgres psql -U prospectflow -d prospectflow -c "
SELECT 
  query,
  calls,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
"

# Connection pool stats
docker exec -it prospectflow-postgres psql -U prospectflow -d prospectflow -c "
SELECT 
  state,
  COUNT(*) 
FROM pg_stat_activity 
GROUP BY state;
"
```

---

## 🔐 Security Checklist

### Before Production

- [ ] Change all default passwords
- [ ] Generate strong JWT secret (min 32 chars)
- [ ] Enable HTTPS only
- [ ] Configure CORS properly
- [ ] Set up Vault for secrets
- [ ] Enable rate limiting
- [ ] Implement authentication
- [ ] Add input sanitization
- [ ] Enable SQL injection protection
- [ ] Set up audit logging
- [ ] Configure firewall rules
- [ ] Scan for vulnerabilities
- [ ] Review environment variables
- [ ] Secure Docker images
- [ ] Implement RBAC

---

## 📚 Documentation Links

| Document | Purpose |
|----------|---------|
| **COMPREHENSIVE_PROJECT_ANALYSIS.md** | Full analysis (60+ pages) |
| **ANALYSIS_SUMMARY.md** | Executive summary (quick read) |
| **ACTION_PLAN.md** | Prioritized tasks with code examples |
| **ARCHITECTURE.md** | System architecture & diagrams |
| **QUICK_REFERENCE.md** | This file - quick commands |

---

## 🎯 Current Sprint Goals

### Sprint 1 (Weeks 1-2): Security

**Priority:** 🔴 CRITICAL

- [ ] Implement JWT authentication
- [ ] Add organisation_id filtering
- [ ] Add rate limiting
- [ ] Set up secrets management
- [ ] Write security tests

### Sprint 2 (Weeks 3-4): Quality

**Priority:** 🟡 HIGH

- [ ] Write integration tests (80% coverage)
- [ ] Add health checks
- [ ] Implement Prometheus metrics
- [ ] Write API documentation
- [ ] Set up CI/CD

---

## 💡 Tips & Best Practices

### Development

```bash
# Always use pnpm (not npm or yarn)
pnpm install
pnpm add <package>
pnpm add -D <dev-package>

# Use workspace commands
pnpm --filter ./apps/ingest-api <command>
pnpm --filter ./infra/postgres <command>

# Format code before commit
pnpm prettier --write .

# Check TypeScript
pnpm tsc --noEmit
```

### Database

```bash
# Always create migrations for schema changes
pnpm db:new <domain> "<description>"

# Test migrations on dev first
NODE_ENV=dev pnpm db:migrate

# Backup before risky operations
docker exec prospectflow-postgres pg_dump -U prospectflow prospectflow > backup.sql

# Restore from backup
docker exec -i prospectflow-postgres psql -U prospectflow prospectflow < backup.sql
```

### Docker

```bash
# Clean up Docker
docker system prune -a --volumes

# Rebuild from scratch
docker compose down -v
docker compose build --no-cache
docker compose up -d

# View resource usage
docker stats
```

---

## 🚨 Emergency Procedures

### System Down

```bash
# 1. Check all services
docker ps -a

# 2. Check logs
docker compose logs --tail=100 postgres
docker compose logs --tail=100 ingest-api

# 3. Restart services
docker compose restart

# 4. If still failing, recreate
docker compose down
docker compose up -d
```

### Data Corruption

```bash
# 1. Stop application
docker compose stop ingest-api

# 2. Backup current state
docker exec prospectflow-postgres pg_dump -U prospectflow prospectflow > emergency_backup.sql

# 3. Restore from last known good backup
docker exec -i prospectflow-postgres psql -U prospectflow prospectflow < last_good_backup.sql

# 4. Restart application
docker compose start ingest-api
```

### Rollback Deployment

```bash
# 1. Get previous image tag
docker images | grep ingest-api

# 2. Update docker-compose to use previous tag
# Edit docker-compose.yaml

# 3. Redeploy
docker compose up -d ingest-api

# 4. Verify
curl http://localhost:3000/health
```

---

## 📞 Support & Resources

### Internal

- **Code Repository:** Local Git
- **Documentation:** `/doc` directory
- **Analysis Reports:** Root directory (ANALYSIS_*.md)

### External

- **Node.js Docs:** https://nodejs.org/docs
- **Express.js Docs:** https://expressjs.com
- **PostgreSQL Docs:** https://www.postgresql.org/docs/
- **TypeScript Docs:** https://www.typescriptlang.org/docs/
- **Zod Docs:** https://zod.dev
- **Pino Docs:** https://getpino.io
- **Docker Docs:** https://docs.docker.com

---

## 🔄 Git Workflow

### Branch Strategy

```
main (production)
  ↑
dev (staging)
  ↑
feature/* (development)
```

### Common Commands

```bash
# Create feature branch
git checkout dev
git pull origin dev
git checkout -b feature/your-feature-name

# Commit changes
git add .
git commit -m "feat: add authentication middleware"

# Push to remote
git push origin feature/your-feature-name

# Create PR to dev
# Use GitHub/GitLab UI

# After merge, clean up
git checkout dev
git pull origin dev
git branch -d feature/your-feature-name
```

### Commit Message Format

```
type(scope): description

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation
- style: Formatting
- refactor: Code restructuring
- test: Adding tests
- chore: Maintenance

Example:
feat(ingest): add authentication middleware
fix(database): correct multi-tenant query filter
docs(api): add OpenAPI specification
```

---

## ⚡ Performance Tips

### Node.js

```bash
# Use production mode
NODE_ENV=production node dist/app.js

# Increase memory limit if needed
node --max-old-space-size=4096 dist/app.js

# Enable clustering for multi-core
# Use PM2 or built-in cluster module
```

### PostgreSQL

```sql
-- Create indexes for frequent queries
CREATE INDEX idx_positions_email ON crm.positions(organisation_id, email);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM crm.companies WHERE organisation_id = 'uuid';

-- Update statistics
ANALYZE crm.companies;
```

### Docker

```yaml
# Limit container resources
services:
  ingest-api:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
```

---

## 🎓 Learning Resources

### Recommended Reading

1. **Multi-Tenancy:** Row-Level Security in PostgreSQL
2. **Node.js Performance:** Clinic.js profiling
3. **TypeScript:** Advanced types and generics
4. **Security:** OWASP Top 10
5. **Docker:** Multi-stage builds and optimization

### Code Examples

Check these files for implementation examples:
- `apps/ingest-api/src/repositories/ingest.repository.ts` - Database patterns
- `apps/ingest-api/src/middlewares/error.middleware.ts` - Error handling
- `apps/ingest-api/src/schemas/ingest.schema.ts` - Zod validation
- `infra/postgres/db/migrations/*.sql` - SQL patterns

---

*Quick Reference Guide maintained by Development Team*  
*Last Updated: January 8, 2025*
