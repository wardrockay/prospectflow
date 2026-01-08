# Story 0.1: Multi-tenant PostgreSQL Database Setup

**Status:** ready-for-dev  
**Epic:** E0 - Foundation Infrastructure & Architecture  
**Story Points:** 8  
**Priority:** P0 (MVP Foundation)

---

## Story

As a **system architect**,  
I want **a properly configured multi-tenant PostgreSQL database with schema isolation**,  
So that **all customer data is securely separated and the system can scale to 100+ organizations**.

---

## Acceptance Criteria

### AC1: Database Installation and Configuration

**Given** PostgreSQL 18 is installed via Docker  
**When** the database container starts  
**Then** it should be accessible on the configured port  
**And** health checks should pass  
**And** connection pooling should be configured (max 100 connections)

### AC2: Multi-schema Architecture

**Given** the database is running  
**When** the schema migration runs  
**Then** the following schemas should be created:

- `iam` (organizations, users, org_users tables)
- `crm` (companies, people, positions tables)
- `outreach` (campaigns, steps, tasks, messages, prompts tables)
- `tracking` (pixels, stats tables)

**And** each table should include `organisation_id` as part of composite primary key  
**And** all foreign keys should include `organisation_id` for referential integrity

### AC3: Multi-tenant Data Isolation

**Given** multiple organizations exist in the database  
**When** a query is executed with an organisation_id  
**Then** only data for that organization should be returned  
**And** queries without organisation_id should fail with clear error  
**And** indexes should have organisation_id as the first column for performance

### AC4: Flyway Migration Setup

**Given** Flyway 11 is configured  
**When** migrations are run  
**Then** all schema versions should be tracked in `flyway_schema_history`  
**And** migrations should be idempotent and reversible  
**And** migration failure should rollback automatically

---

## Technical Requirements

### Database Configuration

- **Version:** PostgreSQL 18
- **Deployment:** Docker container
- **Connection Pooling:** pgBouncer or connection pool (max 100 connections)
- **Backup:** Daily backups with 30-day retention
- **Multi-tenancy:** Schema-level isolation with `organisation_id` in composite keys

### Schema Structure

#### IAM Schema

```sql
-- iam.organisations
CREATE TABLE iam.organisations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- iam.users
CREATE TABLE iam.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- iam.organisation_users (junction table)
CREATE TABLE iam.organisation_users (
    organisation_id UUID REFERENCES iam.organisations(id),
    user_id UUID REFERENCES iam.users(id),
    role VARCHAR(50) NOT NULL, -- 'admin', 'user', 'viewer'
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (organisation_id, user_id)
);
```

#### CRM Schema

```sql
-- crm.companies
CREATE TABLE crm.companies (
    organisation_id UUID NOT NULL,
    id UUID NOT NULL,
    name VARCHAR(200) NOT NULL,
    website_url VARCHAR(500),
    industry VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (organisation_id, id),
    FOREIGN KEY (organisation_id) REFERENCES iam.organisations(id)
);

-- crm.people
CREATE TABLE crm.people (
    organisation_id UUID NOT NULL,
    id UUID NOT NULL,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    status VARCHAR(50), -- 'New', 'Queued', 'Researched', 'Sent', etc.
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (organisation_id, id),
    FOREIGN KEY (organisation_id) REFERENCES iam.organisations(id),
    UNIQUE (organisation_id, email)
);

-- crm.positions (junction between companies and people)
CREATE TABLE crm.positions (
    organisation_id UUID NOT NULL,
    id UUID NOT NULL,
    person_id UUID NOT NULL,
    company_id UUID NOT NULL,
    title VARCHAR(200),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (organisation_id, id),
    FOREIGN KEY (organisation_id, person_id) REFERENCES crm.people(organisation_id, id),
    FOREIGN KEY (organisation_id, company_id) REFERENCES crm.companies(organisation_id, id)
);
```

#### Outreach Schema

