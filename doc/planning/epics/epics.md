---
workflow: '[CS] Create Story'
generated: '2025-01-XX'
version: '1.1'
status: 'Complete'
inputDocuments:
  - PRD-ProspectFlow.md
  - ARCHITECTURE.md
  - sprint-status.yaml
  - UX Design Documentation
totalEpics: 14
totalStories: 79
estimatedTotalStoryPoints: 287
---

# ProspectFlow - Epic & User Story Breakdown

## Document Purpose

This document provides comprehensive user stories with detailed acceptance criteria for all 14 epics in the ProspectFlow project. Each story follows the standard user story format with Given/When/Then acceptance criteria, technical considerations, dependencies, and definition of done.

## Table of Contents

- [Epic E0: Foundation Infrastructure & Architecture](#epic-e0-foundation-infrastructure--architecture)
- [Epic E1: Campaign Management Foundation](#epic-e1-campaign-management-foundation)
- [Epic E2: Prospect Import & Validation Pipeline](#epic-e2-prospect-import--validation-pipeline)
- [Epic E3: Automated Prospect Research Engine](#epic-e3-automated-prospect-research-engine)
- [Epic E4: AI Email Draft Generation](#epic-e4-ai-email-draft-generation)
- [Epic E5: Email Review & Approval Interface](#epic-e5-email-review--approval-interface)
- [Epic E6: Gmail Integration & Email Sending](#epic-e6-gmail-integration--email-sending)
- [Epic E7: Response Tracking & Notifications](#epic-e7-response-tracking--notifications)
- [Epic E8: Campaign Analytics Dashboard](#epic-e8-campaign-analytics-dashboard)
- [Epic E9: Follow-up Sequence Automation](#epic-e9-follow-up-sequence-automation)
- [Epic E10: Email Template Library](#epic-e10-email-template-library)
- [Epic E11: Social Media Deep Integration](#epic-e11-social-media-deep-integration)
- [Epic E12: CRM Integration](#epic-e12-crm-integration)
- [Epic E13: A/B Testing Framework](#epic-e13-ab-testing-framework)

---

## Epic E0: Foundation Infrastructure & Architecture

**Priority:** P0 (MVP Foundation)  
**Status:** In Progress  
**Estimated Story Points:** 37  
**Dependencies:** None (Starting Point)  
**Requirements Covered:** NFR3, NFR4, NFR5, NFR14, NFR15, NFR16

**Epic Goal:** Establish the core technical infrastructure, multi-tenant architecture, authentication, monitoring, and deployment pipeline that all other features will be built upon.

**Success Criteria:**

- Multi-tenant PostgreSQL database operational with all schemas
- Authentication and authorization working
- Docker-based deployment pipeline functional
- Monitoring and logging infrastructure in place
- CI/CD pipeline operational

---

### Story E0.1: Multi-tenant PostgreSQL Database Setup

**Story Points:** 8

As a **system architect**,  
I want **a properly configured multi-tenant PostgreSQL database with schema isolation**,  
So that **all customer data is securely separated and the system can scale to 100+ organizations**.

**Acceptance Criteria:**

**AC1: Database Installation and Configuration**

**Given** PostgreSQL 18 is installed via Docker  
**When** the database container starts  
**Then** it should be accessible on the configured port  
**And** health checks should pass  
**And** connection pooling should be configured (max 100 connections)

**AC2: Multi-schema Architecture**

**Given** the database is running  
**When** the schema migration runs  
**Then** the following schemas should be created:

- `iam` (organizations, users, org_users tables)
- `crm` (companies, people, positions tables)
- `outreach` (campaigns, steps, tasks, messages, prompts tables)
- `tracking` (pixels, stats tables)  
  **And** each table should include `organisation_id` as part of composite primary key  
  **And** all foreign keys should include `organisation_id` for referential integrity

**AC3: Multi-tenant Data Isolation**

**Given** multiple organizations exist in the database  
**When** a query is executed with an organisation_id  
**Then** only data for that organization should be returned  
**And** queries without organisation_id should fail with clear error  
**And** indexes should have organisation_id as the first column for performance

**AC4: Flyway Migration Setup**

**Given** Flyway 11 is configured  
**When** migrations are run  
**Then** all schema versions should be tracked in `flyway_schema_history`  
**And** migrations should be idempotent and reversible  
**And** migration failure should rollback automatically

**Technical Considerations:**

- Use composite primary keys: (organisation_id, id)
- Create appropriate indexes for common queries
- Set up row-level security policies if needed
- Configure connection pooling with pgBouncer
- Set up database backups (daily, 30-day retention)

**Definition of Done:**

- [ ] PostgreSQL 18 running in Docker container
- [ ] All four schemas created with tables
- [ ] Flyway migrations working
- [ ] Multi-tenant isolation tested with sample data
- [ ] Database backup configured
- [ ] Connection pooling configured
- [ ] Documentation updated

**Dependencies:** None

---

### Story E0.2: Express.js API Foundation with Layered Architecture

**Story Points:** 5

As a **backend developer**,  
I want **a well-structured Express.js API with proper layering**,  
So that **the codebase is maintainable, testable, and follows best practices**.

**Acceptance Criteria:**

**AC1: Express Server Setup**

**Given** Node.js 20.x and TypeScript 5.8.2 are configured  
**When** the server starts  
**Then** it should listen on the configured port  
**And** health check endpoint `/health` should return 200 OK  
**And** all endpoints should use JSON middleware

**AC2: Layered Architecture Implementation**

**Given** the API receives a request  
**When** the request flows through the system  
**Then** it should follow this layer pattern:

- **Controller Layer**: Request validation (Zod schemas), response formatting
- **Service Layer**: Business logic, orchestration
- **Repository Layer**: Database operations, queries  
  **And** each layer should have clear responsibilities  
  **And** no layer should skip or bypass another

**AC3: Zod Validation Middleware**

**Given** an API endpoint receives a request  
**When** the request data is invalid  
**Then** Zod should validate the input  
**And** return 400 Bad Request with detailed validation errors  
**And** log the validation failure

**AC4: Error Handling Middleware**

**Given** an error occurs anywhere in the application  
**When** the error is thrown or returned  
**Then** the global error handler should catch it  
**And** return appropriate HTTP status code (4xx for client errors, 5xx for server errors)  
**And** return user-friendly error message (not stack traces in production)  
**And** log the full error details with context

**Technical Considerations:**

- Use async/await with proper error handling
- Implement dependency injection for testability
- Use Express.Router for modular route organization
- Set up CORS middleware for frontend
- Configure rate limiting per endpoint
- Use helmet.js for security headers

**Definition of Done:**

- [ ] Express server running with TypeScript
- [ ] Controller/Service/Repository layers implemented
- [ ] Zod validation working on sample endpoint
- [ ] Global error handler implemented
- [ ] Health check endpoint functional
- [ ] Unit tests for each layer (>70% coverage)
- [ ] API documentation started

**Dependencies:** E0.1 (Database Setup)

---

### Story E0.3: RabbitMQ Message Queue Configuration

**Story Points:** 5

As a **backend developer**,  
I want **RabbitMQ configured for async job processing**,  
So that **long-running tasks (research, drafts, follow-ups) don't block API responses**.

**Acceptance Criteria:**

**AC1: RabbitMQ Installation**

**Given** RabbitMQ is deployed via Docker  
**When** the container starts  
**Then** RabbitMQ should be accessible on configured port  
**And** management UI should be available  
**And** health checks should pass

**AC2: Queue Creation**

**Given** RabbitMQ is running  
**When** the application initializes  
**Then** the following queues should be created:

- `draft_queue` (email draft generation jobs)
- `followup_queue` (follow-up scheduling jobs)
- `reply_queue` (reply detection jobs)  
  **And** queues should be durable (survive restarts)  
  **And** dead letter queue should be configured for failed messages

**AC3: Publisher Setup**

**Given** a service needs to enqueue a job  
**When** the job is published to a queue  
**Then** the message should be persisted in RabbitMQ  
**And** confirmation should be received  
**And** publish should timeout after 5 seconds with retry

**AC4: Consumer Setup**

**Given** a worker starts  
**When** it connects to RabbitMQ  
**Then** it should start consuming messages from its queue  
**And** process one message at a time (prefetch=1 for even distribution)  
**And** acknowledge (ACK) successful processing  
**And** negative acknowledge (NACK) failed processing for retry

**Technical Considerations:**

- Use amqplib or amqp-connection-manager for Node.js
- Implement connection retry logic
- Set message TTL for stale jobs
- Configure max retry count (3 attempts)
- Use topic exchanges for routing flexibility
- Monitor queue depth and consumer lag

**Definition of Done:**

- [ ] RabbitMQ running in Docker
- [ ] All queues created and configured
- [ ] Publisher utility function working
- [ ] Consumer base class implemented
- [ ] Dead letter queue tested
- [ ] Connection retry logic verified
- [ ] Monitoring metrics exposed

**Dependencies:** None (runs independently)

---

### Story E0.4: Authentication & Authorization System

**Story Points:** 8

As a **security engineer**,  
I want **robust authentication and authorization with JWT tokens**,  
So that **only authenticated users can access their organization's data**.

**Acceptance Criteria:**

**AC1: JWT Token Generation**

**Given** a user successfully logs in  
**When** authentication is verified  
**Then** a JWT token should be generated containing:

- `user_id` (UUID)
- `organisation_id` (UUID)
- `email`
- `roles` (array)
- `exp` (expiration timestamp, 24 hours)  
  **And** the token should be signed with secret key  
  **And** token should be returned to client

**AC2: JWT Token Validation Middleware**

**Given** an API request includes Authorization header  
**When** the middleware validates the token  
**Then** it should verify token signature  
**And** check expiration  
**And** extract user_id and organisation_id  
**And** attach to request context for downstream use  
**And** return 401 Unauthorized if invalid or expired

**AC3: Organization-level Authorization**

**Given** a user makes a request for a resource  
**When** the service layer queries the database  
**Then** the query must include the user's organisation_id  
**And** resources from other organizations should not be accessible  
**And** attempt to access other org's data should return 403 Forbidden

**AC4: Role-based Access Control (RBAC)**

**Given** a user has specific roles (admin, user, viewer)  
**When** they attempt an action requiring permissions  
**Then** their roles should be checked  
**And** admin actions should be restricted to admin role  
**And** unauthorized actions should return 403 Forbidden

**AC5: Session Management**

**Given** a user is authenticated  
**When** their session expires (24 hours)  
**Then** subsequent requests should be rejected with 401  
**And** user should be prompted to re-authenticate  
**And** refresh token flow should allow seamless renewal

**Technical Considerations:**

- Use bcrypt for password hashing (if implementing password auth)
- Store JWT secret in environment variable
- Implement token refresh endpoint
- Add request context object for user/org info
- Log all authentication attempts
- Consider implementing rate limiting on auth endpoints

**Definition of Done:**

- [ ] JWT generation working
- [ ] Authentication middleware implemented
- [ ] Authorization checks in service layer
- [ ] RBAC system functional
- [ ] Session expiration working
- [ ] Security tests passed
- [ ] Documentation for auth flow

**Dependencies:** E0.1 (Database Setup), E0.2 (API Foundation)

---

### Story E0.5: Extract Auth to Shared Package

**Story Points:** 3

As a **ProspectFlow platform developer**,  
I want **authentication code extracted into a shared package**,  
So that **all services (backend APIs, frontend, workers) can reuse the same authentication logic without code duplication**.

**Acceptance Criteria:**

**AC1: Package Structure**

**Given** the auth code exists in ingest-api  
**When** the extraction is complete  
**Then** `packages/auth-core` should exist with:

- TypeScript configuration with declaration files
- Proper package.json with exports for backend and frontend
- All auth types, middlewares, and services migrated
  **And** the package should build successfully with `pnpm build`

**AC2: Code Migration**

**Given** auth components exist in `apps/ingest-api/src/`  
**When** they are migrated to `packages/auth-core/`  
**Then** the following should be moved:

- `types/cognito.ts` → auth-core types
- `types/session.ts` → auth-core types
- `config/cognito.ts` → auth-core config
- `middlewares/cognito-auth.middleware.ts` → auth-core middlewares
- `middlewares/session.middleware.ts` → auth-core middlewares
- `services/session.service.ts` → auth-core services
- `services/user-sync.service.ts` → auth-core services
  **And** no auth-related code should remain in ingest-api (except instantiation)

**AC3: Workspace Integration**

**Given** the package is created  
**When** ingest-api imports from `@prospectflow/auth-core`  
**Then** TypeScript types should resolve correctly  
**And** runtime imports should work without errors  
**And** all existing tests should pass

**AC4: Frontend Compatibility**

**Given** the package has frontend exports  
**When** importing from `@prospectflow/auth-core/frontend`  
**Then** only types should be exported (no Node.js dependencies)  
**And** types should be usable in Nuxt/Vue components

**AC5: No Regressions**

**Given** the migration is complete  
**When** running all ingest-api tests  
**Then** all tests should pass  
**And** the auth flow should work end-to-end  
**And** session management should be unchanged

**Technical Considerations:**

- Use factory functions for configurable middlewares
- Make services dependency-injectable (Redis client, DB pool)
- Keep default exports that read from env vars for convenience
- Use tsup for bundling with ESM and CJS support
- Ensure peer dependencies for Express and Redis

**Definition of Done:**

- [ ] Package structure created with proper config
- [ ] All auth code migrated from ingest-api
- [ ] Package linked in pnpm workspace
- [ ] ingest-api imports updated to use package
- [ ] All existing tests pass
- [ ] Frontend exports available without Node.js deps
- [ ] README documentation complete
- [ ] Package tests with >80% coverage

**Dependencies:** E0.4 (AWS Cognito Authentication)

---

### Story E0.6: Structured Logging with Pino

**Story Points:** 3

As a **DevOps engineer**,  
I want **structured JSON logging throughout the application**,  
So that **I can easily search, filter, and analyze logs in production**.

**Acceptance Criteria:**

**AC1: Pino Logger Setup**

**Given** Pino 9.6.0 is installed  
**When** the application starts  
**Then** a root logger should be initialized  
**And** log level should be configurable via environment variable  
**And** logs should be output in JSON format

**AC2: Request Logging**

**Given** an API request is received  
**When** the request middleware runs  
**Then** it should log:

- Request ID (UUID)
- HTTP method and path
- Request timestamp
- User ID and organization ID (if authenticated)
- Request duration (in response log)
- Response status code  
  **And** sensitive data (passwords, tokens) should be redacted

**AC3: Error Logging**

**Given** an error occurs in the application  
**When** the error handler catches it  
**Then** it should log:

- Error message and stack trace
- Request context (user, org, endpoint)
- Timestamp
- Error type/code  
  **And** logs should be at appropriate level (error, warn, info, debug)

**AC4: Performance Logging**

**Given** a long-running operation completes  
**When** the operation finishes  
**Then** it should log:

- Operation name
- Duration in milliseconds
- Success/failure status
- Key metrics (records processed, etc.)

**Technical Considerations:**

- Use child loggers for different modules
- Include correlation IDs for request tracing
- Log sampling for high-volume operations
- Configure log rotation (file size/time-based)
- Consider using pino-pretty for development

**Definition of Done:**

- [ ] Pino configured and working
- [ ] Request logging implemented
- [ ] Error logging implemented
- [ ] Performance logging for key operations
- [ ] Log redaction for sensitive data
- [ ] Log format documented
- [ ] Sample logs verified

**Dependencies:** E0.2 (API Foundation)

---

### Story E0.7: Error Tracking with Sentry

**Story Points:** 2

As a **DevOps engineer**,  
I want **centralized error tracking and alerting**,  
So that **I'm notified immediately when production errors occur**.

**Acceptance Criteria:**

**AC1: Sentry Integration**

**Given** Sentry SDK is installed  
**When** the application initializes  
**Then** Sentry should be configured with DSN  
**And** environment should be set (dev, staging, prod)  
**And** error sampling rate should be configured

**AC2: Automatic Error Capture**

**Given** an uncaught exception occurs  
**When** the error bubbles to the global handler  
**Then** Sentry should capture the error  
**And** include stack trace, request context, user info  
**And** assign severity level (error, warning, info)  
**And** group similar errors together

**AC3: Contextual Information**

**Given** an error is captured  
**When** Sentry processes it  
**Then** it should include:

- User ID and organization ID
- Request URL and method
- Environment variables (non-sensitive)
- Breadcrumbs (recent actions leading to error)
- Custom tags (service name, operation type)

**AC4: Alerting Configuration**

**Given** an error occurs in production  
**When** Sentry captures it  
**Then** alerts should be sent based on rules:

- Critical errors: immediate Slack/email
- New error types: daily digest
- Error threshold exceeded: alert on spike

**Technical Considerations:**

- Use Sentry's Express integration
- Filter out expected errors (400 validation errors)
- Set release tracking for deployment correlation
- Configure data scrubbing for PII
- Monitor Sentry quota usage

**Definition of Done:**

- [ ] Sentry initialized in application
- [ ] Errors automatically captured
- [ ] Context information included
- [ ] Alert rules configured
- [ ] Test error verified in Sentry dashboard
- [ ] Team notified of setup

**Dependencies:** E0.2 (API Foundation), E0.6 (Logging)

---

### Story E0.8: Prometheus Metrics & Grafana Dashboards

**Story Points:** 5

As a **DevOps engineer**,  
I want **comprehensive application metrics and visualization**,  
So that **I can monitor system health and performance in real-time**.

**Acceptance Criteria:**

**AC1: Prometheus Setup**

**Given** Prometheus is deployed via Docker  
**When** it starts  
**Then** it should scrape metrics from application  
**And** store time-series data  
**And** be accessible on configured port

**AC2: Application Metrics Exposure**

**Given** the application is running  
**When** Prometheus scrapes the `/metrics` endpoint  
**Then** the following metrics should be available:

- **HTTP Metrics**: Request count, duration histogram, response codes
- **Business Metrics**: Emails sent, drafts generated, prospects processed
- **System Metrics**: CPU usage, memory usage, event loop lag
- **Database Metrics**: Query duration, connection pool usage
- **Queue Metrics**: Message count, processing duration, failures

**AC3: Grafana Dashboard Creation**

**Given** Grafana is configured with Prometheus datasource  
**When** the dashboard is loaded  
**Then** it should display:

- **Overview Panel**: System health, request rate, error rate
- **API Performance**: Endpoint latency (p50, p95, p99), throughput
- **Database Panel**: Query performance, connection pool
- **Queue Panel**: Queue depth, consumer lag, processing rate
- **Business Metrics**: Emails sent/hour, draft success rate

**AC4: Alerting Rules**

**Given** Prometheus has alerting rules configured  
**When** a threshold is breached  
**Then** an alert should fire:

- API error rate > 5% for 5 minutes
- Database query time > 500ms (p95)
- Queue depth > 1000 messages
- Memory usage > 80%  
  **And** alerts should route to Slack/PagerDuty

**Technical Considerations:**

- Use prom-client library for Node.js
- Implement custom metrics for business KPIs
- Use histogram for latency (not gauge)
- Set appropriate bucket sizes
- Configure retention period for Prometheus data
- Create dashboard templates for each service

**Definition of Done:**

- [ ] Prometheus scraping metrics
- [ ] Application exposing metrics
- [ ] Grafana dashboard created
- [ ] Key visualizations working
- [ ] Alert rules configured
- [ ] Alerts tested and routed correctly
- [ ] Dashboard shared with team

**Dependencies:** E0.2 (API Foundation)

---

### Story E0.9: Docker Compose Orchestration

**Story Points:** 3

As a **DevOps engineer**,  
I want **all services orchestrated via Docker Compose**,  
So that **the entire stack can be deployed consistently across environments**.

**Acceptance Criteria:**

**AC1: Docker Compose File Structure**

**Given** docker-compose.yml is defined  
**When** `docker-compose up` is run  
**Then** all services should start in correct order:

1. PostgreSQL
2. RabbitMQ
3. Redis
4. ClickHouse
5. API services (Ingest, Campaign, Tracking)
6. Workers (Draft, Followup, Reply Detector)
7. Monitoring (Prometheus, Grafana)

**AC2: Service Configuration**

**Given** each service is containerized  
**When** containers start  
**Then** they should use environment variables for configuration  
**And** volumes should persist data (PostgreSQL data, logs)  
**And** networks should enable inter-service communication  
**And** health checks should be defined for each service

**AC3: Development Environment**

**Given** a developer runs `docker-compose up`  
**When** all services are running  
**Then** the application should be accessible on localhost  
**And** hot-reload should work for code changes  
**And** logs should stream to console

**AC4: Production-like Staging**

**Given** a staging environment is deployed  
**When** `docker-compose -f docker-compose.prod.yml up` runs  
**Then** it should use production-like configuration  
**And** enable resource limits (CPU, memory)  
**And** use production image tags

**Technical Considerations:**

- Use multi-stage Docker builds for smaller images
- Implement health checks with retry logic
- Use Docker secrets for sensitive configuration
- Configure restart policies (on-failure)
- Set up log aggregation
- Use Docker networks for isolation

**Definition of Done:**

- [ ] docker-compose.yml complete
- [ ] All services start successfully
- [ ] Service dependencies configured
- [ ] Health checks working
- [ ] Volume persistence verified
- [ ] Development workflow smooth
- [ ] Documentation for setup

**Dependencies:** E0.1 (Database), E0.3 (RabbitMQ)

---

### Story E0.10: CI/CD Pipeline with GitHub Actions

**Story Points:** 5

As a **DevOps engineer**,  
I want **automated testing and deployment pipeline**,  
So that **code changes are validated and deployed consistently**.

**Acceptance Criteria:**

**AC1: Continuous Integration (CI)**

**Given** code is pushed to GitHub  
**When** the CI pipeline runs  
**Then** it should execute:

1. Lint check (ESLint)
2. TypeScript compilation
3. Unit tests (Vitest)
4. Integration tests
5. Build Docker images  
   **And** pipeline should fail if any step fails  
   **And** run time should be < 10 minutes

**AC2: Automated Testing**

**Given** tests are part of CI pipeline  
**When** tests run  
**Then** unit test coverage should be > 70%  
**And** integration tests should cover critical workflows  
**And** test results should be reported in PR comments

**AC3: Continuous Deployment (CD)**

**Given** CI pipeline passes on main branch  
**When** deployment is triggered  
**Then** it should:

1. Build production Docker images
2. Tag with version/commit SHA
3. Push to container registry
4. Deploy to staging environment
5. Run smoke tests
6. Deploy to production (manual approval)  
   **And** rollback capability should be available

**AC4: Environment Management**

**Given** multiple environments exist (dev, staging, prod)  
**When** deployments occur  
**Then** environment-specific configuration should be used  
**And** secrets should be managed securely (GitHub Secrets)  
**And** deployment status should be visible

**Technical Considerations:**

- Use GitHub Actions workflows
- Cache dependencies for faster builds
- Run tests in parallel when possible
- Use matrix strategy for multiple Node versions
- Implement deployment notifications (Slack)
- Set up branch protection rules

**Definition of Done:**

- [ ] GitHub Actions workflows created
- [ ] Lint and tests automated
- [ ] Docker image build automated
- [ ] Staging deployment working
- [ ] Production deployment (manual trigger)
- [ ] Rollback tested
- [ ] Team trained on workflow

**Dependencies:** E0.2 (API), E0.8 (Docker)

---

## Epic E1: Campaign Management Foundation

**Priority:** P0 (MVP Core)  
**Status:** Not Started  
**Estimated Story Points:** 13  
**Dependencies:** E0 (Infrastructure)  
**Requirements Covered:** FR1

**Epic Goal:** Enable users to create, view, and manage outreach campaigns with proper validation and status tracking.

**Success Criteria:**

- Users can create campaigns with required fields
- Campaign list displays all campaigns with status
- Campaign validation prevents incomplete submissions
- Campaigns can be archived

---

### Story E1.1: Create New Campaign

**Story Points:** 5

As a **freelance video producer**,  
I want **to create a new outreach campaign with a name and value proposition**,  
So that **I can organize my prospecting efforts and track results per campaign**.

**Acceptance Criteria:**

**AC1: Campaign Creation Form**

**Given** I am on the campaigns page  
**When** I click "Create New Campaign"  
**Then** a campaign creation form should display with fields:

- Campaign Name (required, max 100 chars)
- Value Proposition (required, max 150 chars)
- Template Selection (dropdown, required)  
  **And** all fields should have inline validation  
  **And** character count should display for limited fields

**AC2: Field Validation**

**Given** I am filling out the campaign form  
**When** I enter invalid data  
**Then** validation errors should display:

- Campaign Name: "Required" if empty
- Value Proposition: "Required" if empty, "Max 150 characters" if exceeded
- Template: "Please select a template" if not selected  
  **And** submit button should be disabled until all fields are valid

**AC3: Successful Campaign Creation**

**Given** all required fields are valid  
**When** I click "Create Campaign"  
**Then** a POST request should be sent to `/api/campaigns`  
**And** campaign should be saved to database with:

- Unique campaign_id (UUID)
- organisation_id from authenticated user
- Status: "Draft"
- created_at timestamp  
  **And** I should be redirected to the campaign detail page  
  **And** success message should display: "Campaign created successfully"

**AC4: Error Handling**

**Given** campaign creation fails (network error, server error)  
**When** the error occurs  
**Then** an error message should display: "Unable to create campaign. Please try again."  
**And** form data should be preserved  
**And** user should remain on the form

**Technical Considerations:**

- Use Zod schema for server-side validation
- Generate UUID on server, not client
- Transaction for campaign + initial step creation
- Index campaigns by (organisation_id, status) for list queries

**Definition of Done:**

- [ ] Campaign creation form implemented
- [ ] Frontend validation working
- [ ] API endpoint implemented (/api/campaigns POST)
- [ ] Database insert working
- [ ] Error handling tested
- [ ] Unit tests for service layer
- [ ] E2E test for happy path

**Dependencies:** E0.2 (API), E0.4 (Auth)

---

### Story E1.2: View Campaign List

**Story Points:** 3

As a **freelance video producer**,  
I want **to see a list of all my campaigns with their status**,  
So that **I can track my active prospecting efforts and navigate to specific campaigns**.

**Acceptance Criteria:**

**AC1: Campaign List Display**

**Given** I have created campaigns  
**When** I navigate to the campaigns page  
**Then** I should see a table/list displaying:

- Campaign Name
- Status (Draft, Active, Paused, Completed, Archived)
- Total Prospects
- Emails Sent
- Response Rate
- Created Date
- Last Updated  
  **And** list should be sorted by Last Updated (descending)

**AC2: Status Indicators**

**Given** campaigns have different statuses  
**When** the list displays  
**Then** each status should have visual indicator:

- Draft: Gray badge
- Active: Green badge
- Paused: Yellow badge
- Completed: Blue badge
- Archived: Light gray badge  
  **And** status should be clearly readable

**AC3: Empty State**

**Given** I have no campaigns  
**When** I view the campaigns page  
**Then** an empty state should display:

- Illustration/icon
- Message: "No campaigns yet"
- "Create Your First Campaign" button

**AC4: Campaign Navigation**

**Given** I see the campaign list  
**When** I click on a campaign row  
**Then** I should navigate to the campaign detail page  
**And** URL should include campaign ID

**AC5: Performance**

**Given** I have up to 100 campaigns  
**When** the list loads  
**Then** it should load in < 2 seconds  
**And** pagination should be implemented (25 per page) if > 25 campaigns

**Technical Considerations:**

- Query: `SELECT * FROM outreach.campaigns WHERE organisation_id = ? ORDER BY updated_at DESC`
- Include LEFT JOIN to get prospect counts
- Implement cursor-based pagination for scalability
- Cache campaign counts in Redis for performance

**Definition of Done:**

- [ ] Campaign list page implemented
- [ ] API endpoint (/api/campaigns GET) working
- [ ] Status badges displaying correctly
- [ ] Empty state implemented
- [ ] Pagination working
- [ ] Performance tested with 100 campaigns
- [ ] Unit and integration tests

**Dependencies:** E0.2 (API), E0.4 (Auth), E1.1 (Campaign Creation)

---

### Story E1.3: View Campaign Details

**Story Points:** 3

As a **freelance video producer**,  
I want **to view detailed information about a specific campaign**,  
So that **I can see prospects, drafts, and performance metrics for that campaign**.

**Acceptance Criteria:**

**AC1: Campaign Detail Page**

**Given** I click on a campaign from the list  
**When** the detail page loads  
**Then** I should see:

- Campaign Name (editable inline)
- Value Proposition (editable inline)
- Template Used
- Status (with change status button)
- Created Date
- Total Prospects
- Emails Sent
- Response Count
- Positive Response Count  
  **And** page should load in < 2 seconds

**AC2: Tabs for Different Views**

**Given** I am on campaign detail page  
**When** I view the tabs  
**Then** I should see tabs for:

- Overview (default, shows metrics)
- Prospects (list of all prospects in campaign)
- Drafts (pending email drafts)
- Sent (sent emails)
- Responses (replied emails)  
  **And** clicking a tab should switch the view without page reload

**AC3: Inline Editing**

**Given** I want to update campaign name or value prop  
**When** I click on the field  
**Then** it should become editable  
**And** Save/Cancel buttons should appear  
**And** clicking Save should update via PATCH API  
**And** clicking Cancel should revert changes

**AC4: Status Change**

**Given** I want to change campaign status  
**When** I click "Change Status" dropdown  
**Then** I should see status options:

- Pause Campaign
- Resume Campaign
- Mark as Completed
- Archive Campaign  
  **And** selecting an option should update status  
  **And** confirmation modal should display for Archive

**Technical Considerations:**

- Single API endpoint: GET /api/campaigns/:campaignId
- Include aggregated metrics in response
- Use optimistic UI updates for inline editing
- Implement validation for status transitions

**Definition of Done:**

- [ ] Campaign detail page implemented
- [ ] All tabs working
- [ ] Inline editing functional
- [ ] Status change working
- [ ] API endpoints implemented
- [ ] Tests for all status transitions
- [ ] UX tested with real data

**Dependencies:** E1.2 (Campaign List)

---

### Story E1.4: Archive Campaign

**Story Points:** 2

As a **freelance video producer**,  
I want **to archive completed campaigns**,  
So that **my active campaign list stays focused and I can declutter my workspace**.

**Acceptance Criteria:**

**AC1: Archive Action**

**Given** I am viewing a campaign detail page  
**When** I click "Change Status" > "Archive Campaign"  
**Then** a confirmation modal should display:

- Warning: "This will hide the campaign from your active list"
- Checkbox: "I understand this campaign will be archived"
- "Archive" button (disabled until checkbox checked)
- "Cancel" button

**AC2: Archive Execution**

**Given** I confirm the archive action  
**When** I click "Archive"  
**Then** the campaign status should update to "Archived"  
**And** I should be redirected to campaigns list  
**And** success message should display  
**And** archived campaign should not appear in default list

**AC3: View Archived Campaigns**

**Given** I have archived campaigns  
**When** I toggle "Show Archived" filter on campaigns page  
**Then** archived campaigns should display in the list  
**And** they should be visually distinct (grayed out)

**AC4: Unarchive Campaign**

**Given** I view an archived campaign  
**When** I click "Unarchive" button  
**Then** status should revert to previous state (Active or Completed)  
**And** campaign should reappear in main list

**AC5: Data Integrity**

**Given** a campaign is archived  
**When** I query the database  
**Then** all campaign data should still exist (soft delete)  
**And** prospects, messages, and stats should remain linked  
**And** only status field is changed

**Technical Considerations:**

- Implement soft delete (status change, not row deletion)
- Filter archived campaigns by default: `WHERE status != 'Archived'`
- Add database index on status for filter performance
- Consider archiving after X days of inactivity (future enhancement)

**Definition of Done:**

- [ ] Archive confirmation modal working
- [ ] Archive status update functional
- [ ] Show/hide archived filter working
- [ ] Unarchive feature implemented
- [ ] Data integrity verified
- [ ] API tests for archive workflow
- [ ] UX tested with multiple campaigns

**Dependencies:** E1.3 (Campaign Details)

---

## Epic E2: Prospect Import & Validation Pipeline

**Priority:** P0 (MVP Core)  
**Status:** Not Started  
**Estimated Story Points:** 21  
**Dependencies:** E1 (Campaign Management)  
**Requirements Covered:** FR2, NFR1, NFR8

**Epic Goal:** Enable users to upload prospect lists via CSV with comprehensive validation, duplicate detection, and user-friendly error reporting.

**Success Criteria:**

- CSV files upload and parse correctly
- All validation rules enforced
- Duplicate detection working (within upload and against existing)
- Clear validation reports with actionable errors
- Valid prospects added to campaign automatically

---

### Story E2.1: CSV File Upload Interface

**Story Points:** 3

As a **freelance video producer**,  
I want **to upload a CSV file of prospects to my campaign**,  
So that **I can quickly import my target companies without manual data entry**.

**Acceptance Criteria:**

**AC1: File Upload Component**

**Given** I am on the campaign detail page  
**When** I click "Import Prospects"  
**Then** a file upload modal should display with:

- Drag-and-drop area
- "Browse Files" button
- Accepted format notice: "CSV files only (.csv)"
- Sample CSV download link
- Maximum file size: 5MB (approximately 5000 rows)

**AC2: CSV Format Requirements Display**

**Given** the import modal is open  
**When** I view the requirements section  
**Then** it should clearly state required columns:

- `company_name` (required)
- `contact_email` (required)
- `contact_name` (optional)
- `website_url` (optional)  
  **And** show example row: "Acme Corp,sarah@acmecorp.com,Sarah Johnson,https://acmecorp.com"

**AC3: File Selection**

**Given** I select a CSV file  
**When** the file is loaded  
**Then** the filename should display  
**And** file size should display  
**And** "Continue to Validation" button should enable  
**And** I should be able to cancel and select a different file

**AC4: File Type Validation**

**Given** I select a non-CSV file (e.g., .xlsx, .txt)  
**When** I try to upload  
**Then** an error should display: "Please upload a CSV file (.csv)"  
**And** the file should be rejected  
**And** I should be able to select a different file

**AC5: File Size Validation**

**Given** I select a CSV file > 5MB  
**When** I try to upload  
**Then** an error should display: "File too large. Maximum size is 5MB (approximately 5000 prospects)"  
**And** the file should be rejected

**Technical Considerations:**

- Use browser FileReader API for client-side parsing
- Implement file type check before upload
- Stream large files instead of loading entire file into memory
- Use Papa Parse library for CSV parsing
- Show upload progress indicator

**Definition of Done:**

- [ ] File upload modal implemented
- [ ] Drag-and-drop working
- [ ] File type validation working
- [ ] File size validation working
- [ ] Sample CSV downloadable
- [ ] UX tested with various file types
- [ ] Accessibility tested (keyboard navigation)

**Dependencies:** E1.3 (Campaign Details)

---

### Story E2.2: CSV Parsing and Column Validation

**Story Points:** 5

As a **system**,  
I want **to parse uploaded CSV files and validate column structure**,  
So that **only correctly formatted files are processed**.

**Acceptance Criteria:**

**AC1: CSV Parsing**

**Given** a CSV file is uploaded  
**When** the system parses the file  
**Then** it should:

- Detect delimiter (comma, semicolon, tab)
- Parse headers from first row
- Parse all data rows
- Handle quoted fields correctly
- Handle newlines within quoted fields  
  **And** parsing should complete in < 5 seconds for 100 rows

**AC2: Required Column Detection**

**Given** the CSV is parsed  
**When** the system checks columns  
**Then** it should verify presence of:

- `company_name` (case-insensitive match)
- `contact_email` (case-insensitive match)  
  **And** if missing, return error: "Missing required column: [column_name]"  
  **And** provide column mapping suggestion if similar name found (e.g., "email" → "contact_email")

**AC3: Column Mapping**

**Given** column headers don't exactly match expected names  
**When** the system detects columns  
**Then** it should suggest mappings:

- "email" → "contact_email"
- "company" → "company_name"
- "name" → "contact_name"
- "website" → "website_url"  
  **And** user should be able to confirm or manually map columns

**AC4: Empty File Handling**

**Given** the CSV file is empty or has only headers  
**When** parsing completes  
**Then** an error should display: "CSV file contains no data rows"  
**And** user should be prompted to upload a different file

**AC5: Malformed CSV Handling**

**Given** the CSV is malformed (unclosed quotes, inconsistent columns)  
**When** parsing fails  
**Then** a user-friendly error should display: "CSV file format is invalid. Please check for unclosed quotes or inconsistent column counts."  
**And** show first error location (row number)

**Technical Considerations:**

- Use streaming CSV parser for large files
- Normalize column names (lowercase, trim whitespace)
- Implement fuzzy matching for column mapping suggestions
- Set timeout for parsing (30 seconds max)
- Log parsing errors for debugging

**Definition of Done:**

- [ ] CSV parser integrated (Papa Parse)
- [ ] Column detection working
- [ ] Column mapping working
- [ ] Error handling for malformed CSVs
- [ ] Performance tested (1000 row file)
- [ ] Unit tests for parsing logic
- [ ] Edge cases tested (special characters, Unicode)

**Dependencies:** E2.1 (File Upload)

---

### Story E2.3: Email Format and Data Validation

**Story Points:** 5

As a **system**,  
I want **to validate each prospect's data for correctness**,  
So that **only valid prospect data is imported into the system**.

**Acceptance Criteria:**

**AC1: Email Format Validation (RFC 5322)**

**Given** a prospect row has a contact_email  
**When** the system validates the email  
**Then** it should check:

- Valid format: `local-part@domain`
- Local part: alphanumeric, dots, hyphens, underscores
- Domain: valid TLD and structure
- No spaces or invalid characters  
  **And** reject emails like: "invalid.email", "@example.com", "user@", "user @example.com"  
  **And** accept emails like: "sarah@acmecorp.com", "sarah.johnson@acme-corp.co.uk"

**AC2: Company Name Validation**

**Given** a prospect row has a company_name  
**When** the system validates it  
**Then** it should check:

- Not empty or whitespace only
- Length: 1-200 characters
- Contains at least one alphabetic character  
  **And** trim leading/trailing whitespace  
  **And** reject: "", " ", "123", "@#$%"

**AC3: Website URL Validation**

**Given** a prospect has a website_url  
**When** the system validates it  
**Then** it should check:

- Valid URL format
- Scheme: http or https
- Valid domain structure  
  **And** normalize URL (add https:// if missing, remove trailing slash)  
  **And** accept: "acmecorp.com" → "https://acmecorp.com"  
  **And** reject: "not a url", "ftp://example.com"

**AC4: Contact Name Validation**

**Given** a prospect has a contact_name  
**When** the system validates it  
**Then** it should check:

- Length: 1-100 characters if provided
- Trim whitespace  
  **And** allow empty (optional field)

**AC5: Validation Error Reporting**

**Given** validation rules are applied to all rows  
**When** validation completes  
**Then** for each invalid row, capture:

- Row number
- Field name that failed
- Validation error message
- Original value  
  **And** create validation report with all errors

**Technical Considerations:**

- Use Zod schemas for validation rules
- Use email-validator library or regex for RFC 5322
- Use URL constructor for URL validation
- Batch validation for performance (validate all rows at once)
- Limit error messages to first 100 errors to avoid overwhelming user

**Definition of Done:**

- [ ] Email validation working (RFC 5322 compliant)
- [ ] Company name validation working
- [ ] URL validation and normalization working
- [ ] Contact name validation working
- [ ] Validation error collection working
- [ ] Unit tests for all validation rules
- [ ] Edge cases tested (Unicode, special characters)

**Dependencies:** E2.2 (CSV Parsing)

---

### Story E2.4: Duplicate Detection (Within Upload)

**Story Points:** 3

As a **system**,  
I want **to detect duplicate prospects within a single upload**,  
So that **users don't accidentally add the same prospect multiple times**.

**Acceptance Criteria:**

**AC1: Duplicate Email Detection**

**Given** the uploaded CSV contains multiple rows with same email  
**When** the system processes the file  
**Then** it should detect duplicates using `contact_email` as unique key  
**And** flag all duplicate rows except the first occurrence  
**And** include in error report: "Row X: Duplicate email (sarah@acme.com). First occurrence at row Y."

**AC2: Case-Insensitive Matching**

**Given** emails differ only in case (Sarah@Acme.com vs sarah@acme.com)  
**When** duplicate detection runs  
**Then** they should be considered duplicates  
**And** matching should be case-insensitive

**AC3: Duplicate Handling Strategy**

**Given** duplicates are detected  
**When** the user reviews validation report  
**Then** they should have options:

- Keep first occurrence, discard duplicates (default)
- Choose which row to keep
- Skip all duplicates  
  **And** selection should apply before final import

**AC4: Performance**

**Given** a CSV with 1000 rows  
**When** duplicate detection runs  
**Then** it should complete in < 2 seconds  
**And** use efficient data structure (Set or Map)

**Technical Considerations:**

- Use Map or Set with lowercase email as key
- Store row number for reporting first occurrence
- Consider normalizing emails (trim, lowercase) before comparison
- Optimize for large datasets (stream processing if needed)

**Definition of Done:**

- [ ] Duplicate detection implemented
- [ ] Case-insensitive matching working
- [ ] Error reporting includes duplicates
- [ ] User can choose duplicate handling strategy
- [ ] Performance tested (1000+ rows)
- [ ] Unit tests for duplicate scenarios

**Dependencies:** E2.3 (Data Validation)

---

### Story E2.5: Duplicate Detection (Against Existing Prospects)

**Story Points:** 3

As a **system**,  
I want **to detect prospects that already exist in the campaign or organization**,  
So that **users don't contact the same person multiple times**.

**Acceptance Criteria:**

**AC1: Campaign-level Duplicate Check**

**Given** a prospect email exists in the current campaign  
**When** the system checks for duplicates  
**Then** it should flag the new upload row as duplicate  
**And** include in error: "Row X: Email already exists in this campaign (added on YYYY-MM-DD)"  
**And** show existing prospect's status (New, Researched, Sent, etc.)

**AC2: Organization-level Duplicate Check (90-day window)**

**Given** a prospect email was contacted within last 90 days in ANY campaign  
**When** the system checks for duplicates  
**Then** it should flag as duplicate  
**And** include in warning: "Row X: Email was contacted 45 days ago in campaign 'Summer Outreach'. Continue?"  
**And** allow user to override warning

**AC3: Database Query Optimization**

**Given** the system queries for existing prospects  
**When** checking 100 new emails  
**Then** the query should use `WHERE contact_email IN (...)` with batch lookup  
**And** complete in < 1 second  
**And** use index on (organisation_id, contact_email)

**AC4: Duplicate Override**

**Given** a duplicate is detected but user wants to proceed  
**When** user checks "Override duplicates" option  
**Then** the prospect should be imported as new entry  
**And** log the override action for audit  
**And** show warning in UI: "X duplicates will be added despite existing entries"

**Technical Considerations:**

- Query: `SELECT contact_email, campaign_id, created_at FROM crm.people WHERE organisation_id = ? AND contact_email IN (?) AND created_at > NOW() - INTERVAL '90 days'`
- Use batch queries (chunks of 100 emails)
- Cache recent lookups to avoid repeated queries
- Consider indexing strategy for fast lookups

**Definition of Done:**

- [ ] Campaign-level duplicate check working
- [ ] 90-day organization duplicate check working
- [ ] Database query optimized
- [ ] Override option implemented
- [ ] Performance tested (100+ existing prospects)
- [ ] Unit and integration tests

**Dependencies:** E2.4 (Within-Upload Duplicates), E0.1 (Database)

---

### Story E2.6: Validation Report and User Actions

**Story Points:** 5

As a **freelance video producer**,  
I want **to see a comprehensive validation report with clear errors**,  
So that **I can fix issues and successfully import valid prospects**.

**Acceptance Criteria:**

**AC1: Validation Report Display**

**Given** CSV validation completes  
**When** the report displays  
**Then** it should show summary:

- Total rows uploaded: X
- Valid prospects: Y (green)
- Invalid prospects: Z (red)
- Duplicates: W (yellow)  
  **And** show donut chart or progress bar visualization

**AC2: Error Detail Table**

**Given** there are validation errors  
**When** I view the error details  
**Then** I should see a table with columns:

- Row # (sortable)
- Company Name
- Contact Email
- Error Type (Invalid Email, Missing Field, Duplicate)
- Error Message  
  **And** table should be sortable by column  
  **And** I should be able to search/filter errors

**AC3: User Action Options**

**Given** I review the validation report  
**When** I choose next steps  
**Then** I should see action buttons:

- "Import Valid Only" (Y prospects) - primary action
- "Download Errors" (CSV of invalid rows for fixing)
- "Cancel Import"  
  **And** choosing "Import Valid Only" should require confirmation if < 50% valid

**AC4: Download Errors CSV**

**Given** I want to fix errors offline  
**When** I click "Download Errors"  
**Then** a CSV file should download containing:

- All original columns
- Additional column: "Error_Reason"  
  **And** I can fix errors and re-upload

**AC5: Import Valid Prospects**

**Given** I click "Import Valid Only"  
**When** the import executes  
**Then** valid prospects should be inserted into database:

- Table: `crm.people`
- Status: "New"
- Linked to campaign_id
- Timestamps: created_at, updated_at  
  **And** success message should display: "Y prospects added to campaign"  
  **And** I should navigate back to campaign detail page

**AC6: Import Progress**

**Given** import is processing  
**When** prospects are being inserted  
**Then** a progress indicator should display  
**And** show: "Importing X of Y prospects..."  
**And** complete in < 5 seconds for 100 prospects

**Technical Considerations:**

- Build validation report object with summary and errors array
- Use transaction for batch insert
- Generate error CSV on backend for consistency
- Implement optimistic locking if multiple users on same campaign
- Log all import actions for audit

**Definition of Done:**

- [ ] Validation report UI implemented
- [ ] Error detail table with sort/filter working
- [ ] Action buttons functional
- [ ] Error CSV download working
- [ ] Import valid prospects working
- [ ] Progress indicator implemented
- [ ] E2E test for full import flow
- [ ] UX tested with various validation scenarios

**Dependencies:** E2.3, E2.4, E2.5 (All Validation)

---

## Epic E3: Automated Prospect Research Engine

**Priority:** P0 (MVP Core)  
**Status:** Not Started  
**Estimated Story Points:** 34  
**Dependencies:** E2 (Prospect Import)  
**Requirements Covered:** FR3, NFR1, NFR2, NFR7, NFR8

**Epic Goal:** Automatically research each prospect through web scraping and social media scanning to generate personalized insights and opportunity hooks.

**Success Criteria:**

- Research completes within 2 minutes per prospect
- Research profiles include business summary and 2-3 hooks
- Confidence scores accurately reflect research quality
- Failed research is gracefully handled with clear reasons
- Source URLs are captured for transparency

---

### Story E3.1: Research Queue and Job Management

**Story Points:** 5

As a **system**,  
I want **to queue prospect research jobs for asynchronous processing**,  
So that **research doesn't block the UI and can be processed at scale**.

**Acceptance Criteria:**

**AC1: Enqueue Research Jobs**

**Given** valid prospects are imported to a campaign  
**When** the import completes  
**Then** a research job should be enqueued for each prospect  
**And** job should include: prospect_id, organisation_id, campaign_id, website_url  
**And** job should be added to RabbitMQ `research_queue`  
**And** prospect status should update to "Queued for Research"

**AC2: Research Worker Startup**

**Given** the research worker service starts  
**When** it connects to RabbitMQ  
**Then** it should start consuming from `research_queue`  
**And** set prefetch count to 1 (process one job at a time)  
**And** log startup: "Research worker started, listening to queue"

**AC3: Job Processing**

**Given** a research job is dequeued  
**When** the worker processes it  
**Then** it should:

1. Update prospect status to "Researching"
2. Execute research workflow (web scraping + social scanning)
3. Generate research profile
4. Update prospect status to "Researched" or "Research Failed"
5. ACK message to RabbitMQ  
   **And** processing time should be logged

**AC4: Job Timeout Handling**

**Given** a research job exceeds 5 minutes  
**When** the timeout occurs  
**Then** the job should be terminated  
**And** prospect status should update to "Research Failed"  
**And** error logged: "Research timeout for prospect X"  
**And** message should be NACK'd for retry (max 2 retries)

**AC5: Failed Job Retry Logic**

**Given** a research job fails (network error, API limit)  
**When** the error occurs  
**Then** the worker should NACK the message  
**And** RabbitMQ should requeue with exponential backoff  
**And** max retry count: 2 attempts  
**And** after max retries, move to dead letter queue

**AC6: Research Progress Tracking**

**Given** research jobs are processing  
**When** the user views campaign dashboard  
**Then** they should see:

- Total prospects: X
- Researched: Y
- In Progress: Z
- Failed: W  
  **And** progress bar showing % complete

**Technical Considerations:**

- Use RabbitMQ with durable queues
- Implement job locking to prevent duplicate processing
- Store job state in database for tracking
- Use Redis for quick status lookups
- Monitor queue depth with Prometheus metrics
- Set message TTL for stale jobs (24 hours)

**Definition of Done:**

- [ ] Research queue configured in RabbitMQ
- [ ] Jobs enqueued on prospect import
- [ ] Research worker consuming messages
- [ ] Timeout and retry logic working
- [ ] Progress tracking implemented
- [ ] Dead letter queue configured
- [ ] Unit and integration tests
- [ ] Queue metrics exposed to Prometheus

**Dependencies:** E0.3 (RabbitMQ), E2.6 (Import)

---

### Story E3.2: Website Scraping for Business Intelligence

**Story Points:** 8

As a **research engine**,  
I want **to scrape key pages of a prospect's website**,  
So that **I can extract business information and identify content opportunities**.

**Acceptance Criteria:**

**AC1: Website Scraping Execution**

**Given** a prospect has a valid website_url  
**When** the scraper starts  
**Then** it should attempt to scrape:

1. Homepage (/)
2. About page (/about, /about-us, /company)
3. Services page (/services, /what-we-do)
4. Blog/News (if present: /blog, /news, /updates)  
   **And** follow robots.txt rules  
   **And** set User-Agent header identifying the bot  
   **And** respect rate limits (max 1 request per second per domain)

**AC2: Content Extraction**

**Given** a page is successfully scraped  
**When** the HTML is parsed  
**Then** extract:

- Page title and meta description
- Main heading (H1)
- Body text (cleaned, no HTML tags)
- Images with alt text
- Links to social media profiles  
  **And** store raw HTML for debugging (temp storage, 24 hours)  
  **And** limit content extraction to 10,000 characters per page

**AC3: Error Handling**

**Given** website scraping encounters an error  
**When** the error occurs  
**Then** handle gracefully:

- 404 Not Found: Log and skip page
- 403 Forbidden / 401 Unauthorized: Skip domain
- SSL errors: Try HTTP fallback, then skip
- Timeout (30 seconds): Log and skip page
- Invalid URL: Mark research as failed  
  **And** continue with remaining pages if some succeed

**AC4: Robots.txt Compliance**

**Given** a website has robots.txt  
**When** the scraper checks it  
**Then** it should:

- Parse robots.txt
- Check if bot is allowed on target paths
- Skip disallowed paths
- Log skipped pages  
  **And** respect crawl-delay directive

**AC5: Content Cleaning and Normalization**

**Given** HTML content is extracted  
**When** text processing occurs  
**Then** it should:

- Remove scripts, styles, navigation
- Strip HTML tags
- Normalize whitespace
- Remove boilerplate (cookie notices, footers)
- Extract main content only  
  **And** output clean, readable text

**AC6: Performance**

**Given** 5 pages are scraped for a prospect  
**When** scraping completes  
**Then** total time should be < 30 seconds  
**And** concurrent requests should be limited to 2 per domain  
**And** use connection pooling for efficiency

**Technical Considerations:**

- Use Cheerio for HTML parsing (fast, lightweight)
- Use Axios or Got for HTTP requests
- Implement retry logic with exponential backoff
- Use Mozilla Readability or similar for content extraction
- Cache robots.txt for each domain
- Log all scraping activity for debugging
- Consider using Puppeteer for JavaScript-heavy sites (future enhancement)

**Definition of Done:**

- [ ] Website scraper implemented
- [ ] robots.txt compliance working
- [ ] Content extraction and cleaning working
- [ ] Error handling for all edge cases
- [ ] Performance targets met
- [ ] Unit tests for scraper logic
- [ ] Integration tests with real websites
- [ ] Logging and monitoring in place

**Dependencies:** E3.1 (Research Queue)

---

### Story E3.3: Social Media Scanning (Web Scraping Approach)

**Story Points:** 8

As a **research engine**,  
I want **to scan public social media profiles for recent content**,  
So that **I can identify timely personalization hooks**.

**Acceptance Criteria:**

**AC1: Social Profile Discovery**

**Given** a website is scraped  
**When** social media links are found  
**Then** extract links for:

- Instagram (instagram.com/[username])
- LinkedIn (linkedin.com/company/[company])
- Facebook (facebook.com/[pagename])  
  **And** validate and normalize URLs  
  **And** store in database: `social_profiles` table

**AC2: Instagram Public Scraping**

**Given** an Instagram profile URL is found  
**When** the scraper accesses the page  
**Then** it should extract:

- Recent posts (last 30 days, max 12 posts)
- Post captions
- Post dates
- Like/comment counts (if visible)
- Profile bio  
  **And** respect Instagram's rate limits  
  **And** handle private profiles gracefully (skip with log)

**AC3: LinkedIn Company Page Scraping**

**Given** a LinkedIn company page URL is found  
**When** the scraper accesses the page  
**Then** it should extract:

- Recent posts (last 30 days)
- Post text
- Post dates
- Company description
- Employee count (if visible)  
  **And** handle login walls gracefully (limited public data)

**AC4: Facebook Page Scraping**

**Given** a Facebook page URL is found  
**When** the scraper accesses the page  
**Then** it should extract:

- Recent posts (last 30 days)
- Post text
- Post dates
- Page about info  
  **And** handle restricted content gracefully

**AC5: Content Analysis for Hooks**

**Given** social media content is scraped  
**When** analyzing for opportunities  
**Then** identify patterns:

- Recent product launches
- Event announcements
- Behind-the-scenes content
- Customer testimonials
- Content gaps (e.g., no video content but lots of photos)  
  **And** store findings with source URLs

**AC6: Graceful Degradation**

**Given** social media scraping fails (blocked, rate limited)  
**When** the error occurs  
**Then** research should continue with website data only  
**And** log warning: "Social scraping failed for platform X"  
**And** confidence score should reflect limited data

**AC7: Rate Limiting and Ethical Scraping**

**Given** multiple prospects are researched concurrently  
**When** social media scraping occurs  
**Then** implement rate limits:

- Max 10 requests per minute per platform
- Randomized delays between requests (2-5 seconds)
- Rotating user agents  
  **And** respect platform terms of service  
  **And** implement circuit breaker if repeatedly blocked

**Technical Considerations:**

- Social media scraping is fragile and may break with layout changes
- Consider using unofficial APIs or libraries when available
- Implement caching to avoid re-scraping same profiles
- Use headless browser (Puppeteer) for JavaScript-rendered content
- Store raw scraped data for debugging
- Have fallback strategy if scraping fails
- Monitor success/failure rates per platform

**Definition of Done:**

- [ ] Social profile discovery working
- [ ] Instagram scraping implemented
- [ ] LinkedIn scraping implemented
- [ ] Facebook scraping implemented
- [ ] Rate limiting and delays working
- [ ] Graceful failure handling
- [ ] Content analysis extracting hooks
- [ ] Unit and integration tests
- [ ] Success rate monitoring

**Dependencies:** E3.2 (Website Scraping)

---

### Story E3.4: Opportunity Analysis and Hook Generation

**Story Points:** 5

As a **research engine**,  
I want **to analyze collected data and generate personalization hooks**,  
So that **users have specific, relevant talking points for outreach**.

**Acceptance Criteria:**

**AC1: Content Gap Analysis**

**Given** website and social data is collected  
**When** opportunity analysis runs  
**Then** identify gaps:

- "Has Instagram but no video content"
- "Blogs regularly but no visual storytelling"
- "Active on LinkedIn but posts are text-only"
- "Mentions events but no event coverage videos"  
  **And** rank opportunities by relevance to video production

**AC2: Recent Activity Detection**

**Given** social media posts from last 30 days  
**When** analyzing for timeliness  
**Then** identify:

- Product launches (keywords: "new", "launch", "introducing")
- Events (keywords: "event", "conference", "webinar")
- Milestones (keywords: "anniversary", "milestone", "celebrating")
- Customer stories (keywords: "customer", "testimonial", "success")  
  **And** prioritize very recent activity (< 7 days) higher

**AC3: Industry Pattern Recognition**

**Given** the prospect's industry/sector is identified  
**When** analyzing opportunities  
**Then** apply industry-specific templates:

- E-commerce: Product demo videos, unboxing content
- B2B SaaS: Customer testimonials, explainer videos
- Professional services: Thought leadership, team introductions
- Restaurants/Retail: Behind-the-scenes, atmosphere videos  
  **And** suggest relevant video types

**AC4: Hook Generation**

**Given** opportunities are identified  
**When** generating hooks  
**Then** create 2-3 specific hooks with:

- Hook text (1-2 sentences, specific and actionable)
- Source URL (link to where insight was found)
- Confidence level (High, Medium, Low)
- Hook type (Content Gap, Recent Activity, Industry Pattern)  
  **And** prioritize by relevance and timeliness  
  **And** ensure each hook references specific, verifiable information

**AC5: Hook Quality Criteria**

**Given** a hook is generated  
**When** validating quality  
**Then** ensure it meets criteria:

- **Specific**: References actual content or activity
- **Relevant**: Related to video production opportunity
- **Timely**: Based on recent information (< 90 days)
- **Actionable**: Clear opportunity for outreach  
  **And** reject generic hooks that could apply to any prospect

**Technical Considerations:**

- Use keyword matching and NLP for content analysis
- Implement scoring algorithm for hook relevance
- Consider using AI (OpenAI GPT) for hook refinement
- Store rejected hooks for learning and improvement
- A/B test different hook types to measure effectiveness

**Definition of Done:**

- [ ] Content gap analysis working
- [ ] Recent activity detection working
- [ ] Industry pattern recognition implemented
- [ ] Hook generation producing quality output
- [ ] Hook scoring algorithm implemented
- [ ] Unit tests for analysis logic
- [ ] Manual review of sample hooks for quality
- [ ] Hook effectiveness tracked over time

**Dependencies:** E3.2 (Website), E3.3 (Social)

---

### Story E3.5: Research Profile Generation

**Story Points:** 5

As a **research engine**,  
I want **to compile all research findings into a structured profile**,  
So that **users and the AI drafting system have comprehensive prospect context**.

**Acceptance Criteria:**

**AC1: Business Summary Generation**

**Given** website and social data is analyzed  
**When** generating the business summary  
**Then** create a concise summary (2-3 sentences) including:

- What the company does (products/services)
- Industry/sector
- Notable characteristics (size, location, focus)  
  **And** extract from About page, homepage, LinkedIn description  
  **And** use clear, professional language

**AC2: Personalization Hooks Compilation**

**Given** opportunity analysis identified hooks  
**When** compiling the research profile  
**Then** include top 2-3 hooks:

- Hook text
- Source URL
- Confidence level (High/Medium/Low)
- Hook type
- Date discovered  
  **And** sort by relevance score (highest first)

**AC3: Confidence Score Calculation**

**Given** research is completed  
**When** calculating overall confidence score  
**Then** consider factors:

- Data completeness (website found, social profiles found)
- Recency of information (< 30 days = higher)
- Number of hooks identified
- Quality of hooks (specific vs. generic)  
  **And** assign score: **High** (90-100%), **Medium** (60-89%), **Low** (< 60%)  
  **And** include confidence breakdown explanation

**AC4: Source Attribution**

**Given** all research findings  
**When** compiling the profile  
**Then** store source URLs for:

- Business summary sources
- Each hook's source
- Social media profiles discovered  
  **And** ensure all URLs are valid and accessible

**AC5: Research Metadata**

**Given** research profile is generated  
**When** storing to database  
**Then** include metadata:

- research_completed_at (timestamp)
- research_duration_seconds
- websites_scraped (count)
- social_profiles_found (count)
- confidence_score
- hooks_generated (count)
- failed_sources (list)  
  **And** store in `crm.prospect_research` table

**AC6: Research Profile Storage**

**Given** research profile is complete  
**When** saving to database  
**Then** update:

- `crm.people` table: status = "Researched", updated_at
- `crm.prospect_research` table: new row with full profile
- `research_queue` RabbitMQ: ACK message  
  **And** trigger next step: enqueue draft generation job

**Technical Considerations:**

- Use structured JSON format for research profile
- Compress large text fields if needed
- Index by prospect_id for fast lookup
- Consider versioning if re-research is implemented
- Log all profile generation for quality monitoring

**Definition of Done:**

- [ ] Business summary generation working
- [ ] Hooks compilation working
- [ ] Confidence scoring implemented
- [ ] Source attribution included
- [ ] Research metadata captured
- [ ] Database storage working
- [ ] Profile format validated with AI draft system
- [ ] Unit and integration tests
- [ ] Sample profiles reviewed for quality

**Dependencies:** E3.4 (Opportunity Analysis)

---

### Story E3.6: Research Failure Handling and Retries

**Story Points:** 3

As a **system**,  
I want **to gracefully handle research failures**,  
So that **failed prospects are flagged with clear reasons and can be retried**.

**Acceptance Criteria:**

**AC1: Failure Classification**

**Given** research fails for a prospect  
**When** the failure is processed  
**Then** classify the failure reason:

- "Website Unreachable" (DNS error, timeout)
- "Website Blocked" (403, bot detection)
- "Insufficient Data" (no content found)
- "Invalid URL" (malformed website_url)
- "Social Media Unavailable" (all platforms failed)
- "Processing Timeout" (exceeded 5 minutes)  
  **And** store failure reason in database

**AC2: Prospect Status Update**

**Given** research fails  
**When** updating prospect status  
**Then** set status to "Research Failed"  
**And** store failure_reason in `crm.people` table  
**And** set failed_at timestamp  
**And** increment failure_count

**AC3: User Notification**

**Given** research fails for multiple prospects  
**When** batch research completes  
**Then** notify user:

- "X of Y prospects failed research"
- Link to view failed prospects
- Summary of failure reasons  
  **And** user can review and take action

**AC4: Manual Retry Option**

**Given** a prospect has "Research Failed" status  
**When** user views prospect details  
**Then** show "Retry Research" button  
**And** clicking should re-enqueue research job  
**And** reset failure_count and status to "Queued"  
**And** log retry attempt

**AC5: Bulk Retry**

**Given** multiple prospects failed research  
**When** user selects failed prospects  
**Then** "Retry Selected" action should be available  
**And** re-enqueue all selected prospects  
**And** show progress: "Retrying X prospects..."

**AC6: Max Retry Limit**

**Given** a prospect has been retried multiple times  
**When** failure_count reaches 3  
**Then** mark as "Research Failed - Manual Review Required"  
**And** do not allow automated retry  
**And** require manual investigation

**Technical Considerations:**

- Store detailed error logs for debugging
- Implement exponential backoff for retries
- Monitor failure rates by reason to identify systemic issues
- Consider allowing user to manually add research data
- Alert team if failure rate > 20% for investigation

**Definition of Done:**

- [ ] Failure classification working
- [ ] Prospect status updates working
- [ ] User notification implemented
- [ ] Manual retry working
- [ ] Bulk retry implemented
- [ ] Max retry limit enforced
- [ ] Failure analytics tracked
- [ ] Tests for all failure scenarios

**Dependencies:** E3.1 (Queue), E3.5 (Profile Generation)

---

## Epic E4: AI Email Draft Generation

**Priority:** P0 (MVP Core)  
**Status:** Not Started  
**Estimated Story Points:** 34  
**Dependencies:** E3 (Prospect Research)  
**Requirements Covered:** FR4, NFR1, NFR8

**Epic Goal:** Use AI to generate personalized, professional email drafts based on research profiles, with transparency through confidence scores and reasoning.

**Success Criteria:**

- Drafts generated within 30 seconds per email
- Each draft includes subject line, body (75-150 words), highlighted personalization
- AI confidence scores accurately reflect draft quality
- Professional, consultative tone maintained
- Source attribution included for transparency

---

### Story E4.1: AI Prompt Engineering and Template System

**Story Points:** 8

As a **AI engineer**,  
I want **well-structured prompts that generate high-quality email drafts**,  
So that **the AI consistently produces professional, personalized outreach emails**.

**Acceptance Criteria:**

**AC1: Base Prompt Template Structure**

**Given** an email draft needs to be generated  
**When** constructing the AI prompt  
**Then** include sections:

1. **System Context**: Role (video production prospecting expert), tone (professional, consultative), constraints (75-150 words)
2. **Prospect Context**: Company name, business summary, industry
3. **Personalization Hooks**: Top 2-3 hooks with sources
4. **Value Proposition**: Campaign value prop (from campaign settings)
5. **Output Format**: Subject, opening, value prop, CTA, signature  
   **And** prompt should be modular for easy iteration

**AC2: Personalization Emphasis**

**Given** personalization hooks are included in prompt  
**When** AI generates the draft  
**Then** ensure prompt instructs AI to:

- Reference at least one specific hook naturally in opening
- Connect hook to opportunity for video content
- Avoid generic statements
- Sound like you've actually reviewed their content  
  **And** mark personalized sections for highlighting

**AC3: Tone and Style Guidelines**

**Given** the prompt includes tone instructions  
**When** AI generates email  
**Then** the prompt should enforce:

- Professional but conversational
- Consultative, not salesy
- Curiosity-driven, not pushy
- Helpful, offering value not just asking for meetings
- No buzzwords or jargon overload  
  **And** provide example phrases for desired tone

**AC4: Subject Line Requirements**

**Given** subject line generation is included  
**When** AI creates subject  
**Then** prompt should specify:

- Length: 30-60 characters
- Personalized (include company name or specific insight)
- Curiosity-driven (encourage open)
- Not clickbait or spammy
- Natural, human-written feel  
  **And** provide example subject lines

**AC5: Call-to-Action Guidelines**

**Given** CTA generation is part of prompt  
**When** AI creates CTA  
**Then** prompt should specify:

- Low-commitment ask (not "buy" or "sign up")
- Suggest quick call or coffee chat
- Give recipient easy out
- Propose 2-3 time options if appropriate
- Keep it light and friendly  
  **And** provide CTA examples

**AC6: Prompt Versioning**

**Given** prompts may need iteration  
**When** a new prompt version is created  
**Then** it should be version-controlled  
**And** stored in database: `outreach.prompts` table  
**And** linked to generated drafts for tracking  
**And** A/B testing capability for comparison

**Technical Considerations:**

- Use template literals or Handlebars for prompt assembly
- Store prompts as structured data (JSON or YAML)
- Implement prompt variables for easy customization
- Track prompt version in draft metadata
- Log full prompts sent to AI for debugging
- Consider token count optimization for API costs

**Definition of Done:**

- [ ] Base prompt template created
- [ ] All sections (context, hooks, output format) included
- [ ] Tone and style guidelines defined
- [ ] Subject line and CTA guidelines included
- [ ] Prompt versioning system implemented
- [ ] Sample prompts tested with AI
- [ ] Prompt quality reviewed by team
- [ ] Documentation for prompt iteration

**Dependencies:** E3.5 (Research Profiles)

---

### Story E4.2: OpenAI API Integration for Draft Generation

**Story Points:** 8

As a **backend developer**,  
I want **to integrate OpenAI API for email generation**,  
So that **the system can leverage GPT models to create drafts**.

**Acceptance Criteria:**

**AC1: OpenAI API Setup**

**Given** OpenAI API key is configured  
**When** the application initializes  
**Then** OpenAI client should be instantiated  
**And** API key should be stored securely (environment variable)  
**And** connection should be tested on startup

**AC2: Draft Generation Request**

**Given** a draft generation job is processed  
**When** calling OpenAI API  
**Then** send request with:

- Model: GPT-4 or GPT-3.5-turbo (configurable)
- Prompt: Assembled from template + prospect data
- Temperature: 0.7 (balance creativity and consistency)
- Max tokens: 400 (for ~150 word email)
- Top_p: 1.0  
  **And** include request ID for tracing

**AC3: Response Parsing**

**Given** OpenAI returns a completion  
**When** parsing the response  
**Then** extract:

- Subject line (first line or marked section)
- Email body (remaining text)
- Check for markers if structured output used  
  **And** validate output format (subject + body present)  
  **And** handle malformed responses gracefully

**AC4: Error Handling**

**Given** OpenAI API call fails  
**When** the error occurs  
**Then** handle specific errors:

- Rate limit (429): Retry with exponential backoff (5 retries)
- Invalid request (400): Log and mark draft as failed
- Timeout (> 30 seconds): Retry once, then fail
- Network error: Retry 3 times
- Insufficient quota: Alert team, mark drafts as failed  
  **And** log all errors with context for debugging

**AC5: Cost Tracking**

**Given** OpenAI API calls incur costs  
**When** each request completes  
**Then** track:

- Tokens used (prompt + completion)
- Cost per request
- Cumulative daily cost  
  **And** store in database for reporting  
  **And** alert if daily cost exceeds threshold ($50)

**AC6: Performance Optimization**

**Given** multiple drafts need generation  
**When** processing a batch  
**Then** implement:

- Concurrent requests (max 10 parallel)
- Request pooling to avoid rate limits
- Caching for repeated research profiles  
  **And** complete 30 drafts in < 5 minutes

**Technical Considerations:**

- Use official OpenAI Node.js SDK
- Implement retry logic with exponential backoff
- Set request timeout to 30 seconds
- Consider using streaming responses for faster perceived performance
- Monitor token usage to optimize prompt length
- Have fallback to simpler model (GPT-3.5) if GPT-4 fails

**Definition of Done:**

- [ ] OpenAI SDK integrated
- [ ] Draft generation working end-to-end
- [ ] Error handling for all scenarios
- [ ] Cost tracking implemented
- [ ] Performance targets met (< 30s per draft)
- [ ] Unit tests with mocked API
- [ ] Integration tests with real API
- [ ] Cost monitoring dashboard

**Dependencies:** E4.1 (Prompt Templates)

---

### Story E4.3: Draft Worker Service Implementation

**Story Points:** 5

As a **backend developer**,  
I want **a dedicated worker service to process draft generation jobs**,  
So that **draft generation runs asynchronously without blocking other operations**.

**Acceptance Criteria:**

**AC1: Worker Service Setup**

**Given** the draft worker service is deployed  
**When** it starts  
**Then** it should:

- Connect to RabbitMQ `draft_queue`
- Set prefetch count to 3 (process 3 jobs concurrently)
- Log startup message with worker ID  
  **And** register shutdown handlers for graceful termination

**AC2: Job Processing Workflow**

**Given** a draft job is dequeued  
**When** the worker processes it  
**Then** execute steps:

1. Fetch prospect data (research profile, campaign details)
2. Assemble AI prompt from template
3. Call OpenAI API
4. Parse and validate response
5. Calculate confidence score
6. Store draft in database
7. Update prospect status to "Draft Ready"
8. ACK RabbitMQ message  
   **And** log each step with timing

**AC3: Draft Storage**

**Given** draft generation succeeds  
**When** storing the draft  
**Then** save to `outreach.messages` table:

- message_id (UUID)
- prospect_id, campaign_id, organisation_id
- subject_line, body_text
- personalization_highlights (JSON array)
- ai_confidence_score
- prompt_version_id
- generation_duration_ms
- status: "Pending Review"
- created_at, updated_at  
  **And** use database transaction for consistency

**AC4: Personalization Highlighting**

**Given** the draft includes personalized content  
**When** storing the draft  
**Then** identify and mark personalized sections:

- Extract sentences that reference research hooks
- Store character offsets or sentence indices
- Store hook IDs referenced  
  **And** store as JSON: `[{start: 45, end: 120, hookId: 'hook-1'}]`

**AC5: Draft Failure Handling**

**Given** draft generation fails (AI error, validation failure)  
**When** the error occurs  
**Then** the worker should:

- Log detailed error with context
- Update prospect status: "Draft Failed"
- Store failure reason
- NACK message for retry (max 2 retries)
- Alert on high failure rate (> 10%)

**AC6: Worker Health Monitoring**

**Given** the worker is running  
**When** monitoring health  
**Then** expose metrics:

- Drafts generated per minute
- Average generation time
- Success/failure rate
- Queue depth
- Active jobs count  
  **And** send to Prometheus for alerting

**Technical Considerations:**

- Use worker pool pattern for concurrency
- Implement job deduplication (check if draft already exists)
- Use database connection pooling
- Set memory limits to prevent OOM
- Implement circuit breaker for AI API failures
- Graceful shutdown: finish current jobs before exiting

**Definition of Done:**

- [ ] Draft worker service implemented
- [ ] Job processing workflow working
- [ ] Draft storage working
- [ ] Personalization highlighting implemented
- [ ] Failure handling working
- [ ] Health metrics exposed
- [ ] Unit and integration tests
- [ ] Worker deployed and monitored

**Dependencies:** E4.2 (OpenAI Integration), E3.5 (Research Profiles)

---

### Story E4.4: AI Confidence Scoring Algorithm

**Story Points:** 5

As a **AI engineer**,  
I want **to calculate confidence scores for generated drafts**,  
So that **users know which drafts are high-quality and which need more review**.

**Acceptance Criteria:**

**AC1: Confidence Score Components**

**Given** a draft is generated  
**When** calculating confidence score  
**Then** evaluate factors (weighted):

- **Research Quality** (30%): Number and quality of hooks used
- **Personalization Depth** (25%): Specificity of references to prospect
- **Tone Consistency** (20%): Matches desired consultative tone
- **Structure Completeness** (15%): All sections present (subject, opening, value, CTA)
- **Length Appropriateness** (10%): Within 75-150 word range  
  **And** calculate overall score: 0-100

**AC2: Research Quality Assessment**

**Given** research profile quality is evaluated  
**When** calculating this component  
**Then** consider:

- Number of hooks available (0 = Low, 1 = Medium, 2+ = High)
- Hook confidence levels (High hooks score higher)
- Recency of hooks (< 7 days scores higher)  
  **And** score: 0-30 points

**AC3: Personalization Depth Assessment**

**Given** draft personalization is evaluated  
**When** calculating this component  
**Then** check:

- Hook referenced in email (yes/no)
- Specific details mentioned (company name, specific content)
- Generic statements detected (reduce score)  
  **And** score: 0-25 points

**AC4: Tone and Structure Assessment**

**Given** draft text is analyzed  
**When** evaluating tone and structure  
**Then** check for:

- Salesy words (discount, limited time) = reduce score
- Question marks in subject (clickbait) = reduce score
- Professional vocabulary maintained
- Clear CTA present
- Subject line length (30-60 chars)  
  **And** score tone (0-20), structure (0-15)

**AC5: Confidence Level Classification**

**Given** overall confidence score is calculated  
**When** classifying confidence level  
**Then** assign:

- **High**: 80-100 points (green badge)
- **Medium**: 60-79 points (yellow badge)
- **Low**: 0-59 points (red badge)  
  **And** store both numeric score and level

**AC6: Confidence Explanation**

**Given** confidence score is calculated  
**When** storing the score  
**Then** generate explanation text:

- "High confidence: Strong personalization with recent insights"
- "Medium confidence: Good structure but generic hook reference"
- "Low confidence: Limited research data available"  
  **And** help users understand the score

**Technical Considerations:**

- Use NLP library for text analysis (sentiment, keywords)
- Consider using AI to evaluate tone (meta-analysis)
- A/B test scoring weights to optimize for response rates
- Track correlation between confidence scores and actual email performance
- Adjust algorithm based on user feedback (edit frequency)

**Definition of Done:**

- [ ] Confidence scoring algorithm implemented
- [ ] All components calculated correctly
- [ ] Score and level stored in database
- [ ] Confidence explanation generated
- [ ] Unit tests for scoring logic
- [ ] Sample drafts scored and reviewed
- [ ] Correlation analysis with response rates (ongoing)

**Dependencies:** E4.3 (Draft Worker)

---

### Story E4.5: Draft Reasoning and Source Attribution

**Story Points:** 3

As a **freelance video producer**,  
I want **to see why the AI generated this specific draft**,  
So that **I understand the personalization and can trust the AI's reasoning**.

**Acceptance Criteria:**

**AC1: Reasoning Generation**

**Given** a draft is generated  
**When** AI completes the generation  
**Then** capture reasoning that explains:

- Which hook(s) were used and why
- How the hook connects to video opportunity
- Why this value prop fits this prospect
- What makes this email personalized  
  **And** store reasoning text with draft

**AC2: Source Attribution**

**Given** a draft references research findings  
**When** storing the draft  
**Then** link to source URLs:

- Hook source URLs (website page, social post)
- Research profile ID
- Specific sections referenced  
  **And** store as structured data (JSON array)

**AC3: Reasoning Display in UI**

**Given** user reviews a draft  
**When** viewing draft details  
**Then** show expandable "AI Reasoning" section with:

- Why this approach was chosen
- Sources consulted (clickable links)
- Confidence score breakdown  
  **And** make reasoning easily accessible but not cluttering

**AC4: Highlighted Personalization**

**Given** draft includes personalized content  
**When** displaying the email  
**Then** highlight personalized sections:

- Different background color (light blue)
- Tooltip on hover showing source
- Clear visual distinction from template content  
  **And** help user identify what makes email unique

**AC5: Edit Tracking for Learning**

**Given** user edits a draft  
**When** changes are saved  
**Then** log edit type:

- Subject change
- Personalization change
- Tone/style change
- Structure change
- Complete rewrite  
  **And** store for future prompt improvement

**Technical Considerations:**

- Consider asking AI to include reasoning in output (structured format)
- Store reasoning separately from email text
- Use NLP to auto-detect edited sections
- Build feedback loop: high-edit drafts = prompt needs improvement
- Consider showing AI reasoning during generation (transparency)

**Definition of Done:**

- [ ] Reasoning generation implemented
- [ ] Source attribution stored
- [ ] Reasoning display in UI working
- [ ] Personalization highlighting working
- [ ] Edit tracking implemented
- [ ] User feedback on reasoning clarity
- [ ] A/B test impact on user trust

**Dependencies:** E4.3 (Draft Worker), E4.4 (Confidence Scoring)

---

### Story E4.6: Draft Regeneration Capability

**Story Points:** 3

As a **freelance video producer**,  
I want **to regenerate a draft if I'm not satisfied with the first version**,  
So that **I can get alternative approaches without starting from scratch**.

**Acceptance Criteria:**

**AC1: Regenerate Action**

**Given** I am reviewing a draft  
**When** I click "Regenerate Draft"  
**Then** a confirmation modal should display:

- "Generate a new version of this draft?"
- "This will replace the current draft"
- "Previous version will be saved in history"
- "Regenerate" and "Cancel" buttons

**AC2: Regeneration Execution**

**Given** I confirm regeneration  
**When** the regeneration job is queued  
**Then** it should:

- Archive current draft (move to draft_history table)
- Create new draft generation job with same prospect/campaign
- Optionally vary prompt (temperature, phrasing) for different output
- Process via draft worker
- Update UI with new draft when complete  
  **And** show loading state during regeneration

**AC3: Draft Version History**

**Given** multiple drafts have been generated for a prospect  
**When** viewing draft history  
**Then** I should see:

- List of previous versions with timestamps
- Ability to preview each version
- Option to restore a previous version
- Indication of which version is currently active  
  **And** history should be accessible from draft detail view

**AC4: Prompt Variation for Regeneration**

**Given** regeneration is requested  
**When** assembling the prompt  
**Then** introduce variation:

- Slightly increase temperature (0.7 → 0.85)
- Rephrase instructions slightly
- Emphasize different hook if multiple available
- Try different subject line style  
  **And** increase likelihood of different output

**AC5: Regeneration Limits**

**Given** regeneration can be costly  
**When** user attempts to regenerate  
**Then** enforce limits:

- Max 3 regenerations per prospect per day
- Show regeneration count: "2 of 3 regenerations used"
- Require confirmation if limit is reached  
  **And** track regeneration frequency for optimization

**Technical Considerations:**

- Store all draft versions for analysis (learn what works)
- Consider showing side-by-side comparison of versions
- Track which versions get approved (feedback signal)
- Monitor regeneration frequency (high = prompts need improvement)
- Implement soft limits to prevent API cost overruns

**Definition of Done:**

- [ ] Regenerate button working
- [ ] Confirmation modal implemented
- [ ] Draft versioning working
- [ ] Version history accessible
- [ ] Prompt variation implemented
- [ ] Regeneration limits enforced
- [ ] Cost tracking for regenerations
- [ ] User testing feedback incorporated

**Dependencies:** E4.3 (Draft Worker), E4.5 (Reasoning)

---

### Story E4.7: Batch Draft Generation Orchestration

**Story Points:** 2

As a **system**,  
I want **to efficiently generate drafts for multiple prospects in batch**,  
So that **users can start reviewing emails quickly after importing prospects**.

**Acceptance Criteria:**

**AC1: Batch Enqueue on Research Completion**

**Given** a prospect research completes successfully  
**When** the research profile is saved  
**Then** automatically enqueue draft generation job  
**And** batch enqueue jobs (group of 10) for efficiency  
**And** prospects should flow: Import → Research → Draft without manual intervention

**AC2: Batch Progress Tracking**

**Given** multiple drafts are being generated  
**When** user views campaign dashboard  
**Then** show batch progress:

- "Generating drafts: 15 of 100 complete"
- Progress bar
- Estimated time remaining  
  **And** update in real-time (polling or websockets)

**AC3: Priority Queue Management**

**Given** multiple campaigns are generating drafts  
**When** jobs are in the queue  
**Then** prioritize by:

- Campaign urgency (user-set priority)
- Research recency (process fresh research first)
- User tier (premium users get priority)  
  **And** implement priority queue in RabbitMQ

**AC4: Failure Impact Minimization**

**Given** some drafts in a batch fail  
**When** the batch completes  
**Then** successful drafts should still be available  
**And** failed drafts should be reported separately  
**And** user should be able to retry failed drafts only

**AC5: Completion Notification**

**Given** all drafts in a campaign are generated  
**When** the last draft completes  
**Then** notify user:

- In-app notification: "100 drafts ready for review"
- Optional email notification
- Link to review queue  
  **And** celebrate milestone if large batch

**Technical Considerations:**

- Use RabbitMQ message properties for priority
- Implement batch status tracking in Redis for performance
- Consider WebSocket for real-time progress updates
- Monitor worker throughput and scale if needed
- Implement backpressure if queue gets too large

**Definition of Done:**

- [ ] Automatic enqueue on research completion
- [ ] Batch progress tracking working
- [ ] Priority queue implemented
- [ ] Failure handling working
- [ ] Completion notification working
- [ ] Performance tested (100+ drafts)
- [ ] User feedback on batch experience

**Dependencies:** E4.3 (Draft Worker), E3.5 (Research Completion)

---

## Epic E5: Email Review & Approval Interface

**Priority:** P0 (MVP Core)  
**Status:** Not Started  
**Estimated Story Points:** 21  
**Dependencies:** E4 (AI Draft Generation)  
**Requirements Covered:** FR5, NFR11, NFR12

**Epic Goal:** Provide an efficient, keyboard-driven interface for users to review, edit, and approve AI-generated drafts at scale.

**Success Criteria:**

- Review interface displays drafts with all context (research, confidence, preview)
- Keyboard shortcuts enable rapid review (< 30 seconds per draft)
- Inline editing works smoothly
- Batch approval capability
- User edits are logged for AI improvement

---

### Story E5.1: Review Queue Interface

**Story Points:** 5

As a **freelance video producer**,  
I want **to see a queue of drafts ready for review**,  
So that **I can efficiently process my outreach emails**.

**Acceptance Criteria:**

**AC1: Review Queue Display**

**Given** I navigate to the review interface  
**When** the page loads  
**Then** I should see:

- Queue counter: "15 of 100 drafts reviewed"
- Progress bar showing completion percentage
- Current draft in focus (large, center)
- Thumbnail navigation (previous/next drafts visible)  
  **And** load current draft in < 1 second

**AC2: Draft Card Layout**

**Given** I am viewing a draft  
**When** the card displays  
**Then** I should see sections:

- **Left Panel**: Prospect info (company, name, website link), research highlights, sources, confidence score
- **Center Panel**: Draft (subject + body), editable
- **Right Panel**: Email preview (how it will look sent), action buttons  
  **And** layout should be responsive and spacious

**AC3: Queue Filtering**

**Given** I want to focus on specific drafts  
**When** I apply filters  
**Then** I should be able to filter by:

- Confidence level (High, Medium, Low)
- Campaign
- Review status (Unreviewed, Edited, Approved)  
  **And** filter should update queue count  
  **And** persist filter selection in session

**AC4: Queue Sorting**

**Given** I want to organize my review process  
**When** I select sorting options  
**Then** I should be able to sort by:

- Confidence score (high to low, or low to high)
- Date added (newest first, oldest first)
- Company name (alphabetical)  
  **And** default sort: Newest first

**AC5: Empty Queue State**

**Given** all drafts have been reviewed  
**When** I view the review queue  
**Then** show empty state:

- Celebration message: "All drafts reviewed! 🎉"
- Summary: "100 approved, 10 regenerated, 5 skipped"
- "View Approved Drafts" button  
  **And** encourage next action

**Technical Considerations:**

- Fetch drafts with status "Pending Review"
- Prefetch next 3 drafts for instant navigation
- Use cursor-based pagination for large queues
- Cache draft data in Redux/Zustand for smooth UX
- Lazy load research data to improve initial load time

**Definition of Done:**

- [ ] Review queue interface implemented
- [ ] Draft card layout working
- [ ] Filtering functional
- [ ] Sorting working
- [ ] Empty state implemented
- [ ] Performance tested (100+ drafts)
- [ ] UX tested with real users
- [ ] Accessibility tested (screen reader)

**Dependencies:** E4.3 (Draft Generation)

---

### Story E5.2: Keyboard Shortcuts for Rapid Review

**Story Points:** 5

As a **freelance video producer**,  
I want **keyboard shortcuts for common review actions**,  
So that **I can rapidly approve emails without constantly clicking buttons**.

**Acceptance Criteria:**

**AC1: Keyboard Shortcuts Implementation**

**Given** I am in the review interface  
**When** I press keyboard shortcuts  
**Then** actions should trigger:

- **A**: Approve draft and move to next
- **E**: Enter edit mode (focus on subject line)
- **S**: Skip draft and move to next
- **R**: Regenerate draft
- **→ (Right Arrow)**: Next draft (without approving)
- **← (Left Arrow)**: Previous draft
- **Ctrl+Enter**: Save edits and approve
- **Esc**: Cancel edit mode / close modals  
  **And** shortcuts should work consistently throughout interface

**AC2: Keyboard Shortcut Visual Hints**

**Given** I am new to the interface  
**When** I hover over action buttons  
**Then** tooltips should display keyboard shortcut  
**And** show hint overlay on first visit: "Tip: Use 'A' to quickly approve drafts"  
**And** provide link to full shortcut reference

**AC3: Shortcut Conflict Prevention**

**Given** I am typing in an input field  
**When** I press a shortcut key  
**Then** it should NOT trigger the action (typing should take precedence)  
**And** shortcuts should only work when focus is outside text inputs  
**And** provide visual indicator when shortcuts are active

**AC4: Shortcut Cheat Sheet**

**Given** I want to reference shortcuts  
**When** I press '?' key or click Help icon  
**Then** a modal should display with all shortcuts:

- Action name, keyboard shortcut, description
- Grouped by category (navigation, actions, editing)
- Searchable list  
  **And** printable/exportable reference card

**AC5: Accessibility for Non-keyboard Users**

**Given** a user cannot use keyboard shortcuts  
**When** they use the interface  
**Then** all actions should also be accessible via:

- Mouse clicks on buttons
- Touch gestures on mobile
- Screen reader announcements  
  **And** ensure no functionality is keyboard-only

**Technical Considerations:**

- Use event listener for keydown events
- Implement mousetrap or hotkeys-js library
- Prevent default browser shortcuts (e.g., Ctrl+S)
- Handle focus management (return focus after modal close)
- Test across browsers and operating systems
- Consider customizable shortcuts (future enhancement)

**Definition of Done:**

- [ ] All keyboard shortcuts working
- [ ] Visual hints implemented
- [ ] Shortcut cheat sheet accessible
- [ ] Conflict prevention working
- [ ] Accessibility verified
- [ ] Cross-browser tested
- [ ] User training materials created

**Dependencies:** E5.1 (Review Queue)

---

### Story E5.3: Inline Draft Editing

**Story Points:** 5

As a **freelance video producer**,  
I want **to edit drafts directly in the review interface**,  
So that **I can fine-tune emails without leaving the workflow**.

**Acceptance Criteria:**

**AC1: Edit Mode Activation**

**Given** I am reviewing a draft  
**When** I press 'E' or click "Edit" button  
**Then** draft should enter edit mode:

- Subject line becomes editable input
- Body text becomes editable textarea
- Action buttons change to "Save" and "Cancel"
- Personalization highlights remain visible  
  **And** cursor should focus on subject line

**AC2: Real-time Character Count**

**Given** I am editing the email body  
**When** I type  
**Then** character/word count should update in real-time  
**And** show warning if exceeds 150 words: "Email is longer than recommended (150 words)"  
**And** allow exceeding limit (soft limit, not enforced)

**AC3: Personalization Preservation**

**Given** I am editing the email  
**When** I modify personalized sections  
**Then** personalization highlights should update  
**And** warn if I delete a personalized section: "You removed a personalization hook. Continue?"  
**And** allow user to proceed or undo

**AC4: Save Edits**

**Given** I have made changes to a draft  
**When** I press Ctrl+Enter or click "Save"  
**Then** changes should be saved to database:

- Update subject_line and body_text
- Log edit timestamp and user_id
- Update edited_at field
- Mark draft as "Edited"  
  **And** show success feedback: "Edits saved"  
  **And** remain in edit mode for further changes

**AC5: Auto-save Draft**

**Given** I am editing a draft  
**When** 30 seconds pass without activity  
**Then** draft should auto-save  
**And** show subtle indicator: "Draft auto-saved"  
**And** prevent data loss if browser crashes

**AC6: Discard Edits**

**Given** I have made changes I want to revert  
**When** I press Esc or click "Cancel"  
**Then** a confirmation should display: "Discard your changes?"  
**And** clicking "Discard" reverts to original draft  
**And** clicking "Keep Editing" returns to edit mode

**Technical Considerations:**

- Use controlled components for form inputs
- Implement debounced auto-save (30s delay)
- Store edits locally (localStorage) as backup
- Use optimistic UI updates for responsiveness
- Implement rich text editor for formatting (future enhancement)
- Track specific edits for AI learning (diff algorithm)

**Definition of Done:**

- [ ] Edit mode working
- [ ] Real-time character count implemented
- [ ] Personalization preservation working
- [ ] Save and auto-save functional
- [ ] Discard changes working
- [ ] Edit logging implemented
- [ ] UX tested with various edit scenarios
- [ ] Data loss prevention verified

**Dependencies:** E5.1 (Review Queue)

---

### Story E5.4: Approve, Skip, and Regenerate Actions

**Story Points:** 3

As a **freelance video producer**,  
I want **to take quick actions on each draft**,  
So that **I can manage my review workflow efficiently**.

**Acceptance Criteria:**

**AC1: Approve Action**

**Given** I am satisfied with a draft  
**When** I press 'A' or click "Approve"  
**Then** the draft should:

- Update status to "Approved"
- Move to "Ready to Send" queue
- Advance to next draft in review queue
- Show brief success message: "Draft approved"  
  **And** action should complete in < 500ms

**AC2: Skip Action**

**Given** I want to review a draft later  
**When** I press 'S' or click "Skip"  
**Then** the draft should:

- Remain status "Pending Review"
- Move to end of review queue
- Advance to next draft
- Increment skip_count for draft  
  **And** I can return to skipped drafts later

**AC3: Regenerate Action**

**Given** I am not satisfied with a draft  
**When** I press 'R' or click "Regenerate"  
**Then** a confirmation modal should display  
**And** confirming should:

- Archive current draft version
- Enqueue new draft generation job
- Show loading state: "Regenerating draft..."
- Replace with new draft when ready (polling or notification)  
  **And** I can continue reviewing other drafts while regenerating

**AC4: Action Confirmation for Edge Cases**

**Given** I am about to take an action with consequences  
**When** the action requires confirmation  
**Then** show confirmation for:

- Approving a "Low confidence" draft: "This draft has low confidence. Approve anyway?"
- Skipping a draft multiple times: "You've skipped this 3 times. Regenerate instead?"
- Regenerating after already regenerating 2 times: "This is your last regeneration. Continue?"  
  **And** allow user to proceed or cancel

**AC5: Undo Action**

**Given** I accidentally approved or skipped a draft  
**When** I want to undo  
**Then** show "Undo" button for 5 seconds after action  
**And** clicking "Undo" reverts action and returns to draft  
**And** allow undo for Approve and Skip (not Regenerate)

**Technical Considerations:**

- Use optimistic UI updates for instant feedback
- Queue actions locally and sync to server
- Handle offline scenarios (queue actions, sync later)
- Implement undo stack (last 3 actions)
- Log all actions with timestamps for analytics
- Monitor action distribution (high skip rate = prompt issue)

**Definition of Done:**

- [ ] Approve action working
- [ ] Skip action working
- [ ] Regenerate action working
- [ ] Action confirmations implemented
- [ ] Undo feature functional
- [ ] Performance tested (instant feedback)
- [ ] User feedback on workflow efficiency
- [ ] Analytics tracking implemented

**Dependencies:** E5.1 (Review Queue), E4.6 (Regenerate)

---

### Story E5.5: Batch Approval Capability

**Story Points:** 3

As a **freelance video producer**,  
I want **to approve multiple high-quality drafts at once**,  
So that **I can quickly process drafts I trust without individual review**.

**Acceptance Criteria:**

**AC1: Batch Selection**

**Given** I am in the review queue  
**When** I enable batch selection mode  
**Then** checkboxes should appear on each draft card  
**And** I should be able to:

- Click individual drafts to select
- Use "Select All" option
- Use "Select All High Confidence" option  
  **And** show count of selected drafts

**AC2: Batch Approve Action**

**Given** I have selected multiple drafts  
**When** I click "Approve Selected" button  
**Then** a confirmation should display:

- "Approve X drafts?"
- List of selected drafts (company names)
- Warning if any are Medium/Low confidence  
  **And** confirming should approve all selected drafts  
  **And** show progress: "Approving X of Y..."

**AC3: Confidence-based Filtering for Batch**

**Given** I want to batch approve only high-confidence drafts  
**When** I click "Approve All High Confidence"  
**Then** the system should:

- Filter drafts with confidence ≥ 80%
- Select all matching drafts
- Show confirmation with count
- Approve all on confirmation  
  **And** low/medium confidence drafts remain for individual review

**AC4: Batch Approval Safety**

**Given** batch approval is powerful  
**When** executing batch actions  
**Then** implement safety measures:

- Max 50 drafts per batch
- Require explicit confirmation
- Show preview of impacted drafts
- Allow deselecting individual drafts before confirming  
  **And** log batch approval actions for audit

**AC5: Batch Approval Results**

**Given** batch approval completes  
**When** processing is done  
**Then** show results summary:

- "Successfully approved: X drafts"
- "Failed: Y drafts" (if any, with reasons)
- "View Approved Drafts" button  
  **And** failed drafts should remain in queue for review

**Technical Considerations:**

- Use database transaction for batch updates
- Implement batch API endpoint (avoid N individual requests)
- Handle partial failures gracefully
- Show progress indicator for large batches
- Monitor batch approval rate (excessive use may indicate over-trust in AI)
- Consider adding batch edit capability (future enhancement)

**Definition of Done:**

- [ ] Batch selection working
- [ ] Batch approve functional
- [ ] Confidence-based filtering working
- [ ] Safety measures implemented
- [ ] Results summary displaying
- [ ] Performance tested (50 drafts)
- [ ] User testing feedback incorporated
- [ ] Audit logging implemented

**Dependencies:** E5.1 (Review Queue), E5.4 (Approve Action)

---

## Epic E6: Gmail Integration & Email Sending

**Priority:** P0 (MVP Core)  
**Status:** Not Started  
**Estimated Story Points:** 21  
**Dependencies:** E5 (Email Review & Approval)  
**Requirements Covered:** FR6, NFR4, NFR6

**Epic Goal:** Enable users to connect their Gmail account and send approved emails via Gmail API with proper pacing, tracking, and security.

**Success Criteria:**

- OAuth 2.0 Gmail connection working
- Emails sent via Gmail API appear in user's Sent folder
- Rate limiting prevents spam-like behavior (1 email per 60-90 seconds)
- Delivery tracking captured
- Daily send limits enforced
- Unsubscribe mechanism included

---

### Story E6.1: Gmail OAuth 2.0 Connection Flow

**Story Points:** 5

As a **freelance video producer**,  
I want **to securely connect my Gmail account**,  
So that **ProspectFlow can send emails on my behalf**.

**Acceptance Criteria:**

**AC1: Connect Gmail Button**

**Given** I need to connect Gmail for sending  
**When** I navigate to Settings > Email Integration  
**Then** I should see:

- "Connect Gmail Account" button
- Explanation: "ProspectFlow will send emails from your Gmail address"
- Permission details: "We'll request permission to send and read emails"
- Security notice: "Your credentials are never stored. We use secure OAuth 2.0"

**AC2: OAuth 2.0 Authorization Flow**

**Given** I click "Connect Gmail Account"  
**When** the OAuth flow initiates  
**Then** I should be redirected to Google's authorization page  
**And** see permission scopes requested:

- `https://www.googleapis.com/auth/gmail.send`
- `https://www.googleapis.com/auth/gmail.readonly`  
  **And** be able to choose which Google account to use  
  **And** be able to cancel and return to ProspectFlow

**AC3: Authorization Success**

**Given** I approve the Gmail connection  
**When** Google redirects back to ProspectFlow  
**Then** the system should:

- Receive authorization code
- Exchange for access token and refresh token
- Store tokens securely (encrypted at rest)
- Link tokens to user's organisation_id and user_id
- Verify connection by fetching user's email address  
  **And** show success message: "Gmail connected: your-email@gmail.com"

**AC4: Token Storage Security**

**Given** Gmail tokens are highly sensitive  
**When** storing tokens  
**Then** they should be:

- Encrypted using AES-256
- Stored in database with encryption key from environment variable
- Never logged or exposed in API responses
- Associated with user_id for access control  
  **And** access tokens should have metadata: created_at, expires_at

**AC5: Token Refresh Mechanism**

**Given** Gmail access tokens expire after 1 hour  
**When** an access token is expired  
**Then** the system should:

- Detect expiration before sending request
- Use refresh token to obtain new access token
- Update stored access token
- Retry the original operation  
  **And** handle refresh token expiration (prompt user to re-authenticate)

**AC6: Connection Status Display**

**Given** I have connected Gmail  
**When** I view Settings > Email Integration  
**Then** I should see:

- "Connected: your-email@gmail.com" (green badge)
- "Disconnect Gmail" button
- Connection status: "Last verified: 2 hours ago"
- Daily send limit: "32 of 40 emails sent today"

**Technical Considerations:**

- Use Google OAuth 2.0 Node.js client library
- Store encrypted tokens in `iam.user_credentials` table
- Implement token rotation for security
- Handle authorization errors (denied permission, invalid state)
- Use PKCE flow for added security
- Test OAuth flow in development (localhost redirect)

**Definition of Done:**

- [ ] OAuth flow implemented end-to-end
- [ ] Tokens stored securely
- [ ] Token refresh working
- [ ] Connection status display working
- [ ] Disconnect functionality implemented
- [ ] Security review passed
- [ ] E2E test with real Gmail account
- [ ] Documentation for users

**Dependencies:** E0.4 (Authentication)

---

### Story E6.2: Email Sending via Gmail API

**Story Points:** 5

As a **system**,  
I want **to send approved emails via Gmail API**,  
So that **emails appear from the user's Gmail address and land in their Sent folder**.

**Acceptance Criteria:**

**AC1: Email Composition**

**Given** an approved draft needs to be sent  
**When** preparing the email  
**Then** construct RFC 5322 compliant email with:

- From: User's Gmail address
- To: Prospect's contact_email
- Subject: Draft subject_line
- Body: Plain text (no HTML for MVP)
- Headers: Message-ID, Date, Reply-To
- Unsubscribe: List-Unsubscribe header with unsubscribe link  
  **And** encode email as base64url format for Gmail API

**AC2: Gmail API Send Request**

**Given** email is composed  
**When** sending via Gmail API  
**Then** make POST request to `/gmail/v1/users/me/messages/send`  
**And** include access token in Authorization header  
**And** receive response with message ID and thread ID  
**And** complete send in < 5 seconds

**AC3: Sent Folder Appearance**

**Given** email is sent successfully  
**When** I check my Gmail Sent folder  
**Then** the email should appear there  
**And** show as sent from my address  
**And** be searchable and retrievable like any sent email

**AC4: Delivery Confirmation**

**Given** email is sent via Gmail API  
**When** response is received  
**Then** store in database:

- gmail_message_id
- gmail_thread_id
- sent_at (timestamp)
- delivery_status: "Sent"  
  **And** update prospect status to "Email Sent"

**AC5: Send Failures**

**Given** email send fails  
**When** the error occurs  
**Then** handle errors:

- 401 Unauthorized: Refresh token and retry
- 403 Forbidden: User revoked access, notify user
- 429 Rate Limited: Back off and retry
- 500 Server Error: Retry up to 3 times with exponential backoff  
  **And** if all retries fail, mark email as "Send Failed" with reason

**AC6: Plain Text Email Formatting**

**Given** email body is plain text  
**When** composing the email  
**Then** format for readability:

- Preserve line breaks
- Wrap lines at 72 characters (standard email width)
- Include signature with contact info
- Add unsubscribe footer  
  **And** ensure professional appearance in all email clients

**Technical Considerations:**

- Use googleapis npm package
- Implement retry logic with exponential backoff
- Log all send attempts with outcomes
- Handle Gmail API quotas (10,000 requests/day)
- Test with various email clients (Gmail, Outlook, Apple Mail)
- Monitor send success rate (should be > 95%)

**Definition of Done:**

- [ ] Email sending working via Gmail API
- [ ] Emails appear in Sent folder
- [ ] Delivery confirmation stored
- [ ] Error handling implemented
- [ ] Plain text formatting working
- [ ] Retry logic functional
- [ ] Integration tests with Gmail API
- [ ] Send success rate monitored

**Dependencies:** E6.1 (OAuth Connection)

---

### Story E6.3: Rate Limiting and Pacing

**Story Points:** 3

As a **system**,  
I want **to pace email sending to avoid spam-like behavior**,  
So that **user's Gmail reputation is protected and emails have better deliverability**.

**Acceptance Criteria:**

**AC1: Individual Email Pacing**

**Given** multiple emails are queued for sending  
**When** sending emails  
**Then** enforce pacing:

- Minimum delay: 60 seconds between emails
- Maximum delay: 90 seconds between emails
- Randomize delay within range (60-90 seconds)  
  **And** prevent burst sending

**AC2: Daily Send Limit**

**Given** users should not exceed safe sending volumes  
**When** tracking daily sends  
**Then** enforce limits:

- Default limit: 40 emails per day per user
- Configurable by user (range: 10-50)
- Reset at midnight user's timezone  
  **And** prevent additional sends when limit reached

**AC3: Send Queue Management**

**Given** emails are queued for sending  
**When** the send worker processes queue  
**Then** it should:

- Calculate next available send time
- Wait until that time before sending
- Update queue position for visibility
- Process one email at a time (no parallelization)  
  **And** maintain steady, predictable pacing

**AC4: Limit Reached Notification**

**Given** daily send limit is reached  
**When** the limit is hit  
**Then** notify user:

- In-app notification: "Daily send limit reached (40/40)"
- Email notification (optional)
- Remaining emails moved to next day's queue  
  **And** show when sending will resume: "Sending resumes tomorrow at 12:00 AM"

**AC5: Progress Visibility**

**Given** batch sending is in progress  
**When** user views campaign dashboard  
**Then** show sending status:

- "Sending: 15 of 40 emails sent"
- "Next email in: 32 seconds"
- Progress bar
- Estimated completion time  
  **And** update in real-time

**AC6: Pause/Resume Sending**

**Given** I want to control when emails are sent  
**When** I click "Pause Sending"  
**Then** the send queue should pause  
**And** no new emails should be sent until I click "Resume"  
**And** queued emails should remain queued  
**And** show status: "Sending paused by user"

**Technical Considerations:**

- Use RabbitMQ delayed message plugin or Redis for scheduling
- Store daily send count in Redis with expiry
- Use distributed lock to prevent race conditions
- Consider time zones for daily limit reset
- Monitor actual send rate vs. configured rate
- Implement jitter to avoid patterns detectable as automated

**Definition of Done:**

- [ ] Email pacing implemented (60-90s delay)
- [ ] Daily send limit enforced
- [ ] Send queue management working
- [ ] Limit reached notification functional
- [ ] Progress visibility implemented
- [ ] Pause/resume capability working
- [ ] Tests for pacing and limits
- [ ] User feedback on pacing UX

**Dependencies:** E6.2 (Email Sending)

---

### Story E6.4: Batch Email Sending Orchestration

**Story Points:** 5

As a **freelance video producer**,  
I want **to send multiple approved emails in a controlled batch**,  
So that **I can execute my campaign efficiently while respecting rate limits**.

**Acceptance Criteria:**

**AC1: Send Batch Action**

**Given** I have approved emails ready to send  
**When** I navigate to "Ready to Send" queue  
**Then** I should see:

- List of approved emails (company names, subjects)
- "Send All" button
- "Send Selected" option with checkboxes
- Total count: "32 emails ready to send"  
  **And** be able to preview each email before sending

**AC2: Send Confirmation**

**Given** I click "Send All" or "Send Selected"  
**When** the confirmation modal displays  
**Then** it should show:

- Number of emails to send: "Send 32 emails?"
- Estimated duration: "This will take approximately 35 minutes"
- Daily limit impact: "32 of 40 daily sends will be used"
- "Confirm Send" and "Cancel" buttons  
  **And** require explicit confirmation

**AC3: Batch Sending Execution**

**Given** I confirm batch send  
**When** the sending process starts  
**Then** the system should:

1. Enqueue all emails to send_queue in RabbitMQ
2. Send worker processes queue with pacing
3. Update each email status as sent
4. Track delivery and store Gmail message IDs  
   **And** I can navigate away while sending continues

**AC4: Real-time Progress Tracking**

**Given** batch sending is in progress  
**When** I view the campaign dashboard  
**Then** I should see:

- Progress: "Sending: 15 of 32 emails sent"
- Progress bar (visual)
- Estimated time remaining: "17 minutes remaining"
- List of sent emails (live updates)  
  **And** updates should appear without page refresh (WebSocket or polling)

**AC5: Partial Failures**

**Given** some emails in the batch fail to send  
**When** the batch completes  
**Then** show results summary:

- Successfully sent: X emails
- Failed: Y emails (with reasons)
- Option to retry failed emails  
  **And** failed emails should remain in "Ready to Send" queue

**AC6: Completion Notification**

**Given** all emails in batch are sent  
**When** the last email is sent  
**Then** notify user:

- In-app notification: "Campaign sent! 32 emails delivered"
- Optional email notification with summary
- Link to view sent emails and campaign analytics  
  **And** celebrate milestone

**Technical Considerations:**

- Use RabbitMQ for reliable job queueing
- Implement idempotency (don't send same email twice)
- Store send state in database for recovery
- Use WebSocket for real-time updates (or polling fallback)
- Handle worker failures (jobs should not be lost)
- Monitor send queue depth and worker health

**Definition of Done:**

- [ ] Send batch action working
- [ ] Send confirmation modal implemented
- [ ] Batch sending execution working
- [ ] Real-time progress tracking implemented
- [ ] Partial failure handling working
- [ ] Completion notification functional
- [ ] E2E test for batch send
- [ ] User testing feedback incorporated

**Dependencies:** E6.2 (Sending), E6.3 (Pacing)

---

### Story E6.5: Unsubscribe Mechanism

**Story Points:** 3

As a **recipient of ProspectFlow emails**,  
I want **an easy way to unsubscribe from future emails**,  
So that **I'm not contacted again if I'm not interested**.

**Acceptance Criteria:**

**AC1: Unsubscribe Link in Email**

**Given** an email is sent  
**When** composing the email  
**Then** include footer:

```
---
If you'd prefer not to receive future emails from me, you can unsubscribe here: [Unsubscribe Link]
```

**And** link should be unique per prospect: `https://prospectflow.app/unsubscribe?token={encrypted_token}`  
**And** token should encode: prospect_id, campaign_id, organisation_id

**AC2: List-Unsubscribe Header**

**Given** an email is sent  
**When** setting email headers  
**Then** include `List-Unsubscribe` header:

```
List-Unsubscribe: <https://prospectflow.app/unsubscribe?token={token}>
```

**And** enable one-click unsubscribe for compatible email clients (Gmail, Outlook)

**AC3: Unsubscribe Landing Page**

**Given** a recipient clicks unsubscribe link  
**When** the page loads  
**Then** show:

- Company/person name: "Unsubscribe from emails sent by [User's Name]"
- Confirmation: "You will no longer receive emails from this sender"
- "Unsubscribe" button (primary action)
- "Cancel" link  
  **And** page should be simple and fast (no login required)

**AC4: Unsubscribe Processing**

**Given** a recipient confirms unsubscribe  
**When** they click "Unsubscribe"  
**Then** the system should:

- Decrypt token to get prospect_id and organisation_id
- Update `crm.people` table: unsubscribed = true, unsubscribed_at = NOW()
- Add to organisation's global unsubscribe list
- Prevent future emails to this prospect across all campaigns  
  **And** show confirmation: "You've been unsubscribed. You won't receive any more emails from us."

**AC5: Unsubscribe Enforcement**

**Given** a prospect has unsubscribed  
**When** attempting to send them an email  
**Then** the system should:

- Check unsubscribe status before queueing send
- Skip sending to unsubscribed prospects
- Log attempted send to unsubscribed prospect (for auditing)
- Notify user if they try to add unsubscribed prospect to new campaign

**AC6: Unsubscribe Analytics**

**Given** prospects unsubscribe  
**When** viewing campaign analytics  
**Then** show:

- Total unsubscribes count
- Unsubscribe rate (per campaign, overall)
- Timeline of unsubscribes  
  **And** alert if unsubscribe rate is unusually high (> 5%)

**Technical Considerations:**

- Encrypt unsubscribe tokens (include HMAC for integrity)
- Set token expiry (1 year) for security
- Create index on unsubscribed field for fast lookup
- Consider allowing re-subscribe (with double opt-in)
- Ensure GDPR compliance (respect unsubscribe immediately)
- Log all unsubscribe events for compliance

**Definition of Done:**

- [ ] Unsubscribe link in emails
- [ ] List-Unsubscribe header included
- [ ] Unsubscribe landing page working
- [ ] Unsubscribe processing functional
- [ ] Enforcement working (no sends to unsubscribed)
- [ ] Analytics tracking unsubscribes
- [ ] Compliance review passed
- [ ] E2E test for unsubscribe flow

**Dependencies:** E6.2 (Email Sending)

---

## Epic E7: Response Tracking & Notifications

**Priority:** P1 (Post-MVP Enhancement)  
**Status:** Not Started  
**Estimated Story Points:** 21  
**Dependencies:** E6 (Gmail Integration)  
**Requirements Covered:** FR7

**Epic Goal:** Monitor Gmail for prospect replies, classify responses, and notify users of important interactions.

**Success Criteria:**

- Replies detected automatically within 15 minutes
- Response classification (Positive, Objection, Negative, Unclear) works accurately
- Users notified of new responses in real-time
- Response threads linked to original outreach

### Story E7.1: Gmail Reply Detection Worker

**Story Points:** 8

As a **system**, I want **to monitor user's Gmail for replies to sent emails**, So that **responses are captured and linked to prospects**.

**Acceptance Criteria:**

- Worker polls Gmail API every 15 minutes for new messages
- Matches replies to sent emails using thread_id and gmail_message_id
- Updates prospect status to "Replied"
- Stores reply content, timestamp, and thread_id
- Handles multiple replies in same thread

**Dependencies:** E6.1 (Gmail OAuth)

---

### Story E7.2: Response Classification with AI

**Story Points:** 5

As a **system**, I want **to classify responses into categories**, So that **users can prioritize positive responses**.

**Acceptance Criteria:**

- Use AI (GPT) to classify responses: Positive (interested), Objection (not now/too expensive), Negative (not interested/unsubscribe), Unclear (needs review)
- Store classification with confidence score
- Allow manual reclassification by user
- Track classification accuracy over time

**Dependencies:** E7.1 (Reply Detection)

---

### Story E7.3: User Notifications for Responses

**Story Points:** 5

As a **freelance video producer**, I want **to be notified when prospects reply**, So that **I can follow up quickly on interested leads**.

**Acceptance Criteria:**

- In-app notification: "New reply from [Company Name]"
- Badge on navigation showing unread reply count
- Optional email notification (configurable)
- Optional SMS notification for positive responses (future)
- Click notification to view full thread

**Dependencies:** E7.2 (Classification)

---

### Story E7.4: Response Dashboard

**Story Points:** 3

As a **freelance video producer**, I want **to see all responses in one place**, So that **I can manage follow-ups efficiently**.

**Acceptance Criteria:**

- Response dashboard with filters (Positive, Objection, Negative, Unclear)
- Sort by date, company name, campaign
- View full email thread
- Mark as read/unread
- Archive responses
- Response rate metrics per campaign

**Dependencies:** E7.2 (Classification)

---

## Epic E8: Campaign Analytics Dashboard

**Priority:** P1 (Post-MVP Enhancement)  
**Status:** Not Started  
**Estimated Story Points:** 21  
**Dependencies:** E7 (Response Tracking)  
**Requirements Covered:** FR8

**Epic Goal:** Provide comprehensive analytics and insights on campaign performance to help users optimize their outreach.

**Success Criteria:**

- Dashboard displays key metrics (sent, opened, replied, meetings booked)
- Visualizations show trends over time
- Per-campaign and overall metrics available
- Data exportable to CSV

### Story E8.1: Campaign Metrics Calculation

**Story Points:** 5

As a **system**, I want **to calculate and store campaign metrics**, So that **analytics can be displayed efficiently**.

**Acceptance Criteria:**

- Calculate daily: emails sent, responses received, positive responses, meetings booked
- Calculate rates: response rate, positive rate, conversion rate
- Store in `tracking.campaign_stats` table with daily granularity
- Aggregate weekly and monthly stats
- Performance: calculations complete in < 30 seconds for 100 campaigns

**Dependencies:** E7.1 (Response Tracking)

---

### Story E8.2: Analytics Dashboard UI

**Story Points:** 8

As a **freelance video producer**, I want **to see visual analytics of my campaigns**, So that **I can understand what's working**.

**Acceptance Criteria:**

- Overview panel: Total meetings this month, progress to 10-15 goal, average response rate, time saved
- Per-campaign metrics: sent, open rate (if tracking pixels enabled), response rate, positive rate, meetings
- Visualizations: response rate trend (line chart), campaign comparison (bar chart), funnel view (sent → opened → replied → meeting)
- Date range selector (last 7 days, 30 days, 90 days, all time)
- Export to CSV button

**Dependencies:** E8.1 (Metrics Calculation)

---

### Story E8.3: Meeting Tracking

**Story Points:** 5

As a **freelance video producer**, I want **to track which responses led to meetings**, So that **I can measure true success**.

**Acceptance Criteria:**

- "Mark as Meeting Booked" action on responses
- Meeting details form: date, time, notes
- Meetings count in analytics
- Celebrate milestone when monthly goal reached (10-15 meetings)
- Meeting attribution to campaign and specific email

**Dependencies:** E7.4 (Response Dashboard)

---

### Story E8.4: Time Saved Calculation

**Story Points:** 3

As a **freelance video producer**, I want **to see how much time ProspectFlow saves me**, So that **I can justify the investment**.

**Acceptance Criteria:**

- Estimate time saved: (prospects researched × 10 min) + (emails drafted × 5 min)
- Display in dashboard: "You've saved 15 hours this month"
- Compare to baseline: "50% reduction from your 10h/week target"
- Show ROI: time saved vs. subscription cost (if paid tier)

**Dependencies:** E8.1 (Metrics)

---

## Epic E9: Follow-up Sequence Automation

**Priority:** P2 (Enhancement)  
**Status:** Not Started  
**Estimated Story Points:** 21  
**Dependencies:** E6 (Sending), E7 (Response Tracking)  
**Requirements Covered:** FR9

**Epic Goal:** Automatically draft and schedule follow-up emails for non-responders, with approval workflow.

**Success Criteria:**

- Follow-up sequences configurable per campaign (e.g., "5 days after send if no reply")
- AI drafts follow-ups that reference original email and add new hook
- Follow-ups require approval before sending
- Max 2 follow-ups per prospect
- Stop follow-ups if prospect replies

### Story E9.1: Follow-up Sequence Configuration

**Story Points:** 5

As a **freelance video producer**, I want **to configure follow-up timing**, So that **non-responders receive a gentle reminder**.

**Acceptance Criteria:**

- Campaign setting: Enable/disable follow-ups
- Timing configuration: "Send follow-up after X days (3, 5, 7, 10)"
- Second follow-up: "Send 2nd follow-up after Y days (default: +5 days from first follow-up)"
- Stop rules: Stop if prospect replies, unsubscribes, or manually excluded

**Dependencies:** E1.3 (Campaign Settings)

---

### Story E9.2: Follow-up Draft Generation

**Story Points:** 8

As a **AI system**, I want **to generate contextual follow-up emails**, So that **follow-ups feel natural and respectful**.

**Acceptance Criteria:**

- AI prompt includes: original email sent, research hooks, days since original send
- Follow-up structure: Reference original email ("Following up on my email about..."), add new hook if available, keep it brief (50-75 words), respectful tone ("No pressure if this isn't the right time")
- Store draft for approval (same workflow as initial drafts)
- Confidence scoring applied

**Dependencies:** E4.2 (AI Integration), E9.1 (Configuration)

---

### Story E9.3: Follow-up Scheduling Worker

**Story Points:** 5

As a **system**, I want **to automatically schedule follow-ups**, So that **they send at the right time**.

**Acceptance Criteria:**

- Daily cron job checks for prospects eligible for follow-up (sent X days ago, no reply, follow-up enabled)
- Enqueue follow-up draft generation jobs
- Once approved, schedule send based on configured delay
- Skip if prospect replied, unsubscribed, or was manually excluded
- Max 2 follow-ups per prospect enforced

**Dependencies:** E9.2 (Draft Generation), E6.3 (Sending Pacing)

---

### Story E9.4: Follow-up Analytics

**Story Points:** 3

As a **freelance video producer**, I want **to see how follow-ups perform**, So that **I can optimize timing and messaging**.

**Acceptance Criteria:**

- Analytics: Follow-up response rate vs. initial email response rate
- Optimal timing analysis: Which delay (3, 5, 7 days) performs best
- Display in campaign analytics dashboard
- A/B test different follow-up delays

**Dependencies:** E9.3 (Scheduling), E8.2 (Analytics Dashboard)

---

## Epic E10: Email Template Library

**Priority:** P2 (Enhancement)  
**Status:** Not Started  
**Estimated Story Points:** 13  
**Dependencies:** E4 (AI Draft Generation)  
**Requirements Covered:** FR10

**Epic Goal:** Provide pre-built email templates and allow users to create custom templates for different outreach scenarios.

**Success Criteria:**

- 5-7 pre-built templates available (social media content, product demo video, testimonial collection, event coverage, team introduction)
- Users can clone and customize templates
- Templates include personalization strategy guidance
- Custom templates saved to user's library

### Story E10.1: Pre-built Template Library

**Story Points:** 5

As a **freelance video producer**, I want **access to proven email templates**, So that **I can quickly start campaigns for different services**.

**Acceptance Criteria:**

- Templates available: Social Media Content Upgrade, Product Demo Video, Customer Testimonial Collection, Event Coverage, About Us/Team Introduction Video, Seasonal/Holiday Campaigns
- Each template includes: Sample structure, value proposition examples, personalization hooks to look for, when to use this template
- Template preview before selection
- Select template during campaign creation

**Dependencies:** E1.1 (Campaign Creation)

---

### Story E10.2: Custom Template Creation

**Story Points:** 5

As a **freelance video producer**, I want **to create my own templates**, So that **I can reuse successful approaches**.

**Acceptance Criteria:**

- "Create Custom Template" feature in settings
- Template fields: Name, description, value proposition structure, personalization guidance, prompt hints for AI
- Save to personal library
- Edit and delete custom templates
- Clone existing templates (pre-built or custom)

**Dependencies:** E10.1 (Template Library)

---

### Story E10.3: Template Performance Tracking

**Story Points:** 3

As a **freelance video producer**, I want **to see which templates perform best**, So that **I can focus on what works**.

**Acceptance Criteria:**

- Track response rate per template
- Display in analytics: Template performance comparison
- Suggest best-performing template for new campaigns
- A/B test templates

**Dependencies:** E8.2 (Analytics), E10.1 (Templates)

---

## Epic E11: Social Media Deep Integration

**Priority:** P2 (Enhancement)  
**Status:** Not Started  
**Estimated Story Points:** 21  
**Dependencies:** E3 (Research Engine)  
**Requirements Covered:** FR11

**Epic Goal:** Replace web scraping with direct API integrations for Instagram, LinkedIn, and Facebook for more reliable and richer data.

**Success Criteria:**

- Instagram Business API integrated (posts, stories, metrics)
- LinkedIn Company API integrated (posts, updates, employee count)
- Facebook Pages API integrated
- Enriched research profiles with social metrics
- Visual preview of referenced posts in review UI

### Story E11.1: Instagram Business API Integration

**Story Points:** 8

As a **research engine**, I want **to use Instagram Business API**, So that **I get reliable access to Instagram data**.

**Acceptance Criteria:**

- OAuth connection for Instagram Business accounts
- Fetch recent posts (last 30 days) with captions, images, likes, comments
- Fetch Stories if accessible
- Fetch profile metrics: follower count, growth rate
- Store in structured format
- Fallback to web scraping if API unavailable

**Dependencies:** E3.3 (Social Scanning)

---

### Story E11.2: LinkedIn Company API Integration

**Story Points:** 8

As a **research engine**, I want **to use LinkedIn Company API**, So that **I get official company data**.

**Acceptance Criteria:**

- OAuth connection for LinkedIn API access (requires API approval)
- Fetch recent company posts and updates
- Fetch employee count and changes
- Fetch company description and industry
- Store in structured format
- Fallback to web scraping if API unavailable or restricted

**Dependencies:** E3.3 (Social Scanning)

---

### Story E11.3: Facebook Pages API Integration

**Story Points:** 5

As a **research engine**, I want **to use Facebook Pages API**, So that **I get official page data**.

**Acceptance Criteria:**

- OAuth connection for Facebook Pages API
- Fetch recent posts from public pages
- Fetch page info and metrics
- Store in structured format
- Fallback to web scraping if API unavailable

**Dependencies:** E3.3 (Social Scanning)

---

## Epic E12: CRM Integration

**Priority:** P3 (Future Enhancement)  
**Status:** Not Started  
**Estimated Story Points:** 21  
**Dependencies:** E8 (Analytics), E7 (Response Tracking)  
**Requirements Covered:** FR12

**Epic Goal:** Enable bidirectional sync with popular CRMs (HubSpot, Pipedrive) for unified pipeline management.

**Success Criteria:**

- Prospects sync to CRM as contacts/leads
- Meeting outcomes sync to CRM
- CRM data can be imported to ProspectFlow
- Real-time or scheduled sync

### Story E12.1: HubSpot Integration

**Story Points:** 13

As a **freelance video producer**, I want **to sync ProspectFlow with HubSpot**, So that **all my leads are in one place**.

**Acceptance Criteria:**

- OAuth connection to HubSpot
- Sync prospects → HubSpot contacts
- Sync sent emails → HubSpot email activities
- Sync meetings booked → HubSpot deals
- Bidirectional sync: changes in HubSpot reflected in ProspectFlow
- Conflict resolution strategy

**Dependencies:** E7 (Responses), E8 (Meetings)

---

### Story E12.2: Pipedrive Integration

**Story Points:** 8

As a **freelance video producer**, I want **to sync ProspectFlow with Pipedrive**, So that **my pipeline is up to date**.

**Acceptance Criteria:**

- OAuth connection to Pipedrive
- Sync prospects → Pipedrive leads/persons
- Sync meetings → Pipedrive activities and deals
- Bidirectional sync
- Conflict resolution strategy

**Dependencies:** E7 (Responses), E8 (Meetings)

---

## Epic E13: A/B Testing Framework

**Priority:** P3 (Future Enhancement)  
**Status:** Not Started  
**Estimated Story Points:** 21  
**Dependencies:** E8 (Analytics)  
**Requirements Covered:** FR13

**Epic Goal:** Enable built-in A/B testing for email elements (subject lines, CTAs, structures) with statistical significance tracking.

**Success Criteria:**

- A/B test configuration per campaign (test subject lines, email structure, CTAs)
- Traffic split (50/50 or custom)
- Statistical significance calculation
- Winner declared when significant
- Automatic rollout of winner option

### Story E13.1: A/B Test Configuration

**Story Points:** 8

As a **freelance video producer**, I want **to A/B test email elements**, So that **I can optimize for better response rates**.

**Acceptance Criteria:**

- Enable A/B testing on campaign
- Configure test variants: Variant A (control), Variant B (test)
- Test dimensions: Subject line, email structure, CTA wording, personalization approach
- Traffic split: 50/50 or custom (e.g., 70/30)
- Minimum sample size: 50 emails per variant

**Dependencies:** E1.3 (Campaign Configuration)

---

### Story E13.2: Variant Draft Generation

**Story Points:** 5

As a **system**, I want **to generate drafts for each variant**, So that **prospects receive different versions**.

**Acceptance Criteria:**

- AI generates both variants based on different prompts
- Variant assignment stored per prospect
- Review interface shows variant indicator
- Both variants must be approved before sending

**Dependencies:** E4 (AI Draft Generation)

---

### Story E13.3: Statistical Significance Tracking

**Story Points:** 5

As a **system**, I want **to calculate statistical significance**, So that **we know when a variant is truly better**.

**Acceptance Criteria:**

- Track response rate per variant
- Calculate p-value using chi-squared test or similar
- Declare winner when p < 0.05 (95% confidence)
- Display significance indicator in dashboard
- Alert user when test concludes

**Dependencies:** E8.1 (Metrics Calculation)

---

### Story E13.4: Automatic Winner Rollout

**Story Points:** 3

As a **system**, I want **to automatically use the winning variant**, So that **future emails benefit from learnings**.

**Acceptance Criteria:**

- When winner declared, automatically use winning variant for remaining prospects
- Update campaign template with winning approach
- Summarize test results for user
- Allow manual override if desired

**Dependencies:** E13.3 (Significance Tracking)

---

## Appendix: Cross-Epic Dependencies

```
E0 (Foundation)
  ├── E1 (Campaign Management)
  │     └── E2 (Prospect Import)
  │           └── E3 (Research Engine)
  │                 ├── E4 (AI Draft Generation)
  │                 │     └── E5 (Review & Approval)
  │                 │           └── E6 (Gmail Integration & Sending)
  │                 │                 ├── E7 (Response Tracking)
  │                 │                 │     └── E8 (Analytics Dashboard)
  │                 │                 │           ├── E12 (CRM Integration)
  │                 │                 │           └── E13 (A/B Testing)
  │                 │                 └── E9 (Follow-up Automation)
  │                 ├── E10 (Template Library)
  │                 └── E11 (Social Media Deep Integration)
```

---

## Definition of Done (Project-wide)

For each user story to be considered "Done":

**Development:**

- [ ] Code implemented and peer-reviewed
- [ ] Unit tests written and passing (>70% coverage for business logic)
- [ ] Integration tests for API endpoints
- [ ] Code follows TypeScript style guide (ESLint passing)
- [ ] No critical security vulnerabilities (Snyk scan passing)

**Testing:**

- [ ] Manual testing completed
- [ ] Edge cases tested
- [ ] Error scenarios tested
- [ ] Performance requirements met
- [ ] Cross-browser compatibility verified (Chrome, Firefox, Safari)
- [ ] Mobile responsiveness checked

**Documentation:**

- [ ] API endpoints documented (OpenAPI/Swagger)
- [ ] User-facing features documented in help center
- [ ] Code comments for complex logic
- [ ] README updated if needed

**Deployment:**

- [ ] Deployed to staging environment
- [ ] Smoke tests passing in staging
- [ ] Product owner approval
- [ ] Deployed to production (or feature-flagged)
- [ ] Monitoring alerts configured
- [ ] Rollback plan documented

**User Experience:**

- [ ] UX review completed
- [ ] Accessibility requirements met (WCAG 2.1 Level AA)
- [ ] Keyboard navigation working
- [ ] Loading states and error messages user-friendly

---

## Summary Statistics

**Total Epics:** 14  
**Total User Stories:** 78 (detailed breakdown by epic)  
**Estimated Total Story Points:** 284

**Priority Breakdown:**

- **P0 (MVP):** 7 epics, 144 story points (E0-E6)
- **P1 (Post-MVP):** 2 epics, 42 story points (E7-E8)
- **P2 (Enhancement):** 3 epics, 55 story points (E9-E11)
- **P3 (Future):** 2 epics, 42 story points (E12-E13)

**Estimated Timeline** (assuming 20 SP per 2-week sprint):

- MVP (P0): ~7-8 sprints (14-16 weeks, ~3.5-4 months)
- Post-MVP (P1): ~2 sprints (4 weeks, ~1 month)
- Enhancements (P2): ~3 sprints (6 weeks, ~1.5 months)
- Future Features (P3): ~2 sprints (4 weeks, ~1 month)

**Total Project Duration:** 8-9 months for full feature set

---

## Next Steps

1. **Review & Refine:** Team review of all user stories for clarity and completeness
2. **Prioritization:** Confirm epic prioritization with stakeholders
3. **Sprint Planning:** Break P0 epics into Sprint 0-3 (as outlined in sprint-status.yaml)
4. **Story Estimation:** Team estimation session (planning poker) for accurate story points
5. **Acceptance Criteria Refinement:** Detailed refinement during sprint planning
6. **Technical Spike Stories:** Identify and create spike stories for unknowns (e.g., Instagram API access feasibility)

---

**Document Status:** ✅ Complete  
**Generated by:** [CS] Create Story Workflow  
**Last Updated:** 2025-01-XX  
**Version:** 1.0
