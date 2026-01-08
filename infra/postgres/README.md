# PostgreSQL Database Setup - ProspectFlow

## Overview

This directory contains the PostgreSQL database configuration for ProspectFlow, implementing a **multi-tenant architecture** with schema-level isolation.

## 🏗️ Architecture

### Multi-Tenant Design

- **Pattern**: Schema-based isolation with `organisation_id` in composite keys
- **Schemas**: `iam`, `crm`, `outreach`, `tracking`
- **Isolation**: All tables include `organisation_id` as part of composite primary key `(organisation_id, id)`
- **Referential Integrity**: All foreign keys include `organisation_id` to prevent cross-org data leaks

### Database Version

- **PostgreSQL**: 18-alpine
- **Extensions**: `pgcrypto`, `citext`
- **Migration Tool**: Flyway 11

## 📁 Directory Structure

```
infra/postgres/
├── docker-compose.yaml      # Docker services: PostgreSQL, pgAdmin, Flyway
├── .env                      # Environment variables (git-ignored)
├── .env.example              # Example environment file
├── package.json              # NPM scripts for database management
├── db/
│   ├── migrations/           # Flyway migration files (versioned)
│   │   ├── V20251223_112356___base_init.sql
│   │   ├── V20251223_112456___iam_init.sql
│   │   ├── V20251223_112543___crm_init.sql
│   │   ├── V20251223_125520___outreach_tracking_schemas.sql
│   │   ├── V20251223_125614___outreach_init.sql
│   │   └── V20251223_125657___tracking_pixels_and_open_stats.sql
│   ├── schema.sql            # Complete schema dump
│   ├── validation-tests.sql  # SQL tests for AC validation
│   └── VALIDATION.md         # Detailed validation documentation
└── scripts/                  # Utility scripts
```

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose installed
- Network `prospectflow-network` created (auto-created by scripts)

### 1. Setup Environment

```bash
cd infra/postgres
cp .env.example .env
# Edit .env with secure passwords
```

### 2. Create Docker Network

```bash
docker network create prospectflow-network
```

### 3. Start Database

```bash
# Using Docker Compose (standalone)
docker compose up -d

# OR using NPM script (from package.json)
npm run db:start
```

This will:

1. Start PostgreSQL 18 container
2. Run health checks
3. Execute Flyway migrations automatically
4. Start pgAdmin for database management

### 4. Verify Setup

```bash
# Check container status
docker compose ps

# View Flyway migration logs
docker compose logs flyway

# Check PostgreSQL logs
docker compose logs postgres
```

### 5. Access Database

**Command Line:**

```bash
# Using psql
psql -h localhost -p 5432 -U prospectflow -d prospectflow

# Using Docker exec
docker exec -it prospectflow-postgres psql -U prospectflow -d prospectflow
```

**pgAdmin Web Interface:**

- URL: http://localhost:5050
- Email: `admin@prospectflow.local` (or from .env)
- Password: (from .env `PGADMIN_PASSWORD`)

**Add Server in pgAdmin:**

- Host: `postgres` (Docker network) or `localhost` (external)
- Port: `5432`
- Username: `prospectflow`
- Password: (from .env `POSTGRES_PASSWORD`)

## 🧪 Running Validation Tests

After migrations complete, verify the setup:

```bash
# Run validation test suite
docker exec -it prospectflow-postgres psql -U prospectflow -d prospectflow -f /validation-tests.sql

# OR from host (if psql installed)
psql -h localhost -U prospectflow -d prospectflow -f db/validation-tests.sql
```

Expected output: All tests should show `✅ PASS`

## 📊 Schema Overview

### IAM Schema (Identity & Access Management)

- **organisations**: Tenant/organization entities
- **users**: User accounts
- **organisation_users**: Many-to-many relationship with roles

### CRM Schema (Contact Relationship Management)

- **companies**: Business entities with SIREN, NAF, Pharow integration
- **people**: Individual contacts
- **positions**: Junction table linking people to companies with email addresses

### Outreach Schema (Campaign Management)

- **campaigns**: Email campaign definitions
- **workflow_steps**: Multi-step email sequences
- **prompts**: Versioned AI prompts for email generation
- **messages**: Sent/received emails with tracking
- **tasks**: Scheduled actions for campaign execution
- **step_experiments**: A/B test definitions per step
- **step_experiment_variants**: A/B test variants (A/B splits)
- **campaign_enrollments**: Prospect enrollment in campaigns
- **enrollment_step_variant_assignments**: Stable A/B variant assignments

### Tracking Schema (Analytics)

- **pixels**: Email open tracking via pixel tokens
- **message_open_stats**: Aggregated open statistics per message

## 🔧 Database Operations

### Migrations

```bash
# Run migrations (auto-run on container start)
docker compose up flyway

# Rollback NOT supported by Flyway - use manual undo scripts if needed

# Create new migration
# Naming: V{timestamp}___{description}.sql
# Example: V20260115_143000___add_user_preferences.sql
touch db/migrations/V$(date +%Y%m%d_%H%M%S)___your_description.sql
```

**Migration Best Practices:**

1. Always use `IF NOT EXISTS` for idempotency
2. Add `organisation_id` to all new tables (except iam.organisations, iam.users)
3. Use composite keys: `PRIMARY KEY (organisation_id, id)`
4. Foreign keys must include `organisation_id`
5. Indexes should have `organisation_id` as first column
6. Add unique constraint: `UNIQUE (organisation_id, id)` for FK targets