```sql
-- outreach.campaigns
CREATE TABLE outreach.campaigns (
    organisation_id UUID NOT NULL,
    id UUID NOT NULL,
    name VARCHAR(200) NOT NULL,
    value_proposition TEXT,
    template_id UUID,
    status VARCHAR(50), -- 'Draft', 'Active', 'Paused', 'Completed', 'Archived'
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (organisation_id, id),
    FOREIGN KEY (organisation_id) REFERENCES iam.organisations(id)
);

-- outreach.steps
CREATE TABLE outreach.steps (
    organisation_id UUID NOT NULL,
    id UUID NOT NULL,
    campaign_id UUID NOT NULL,
    step_number INT NOT NULL,
    name VARCHAR(200),
    delay_days INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (organisation_id, id),
    FOREIGN KEY (organisation_id, campaign_id) REFERENCES outreach.campaigns(organisation_id, id)
);

-- outreach.messages
CREATE TABLE outreach.messages (
    organisation_id UUID NOT NULL,
    id UUID NOT NULL,
    campaign_id UUID NOT NULL,
    prospect_id UUID NOT NULL,
    subject_line VARCHAR(300),
    body_text TEXT,
    status VARCHAR(50), -- 'Pending Review', 'Approved', 'Sent', 'Failed'
    ai_confidence_score INT,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (organisation_id, id),
    FOREIGN KEY (organisation_id, campaign_id) REFERENCES outreach.campaigns(organisation_id, id),
    FOREIGN KEY (organisation_id, prospect_id) REFERENCES crm.people(organisation_id, id)
);

-- outreach.prompts (AI prompt versioning)
CREATE TABLE outreach.prompts (
    organisation_id UUID NOT NULL,
    id UUID NOT NULL,
    version VARCHAR(50),
    prompt_template TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (organisation_id, id),
    FOREIGN KEY (organisation_id) REFERENCES iam.organisations(id)
);

-- outreach.tasks (for workflow automation)
CREATE TABLE outreach.tasks (
    organisation_id UUID NOT NULL,
    id UUID NOT NULL,
    campaign_id UUID NOT NULL,
    prospect_id UUID NOT NULL,
    task_type VARCHAR(50), -- 'research', 'draft', 'send', 'follow-up'
    status VARCHAR(50), -- 'Queued', 'Processing', 'Complete', 'Failed'
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (organisation_id, id),
    FOREIGN KEY (organisation_id, campaign_id) REFERENCES outreach.campaigns(organisation_id, id),
    FOREIGN KEY (organisation_id, prospect_id) REFERENCES crm.people(organisation_id, id)
);
```

#### Tracking Schema

```sql
-- tracking.pixels (email open tracking)
CREATE TABLE tracking.pixels (
    organisation_id UUID NOT NULL,
    id UUID NOT NULL,
    message_id UUID NOT NULL,
    opened_at TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (organisation_id, id),
    FOREIGN KEY (organisation_id, message_id) REFERENCES outreach.messages(organisation_id, id)
);

-- tracking.stats (aggregated metrics)
CREATE TABLE tracking.stats (
    organisation_id UUID NOT NULL,
    campaign_id UUID NOT NULL,
    date DATE NOT NULL,
    emails_sent INT DEFAULT 0,
    emails_opened INT DEFAULT 0,
    emails_clicked INT DEFAULT 0,
    emails_replied INT DEFAULT 0,
    PRIMARY KEY (organisation_id, campaign_id, date),
    FOREIGN KEY (organisation_id, campaign_id) REFERENCES outreach.campaigns(organisation_id, id)
);
```

### Indexes