### Backup & Restore

**Backup:**

```bash
# Full database backup
docker exec prospectflow-postgres pg_dump -U prospectflow prospectflow > backup_$(date +%Y%m%d_%H%M%S).sql

# Schema-only backup
docker exec prospectflow-postgres pg_dump -U prospectflow -s prospectflow > schema_$(date +%Y%m%d).sql

# Data-only backup for specific schema
docker exec prospectflow-postgres pg_dump -U prospectflow -a -n crm prospectflow > crm_data_$(date +%Y%m%d).sql
```

**Restore:**

```bash
# Restore from backup
docker exec -i prospectflow-postgres psql -U prospectflow -d prospectflow < backup_file.sql

# Restore specific schema
docker exec -i prospectflow-postgres psql -U prospectflow -d prospectflow -c "DROP SCHEMA IF EXISTS crm CASCADE"
docker exec -i prospectflow-postgres psql -U prospectflow -d prospectflow < crm_backup.sql
```

**Automated Backups (Production):**

- Set up cron job for daily backups
- Retention: 30 days
- Store in secure location (S3, Azure Blob, etc.)
- Test restore procedure monthly

### Stop Database

```bash
# Stop all services
docker compose down

# Stop and remove volumes (⚠️ DATA LOSS)
docker compose down -v
```

## 🔐 Security Considerations

1. **Never commit `.env`** - Contains sensitive credentials
2. **Rotate passwords regularly** in production
3. **Use strong passwords** (20+ characters, mixed case, symbols)
4. **Restrict network access** - Only expose ports needed
5. **Enable SSL/TLS** for production connections
6. **Row-level security (RLS)** - Consider adding for extra isolation
7. **Audit logging** - Enable PostgreSQL audit logs in production

## 🚨 Troubleshooting

### Container won't start

```bash
# Check logs
docker compose logs postgres

# Common issues:
# - Port 5432 already in use: Change port in docker-compose.yaml
# - Network doesn't exist: Run `docker network create prospectflow-network`
# - Permission issues: Check volume permissions
```

### Flyway migration fails

```bash
# View Flyway logs
docker compose logs flyway

# Manual migration repair (if needed)
docker exec -it prospectflow-postgres psql -U prospectflow -d prospectflow
# Then: SELECT * FROM flyway_schema_history;
# Delete failed entry if needed: DELETE FROM flyway_schema_history WHERE version = 'X.X';

# Re-run migrations
docker compose up flyway
```

### Connection refused

```bash
# Check if PostgreSQL is ready
docker exec prospectflow-postgres pg_isready -U prospectflow

# Check port binding
docker compose ps
netstat -tuln | grep 5432

# Test connection
psql -h localhost -p 5432 -U prospectflow -d prospectflow -c "SELECT version();"
```

### Data isolation issues

```bash
# Run validation tests
psql -h localhost -U prospectflow -d prospectflow -f db/validation-tests.sql

# Check if organisation_id is in queries
# BAD:  SELECT * FROM crm.people WHERE email = 'test@example.com';
# GOOD: SELECT * FROM crm.people WHERE organisation_id = ? AND email = 'test@example.com';
```

## 📈 Performance Tuning

### Connection Pooling

**Option 1: pgBouncer (Recommended for production)**

Add to `docker-compose.yaml`:

```yaml
pgbouncer:
  image: pgbouncer/pgbouncer:latest
  environment:
    DATABASES_HOST: postgres
    DATABASES_PORT: 5432
    DATABASES_USER: prospectflow
    DATABASES_PASSWORD: ${POSTGRES_PASSWORD}
    DATABASES_DBNAME: prospectflow
    PGBOUNCER_POOL_MODE: transaction
    PGBOUNCER_MAX_CLIENT_CONN: 1000
    PGBOUNCER_DEFAULT_POOL_SIZE: 25
  ports:
    - '6432:5432'
```

**Option 2: Application-level pooling**

- Use connection pool in Node.js (pg-pool)
- Configure max connections: 20-50 per app instance
- Total connections across all apps should not exceed 100

### Index Optimization

```sql
-- Monitor slow queries
CREATE EXTENSION pg_stat_statements;

-- Find missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname IN ('iam', 'crm', 'outreach', 'tracking')
ORDER BY n_distinct DESC;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname IN ('iam', 'crm', 'outreach', 'tracking')
ORDER BY idx_scan ASC;
```

## 📚 Resources

- [PostgreSQL 18 Documentation](https://www.postgresql.org/docs/18/)
- [Flyway Documentation](https://flywaydb.org/documentation/)
- [Multi-Tenant Database Design](https://docs.microsoft.com/en-us/azure/sql-database/saas-tenancy-app-design-patterns)
- [ProspectFlow Architecture](../../doc/ARCHITECTURE.md)

## 🤝 Contributing

When adding new tables or migrations:

1. Follow multi-tenant pattern (organisation_id in PK)
2. Add comprehensive indexes
3. Use CHECK constraints for enum-like fields
4. Add updated_at triggers
5. Update VALIDATION.md
6. Test with validation-tests.sql

## 📝 License

Proprietary - ProspectFlow Internal Use Only