```sql
-- IAM Schema Indexes
CREATE INDEX idx_org_users_user_id ON iam.organisation_users(user_id);
CREATE INDEX idx_users_email ON iam.users(email);

-- CRM Schema Indexes
CREATE INDEX idx_people_org_email ON crm.people(organisation_id, email);
CREATE INDEX idx_people_status ON crm.people(organisation_id, status);
CREATE INDEX idx_companies_org ON crm.companies(organisation_id);

-- Outreach Schema Indexes
CREATE INDEX idx_campaigns_org_status ON outreach.campaigns(organisation_id, status);
CREATE INDEX idx_messages_org_campaign ON outreach.messages(organisation_id, campaign_id);
CREATE INDEX idx_messages_status ON outreach.messages(organisation_id, status);
CREATE INDEX idx_tasks_org_status ON outreach.tasks(organisation_id, status);

-- Tracking Schema Indexes
CREATE INDEX idx_pixels_message ON tracking.pixels(organisation_id, message_id);
CREATE INDEX idx_stats_campaign_date ON tracking.stats(organisation_id, campaign_id, date);
```

### Flyway Migration Configuration

- **Migration Location:** `infra/postgres/db/migration/`
- **Naming Convention:** `V{version}__{description}.sql` (e.g., `V1__create_iam_schema.sql`)
- **Rollback Scripts:** `U{version}__{description}.sql`
- **Migration Order:**
  1. V1: Create IAM schema
  2. V2: Create CRM schema
  3. V3: Create Outreach schema
  4. V4: Create Tracking schema
  5. V5: Create indexes

---

## Architecture References

### Multi-Tenant Isolation Pattern

From [ARCHITECTURE.md#Multi-Tenant Isolation Pattern](doc/ARCHITECTURE.md):

- All tables include `organisation_id` as part of composite primary key
- Composite keys: `(organisation_id, id)`
- All foreign keys include `organisation_id` for referential integrity
- Indexes have `organisation_id` as first column for performance
- Row-level security policies (optional, can be added later)

### Connection Pooling

- Use pgBouncer for connection pooling
- Max 100 connections per application instance
- Pool mode: Transaction (default) or Session
- Configure in docker-compose.yml

### Backup Strategy

- Daily automated backups via pg_dump
- Retention: 30 days
- Store in secure location (S3 or similar)
- Test restore procedure monthly

---

## Tasks / Subtasks

### Task 1: Docker Setup and PostgreSQL Installation (AC1)

- [ ] Create `infra/postgres/docker-compose.yaml` with PostgreSQL 18 configuration
- [ ] Configure health check endpoint
- [ ] Set environment variables (POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB)
- [ ] Verify Docker container starts successfully
- [ ] Test database connectivity from host

### Task 2: Flyway Configuration (AC4)

- [ ] Add Flyway 11 to project dependencies
- [ ] Create `infra/postgres/db/migration/` directory structure
- [ ] Configure Flyway in docker-compose.yaml or standalone config
- [ ] Set migration locations and versioning rules
- [ ] Test Flyway connectivity to PostgreSQL

### Task 3: IAM Schema Creation (AC2)

- [ ] Write migration: `V1__create_iam_schema.sql`
  - [ ] Create `iam` schema
  - [ ] Create `organisations` table
  - [ ] Create `users` table
  - [ ] Create `organisation_users` table
- [ ] Run migration and verify tables created
- [ ] Insert seed data for testing (1 org, 1 user)

### Task 4: CRM Schema Creation (AC2)

- [ ] Write migration: `V2__create_crm_schema.sql`
  - [ ] Create `crm` schema
  - [ ] Create `companies` table
  - [ ] Create `people` table
  - [ ] Create `positions` table
- [ ] Run migration and verify tables created
- [ ] Insert seed data for testing

### Task 5: Outreach Schema Creation (AC2)

- [ ] Write migration: `V3__create_outreach_schema.sql`
  - [ ] Create `outreach` schema
  - [ ] Create `campaigns` table
  - [ ] Create `steps` table
  - [ ] Create `messages` table
  - [ ] Create `prompts` table
  - [ ] Create `tasks` table
- [ ] Run migration and verify tables created

### Task 6: Tracking Schema Creation (AC2)

- [ ] Write migration: `V4__create_tracking_schema.sql`
  - [ ] Create `tracking` schema
  - [ ] Create `pixels` table
  - [ ] Create `stats` table
- [ ] Run migration and verify tables created

### Task 7: Create Indexes (AC3)

- [ ] Write migration: `V5__create_indexes.sql`
- [ ] Create all indexes as specified in Technical Requirements
- [ ] Verify index creation with `\di` command
- [ ] Test query performance with sample data

### Task 8: Multi-Tenant Isolation Testing (AC3)

- [ ] Insert test data for 2 different organizations
- [ ] Write test queries with `organisation_id` filter
- [ ] Verify data isolation (Org A cannot see Org B data)
- [ ] Test queries without `organisation_id` (should fail or return empty)
- [ ] Document multi-tenant query patterns

### Task 9: Connection Pooling Setup

- [ ] Install and configure pgBouncer (if using)
- [ ] Set max connections to 100
- [ ] Test connection pooling under load
- [ ] Monitor connection usage

### Task 10: Backup Configuration

- [ ] Create backup script using pg_dump
- [ ] Configure cron job for daily backups
- [ ] Set 30-day retention policy
- [ ] Test backup and restore procedure
- [ ] Document backup/restore process

### Task 11: Documentation and Cleanup

- [ ] Update README with database setup instructions
- [ ] Document connection strings and environment variables
- [ ] Create database diagram (ERD)
- [ ] Write developer guide for adding new tables/migrations
- [ ] Code review and merge

---

## Dev Notes

### Project Structure Alignment

This story establishes the foundational database structure that will be used throughout the project. All future stories will reference these schemas and tables.

**Key Paths:**

- Migrations: `infra/postgres/db/migration/`
- Docker Compose: `infra/postgres/docker-compose.yaml`
- Seed Data: `infra/postgres/db/seeds/` (optional)

### Multi-Tenant Best Practices

1. **Always include organisation_id in queries:**

   ```sql
   SELECT * FROM crm.people
   WHERE organisation_id = ? AND email = ?
   ```

2. **Never use simple foreign keys without organisation_id:**

   ```sql
   -- WRONG
   FOREIGN KEY (person_id) REFERENCES crm.people(id)

   -- CORRECT
   FOREIGN KEY (organisation_id, person_id) REFERENCES crm.people(organisation_id, id)
   ```

3. **Index performance:**
   - Always put `organisation_id` first in composite indexes
   - Example: `CREATE INDEX idx ON table(organisation_id, status, created_at)`

### Testing Considerations

- Unit tests: Test migration scripts individually
- Integration tests: Test multi-tenant data isolation
- Performance tests: Test query performance with 10k+ rows per org
- Security tests: Ensure no cross-org data leakage

### Dependencies

- **None** - This is the foundation story. All other stories depend on this.

### References

- [Source: doc/ARCHITECTURE.md#Database Schema Architecture](doc/ARCHITECTURE.md)
- [Source: doc/ARCHITECTURE.md#Multi-Tenant Isolation Pattern](doc/ARCHITECTURE.md)
- [Source: doc/epics.md#Story E0.1](doc/epics.md)
- [PostgreSQL 18 Documentation](https://www.postgresql.org/docs/18/)
- [Flyway Documentation](https://flywaydb.org/documentation/)

---

## Definition of Done

- [ ] PostgreSQL 18 running in Docker container
- [ ] All four schemas created with tables (iam, crm, outreach, tracking)
- [ ] Flyway migrations working (can run, rollback, and track versions)
- [ ] Multi-tenant isolation tested with sample data (2+ orgs)
- [ ] Database backup configured (daily, 30-day retention)
- [ ] Connection pooling configured (max 100 connections)
- [ ] All indexes created and verified
- [ ] Documentation updated (README, setup guide, ERD diagram)
- [ ] Code reviewed and merged to main branch
- [ ] Integration tests passing (multi-tenant data isolation)

---

## Dev Agent Record

### Agent Model Used

_To be filled by Dev Agent_

### Implementation Notes

_To be filled by Dev Agent during implementation_

### Completion Date

_To be filled by Dev Agent_

### Files Modified

_To be filled by Dev Agent_

- infra/postgres/docker-compose.yaml
- infra/postgres/db/migration/\*.sql
- README.md or setup documentation
