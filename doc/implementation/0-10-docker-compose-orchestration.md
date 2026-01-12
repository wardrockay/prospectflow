# Story 0.10: Docker Compose Orchestration Enhancement

**Epic**: 0 - Sprint 0: Foundation Infrastructure  
**Story ID**: 0.10  
**Story Points**: 3  
**Status**: review  
**Dependencies**: Story 0.1 (Database), Story 0.3 (RabbitMQ), Story 0.8 (Monitoring)  
**Created**: 2026-01-12  
**Assignee**: Dev Agent / Tolliam (Code Review)

---

## Story Overview

### User Story

**As a** DevOps engineer  
**I want** improved Makefile orchestration with standardized Docker Compose files  
**So that** the entire stack can be deployed consistently with modular, maintainable configuration

### Business Context

Currently, services have individual docker-compose files in `infra/*/` with a Makefile wrapper. This approach is **correct and should be maintained** - but needs standardization and enhancement:

- **Keep** compose files separated by concern (infrastructure, apps, monitoring)
- **Enhance** Makefile with intelligent orchestration logic
- **Standardize** networks, volumes, and health checks across all compose files
- **Ensure** correct service startup order via Makefile dependencies
- **Simplify** onboarding with clear, documented Makefile targets

**Why NOT a monolithic root compose file?**

- ✅ Separation of concerns (dev can work on API without launching monitoring)
- ✅ Reduced merge conflicts (teams work on separate files)
- ✅ Modular testing (test just DB without full stack)
- ✅ Clearer ownership (each service owns its compose file)
- ✅ Smaller, focused files vs one 500+ line monolith

### Technical Context

**Current State**:

- PostgreSQL, RabbitMQ, Redis, ClickHouse have individual compose files in `infra/*/`
- Makefile provides wrapper commands (`make dev-up`, `make prod-up`)
- Some inconsistencies in network names, health checks, restart policies
- Monitoring services recently added (Story 0.8)
- No application-level compose files for ingest-api or ui-web

**Target State**:

- **Keep** separate compose files per service/concern
- **Enhance** Makefile with better orchestration targets
- **Standardize** networks (`prospectflow-network` as external), volumes, naming conventions
- **Add** missing health checks and standardize intervals
- **Create** application compose files for dev environment
- **Document** startup order and service relationships
- **Improve** dev workflow with smarter targets (infra-only, apps-only, full-stack)

**Stack Components**:

1. **Infrastructure** (Tier 1): PostgreSQL, RabbitMQ, Redis, ClickHouse
2. **Applications** (Tier 2): Ingest API, UI Web
3. **Monitoring** (Tier 3 - optional): Prometheus, Grafana, Alertmanager
4. **Reverse Proxy** (Production only): NGINX

---

## Acceptance Criteria

### AC1: Standardized Network Configuration

**Given** all compose files exist in their respective directories  
**When** services are started via Makefile targets  
**Then** all compose files should use the same network:

- Network name: `prospectflow-network`
- Driver: `bridge`
- External: `true` (created once, shared by all)

**And** Makefile should create network if not exists (`make network-create`)  
**And** all services should connect to this network  
**And** services should communicate via container names (DNS resolution)

### AC2: Standardized Health Checks

**Given** each service has a docker-compose.yaml  
**When** the compose file is reviewed  
**Then** it should include health check configuration:

- PostgreSQL: `pg_isready -U prospectflow`
- RabbitMQ: `rabbitmq-diagnostics ping`
- Redis: `redis-cli ping`
- ClickHouse: `clickhouse-client --query "SELECT 1"`
- Ingest API: `curl -f http://localhost:3000/health || exit 1`
- Prometheus: `wget --spider -q http://localhost:9090/-/healthy || exit 1`
- Grafana: `curl -f http://localhost:3000/api/health || exit 1`
- Alertmanager: `wget --spider -q http://localhost:9093/-/healthy || exit 1`

**And** health check intervals should be appropriate (5s for infra, 10s for apps, 30s for monitoring)  
**And** all health checks should have timeout, retries, and start_period configured  
**And** restart policy should be `unless-stopped` for all services

### AC3: Enhanced Makefile Orchestration

**Given** the enhanced Makefile is implemented  
**When** `make dev-up` is run  
**Then** it should:

1. Create network if not exists (`make network-create`)
2. Start infrastructure in parallel (postgres, rabbitmq, redis, clickhouse)
3. Wait for all infrastructure health checks (`scripts/wait-for-services.sh`)
4. Start application services (ingest-api, ui-web)
5. Report status of all services

**And** `make full-stack` should additionally start monitoring  
**And** `make infra-only` should start just infrastructure  
**And** `make apps-only` should start just applications (assumes infra running)  
**And** `make monitoring-up` should start just monitoring stack  
**And** each target should be idempotent (safe to run multiple times)

### AC4: Service Startup Order Documentation

**Given** the orchestration is implemented  
**When** reviewing documentation  
**Then** it should clearly document startup dependencies:

**Tier 1 - Infrastructure** (parallel start, no dependencies):

- PostgreSQL
- RabbitMQ
- Redis
- ClickHouse

**Tier 2 - Applications** (start after Tier 1 healthy):

- Ingest API (requires: postgres, redis, rabbitmq)
- UI Web (requires: ingest-api)

**Tier 3 - Monitoring** (optional, can start anytime):

- Prometheus
- Grafana
- Alertmanager

**And** documentation should include troubleshooting for common startup issues  
**And** each service's health check command should be documented

### AC5: Development Workflow Validation

**Given** a fresh development environment  
**When** following the setup workflow  
**Then** these commands should work successfully:

```bash
# Fresh start
make clean              # Remove all containers, volumes
make network-create     # Create shared network
make dev-up             # Start infrastructure + apps
make dev-status         # Show health of all services
make dev-logs           # Stream logs from all services

# Selective operations
make infra-only         # Just infrastructure
make apps-only          # Just applications
make monitoring-up      # Just monitoring

# Service management
make service-restart SERVICE=postgres
make service-restart SERVICE=ingest-api
make apps-restart       # Restart all apps
make infra-restart      # Restart infrastructure

# Full stack
make full-stack         # Everything including monitoring
```

**And** all services should be healthy within 30 seconds  
**And** `make health` should report all services as healthy  
**And** integration tests should pass (`make test-integration`)

---

## Dev Notes

### Project Structure Alignment

This story **enhances** the existing modular Docker orchestration structure:

```
prospectflow/
├── Makefile                         # ✅ Enhanced with better orchestration
├── scripts/
│   └── wait-for-services.sh         # ✅ Already exists, may enhance
├── infra/
│   ├── postgres/docker-compose.yaml # ✅ Standardize network/health
│   ├── rabbitmq/docker-compose.yaml # ✅ Standardize network/health
│   ├── redis/docker-compose.yaml    # ✅ Standardize network/health
│   ├── clickhouse/docker-compose.yaml # ✅ Standardize network/health
│   ├── prometheus/docker-compose.yaml # ✅ Add health check
│   ├── grafana/docker-compose.yaml  # ✅ Add health check
│   └── nginx/docker-compose.yaml    # ✅ Already good
└── apps/
    ├── ingest-api/
    │   ├── Dockerfile               # ✅ Multi-stage build
    │   ├── docker-compose.yaml      # 🆕 For dev environment
    │   └── docker-compose.test.yaml # ✅ For integration tests
    └── ui-web/
        ├── Dockerfile               # ✅ Multi-stage build
        └── docker-compose.yaml      # 🆕 For dev environment
```

**Strategy**: Keep compose files separated by concern, use Makefile to orchestrate startup order and dependencies. Each compose file is self-contained but uses shared external network.

**Architecture Decision**: Makefile orchestration is "boring technology" that works - no need for complex tooling.

### Architecture Compliance

**From [Architecture Documentation]**: Multi-tenant architecture with strict tenant isolation

- All database queries MUST include `organisation_id`
- Authentication required for all API endpoints
- Structured logging with Pino (JSON format)
- Prometheus metrics at `/metrics` endpoint

**Network Isolation**:

- Single Docker network: `prospectflow-network` (external, shared)
- Services communicate via container name (DNS resolution)
- External access only via NGINX reverse proxy in production

**Security**:

- Environment variables for all secrets
- No hardcoded credentials in compose files
- Use Docker secrets for production deployment
- Non-root users in container images

### Library & Framework Requirements

**Docker Compose Version**: 3.8 (minimum)

- Requires Docker Engine 19.03.0+
- Supports health checks, external networks
- Resource limits and restart policies

**Container Image Strategies**:

- PostgreSQL: `postgres:18-alpine`
- RabbitMQ: `rabbitmq:3-management-alpine`
- Redis: `redis:7-alpine`
- ClickHouse: `clickhouse/clickhouse-server:latest`
- Node.js apps: Multi-stage builds from `node:20-alpine`
- Prometheus: `prom/prometheus:latest`
- Grafana: `grafana/grafana:latest`

### File Structure Requirements

**Standardized Compose File Pattern** (apply to all services):

```yaml
version: '3.8'

# Use external network (created by Makefile)
networks:
  prospectflow-network:
    external: true

# Local volumes for this service only
volumes:
  service_data:

services:
  service-name:
    image: image:tag
    container_name: prospectflow-service-name
    environment:
      # Environment variables
    volumes:
      - service_data:/data/path
    networks:
      - prospectflow-network
    ports:
      - 'port:port'
    healthcheck:
      test: ['CMD-SHELL', 'health-check-command']
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 10s
    restart: unless-stopped
```

**Example: Standardized PostgreSQL** (`infra/postgres/docker-compose.yaml`):

```yaml
version: '3.8'

networks:
  prospectflow-network:
    external: true

volumes:
  postgres_data:

services:
  postgres:
    image: postgres:18-alpine
    container_name: prospectflow-postgres
    environment:
      POSTGRES_DB: prospectflow
      POSTGRES_USER: prospectflow
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-change_me_in_prod}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-db.sql:/docker-entrypoint-initdb.d/init-db.sql:ro
    networks:
      - prospectflow-network
    ports:
      - '5432:5432'
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U prospectflow']
      interval: 5s
      timeout: 5s
      retries: 5
      start_period: 10s
    restart: unless-stopped
```

**Example: Application Service** (`apps/ingest-api/docker-compose.yaml`):

```yaml
version: '3.8'

networks:
  prospectflow-network:
    external: true

services:
  ingest-api:
    build:
      context: .
      dockerfile: Dockerfile
      target: development # or runtime for prod
    container_name: prospectflow-ingest-api
    environment:
      NODE_ENV: development
      POSTGRES_HOST: prospectflow-postgres
      REDIS_HOST: prospectflow-redis
      RABBITMQ_HOST: prospectflow-rabbitmq
    volumes:
      - ./src:/app/src:ro # Hot reload in dev
      - ./env/.env:/app/.env:ro
    networks:
      - prospectflow-network
    ports:
      - '3000:3000'
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3000/health']
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 30s
    restart: unless-stopped
    # Note: depends_on handled by Makefile orchestration
```

**Enhanced Makefile Targets**:

```makefile
# Network management
network-create:
	@docker network inspect prospectflow-network >/dev/null 2>&1 || \
		docker network create prospectflow-network
	@echo "✅ Network prospectflow-network ready"

# Tiered startup
infra-only: network-create
	@echo "🚀 Starting infrastructure tier..."
	@cd infra/postgres && docker compose up -d
	@cd infra/rabbitmq && docker compose up -d
	@cd infra/redis && docker compose up -d
	@cd infra/clickhouse && docker compose up -d
	@./scripts/wait-for-services.sh postgres rabbitmq redis clickhouse
	@echo "✅ Infrastructure ready"

apps-only:
	@echo "🚀 Starting application tier..."
	@cd apps/ingest-api && docker compose up -d
	@cd apps/ui-web && docker compose up -d
	@./scripts/wait-for-services.sh ingest-api ui-web
	@echo "✅ Applications ready"

monitoring-up:
	@echo "🚀 Starting monitoring tier..."
	@cd infra/prometheus && docker compose up -d
	@cd infra/grafana && docker compose up -d
	@echo "✅ Monitoring ready"

dev-up: network-create infra-only apps-only
	@echo "✅ Development environment ready!"

full-stack: dev-up monitoring-up
	@echo "✅ Full stack ready!"

# Health check
health:
	@echo "📊 Service Health Status:"
	@docker ps --filter "name=prospectflow" --format "table {{.Names}}\t{{.Status}}"
```

### Testing Requirements

**Unit Tests**: No changes required (already use `docker-compose.test.yaml`)

**Integration Tests**:

- Existing `apps/ingest-api/docker-compose.test.yaml` stays for isolated testing
- Enhanced Makefile targets enable full-stack testing
- Makefile targets remain: `make test-unit`, `make test-integration`

**Smoke Tests**:

```bash
# Verify all services are healthy
docker ps --filter "name=prospectflow" --filter "status=running"

# Test API health endpoint
curl http://localhost:3000/health

# Test UI is serving
curl http://localhost:4000

# Check network connectivity
docker exec prospectflow-ingest-api ping -c 1 prospectflow-postgres
```

### Previous Story Intelligence

**Story 0.8 (Prometheus Metrics & Grafana)** recently completed:

- Prometheus, Grafana, Alertmanager now have docker-compose files in `infra/`
- Metrics exposed at `/metrics` endpoint on Ingest API
- Grafana dashboards created for system monitoring
- **Learning**: Monitoring services should be optional in dev, required in prod
- **Action**: Add health checks to monitoring compose files

**Story 0.9 (NGINX Reverse Proxy with SSL)** completed:

- NGINX configured with Let's Encrypt SSL for `app.lightandshutter.fr`
- Certificate renewal automated via Certbot service
- Volumes for SSL certificates and ACME challenges
- **Learning**: NGINX should only run in production (not needed in dev)
- **Action**: Keep NGINX separate, not part of dev-up

**Common Patterns Established**:

- Alpine-based images for smaller size
- Health checks with 5-10 second intervals
- `restart: unless-stopped` for resilience
- Consistent environment variable naming
- Pino structured logging in JSON format
- Multi-tenant isolation with `organisation_id`
- Container names follow `prospectflow-*` pattern

### Latest Technical Information

**Docker Compose Specification**: v3.8 (2022)

- Supports external networks (created separately)
- Health checks with start_period for slow-starting services
- Restart policies for resilience

**Best Practices (2026)**:

- Use named volumes for data persistence
- External networks for cross-compose communication
- Implement graceful shutdown (SIGTERM handling)
- Log to stdout/stderr for container log aggregation
- Use multi-stage builds to reduce image size
- Health checks prevent premature traffic routing

**Makefile Orchestration Benefits**:

- Clear, documented commands
- Easy to understand workflow
- No additional tooling required
- Flexible target composition
- Works everywhere (Windows, Mac, Linux)

**Security Hardening**:

- Run containers as non-root user (add USER directive in Dockerfiles)
- Scan images for vulnerabilities (`docker scan` or Trivy)
- Use specific image tags, not `latest`
- Limit container capabilities when possible

---

## Tasks / Subtasks

### Phase 1: Network Standardization (0.5 Story Points)

**Task 1.1**: Create shared network

- [x] **Subtask 1.1.1**: Add `network-create` target to Makefile
- [x] **Subtask 1.1.2**: Create `prospectflow-network` as external bridge network
- [x] **Subtask 1.1.3**: Make network creation idempotent (skip if exists)
- [x] **Subtask 1.1.4**: Update all compose files to use external network

**Task 1.2**: Standardize infrastructure compose files

- [x] **Subtask 1.2.1**: Update postgres/docker-compose.yaml to use external network
- [x] **Subtask 1.2.2**: Update rabbitmq/docker-compose.yaml to use external network
- [x] **Subtask 1.2.3**: Update redis/docker-compose.yaml to use external network
- [x] **Subtask 1.2.4**: Update clickhouse/docker-compose.yaml to use external network
- [x] **Subtask 1.2.5**: Verify all health checks are present and consistent

### Phase 2: Health Check Enhancement (0.5 Story Points)

**Task 2.1**: Add missing health checks

- [x] **Subtask 2.1.1**: Add health check to Prometheus compose file
- [x] **Subtask 2.1.2**: Add health check to Grafana compose file
- [x] **Subtask 2.1.3**: Add health check to Alertmanager compose file (if exists)
- [x] **Subtask 2.1.4**: Standardize intervals (5s infra, 10s apps, 30s monitoring)
- [x] **Subtask 2.1.5**: Add start_period to all health checks (10-30s)

**Task 2.2**: Create application compose files

- [x] **Subtask 2.2.1**: Create apps/ingest-api/docker-compose.yaml
- [x] **Subtask 2.2.2**: Create apps/ui-web/docker-compose.yaml
- [x] **Subtask 2.2.3**: Configure health checks for both apps
- [x] **Subtask 2.2.4**: Add volume mounts for hot-reload in development
- [x] **Subtask 2.2.5**: Configure environment variables via .env files

### Phase 3: Makefile Orchestration Enhancement (1 Story Point)

**Task 3.1**: Enhance dev-up with proper orchestration

- [x] **Subtask 3.1.1**: Update `dev-up` to create network first
- [x] **Subtask 3.1.2**: Start infrastructure in parallel (postgres, rabbitmq, redis, clickhouse)
- [x] **Subtask 3.1.3**: Enhance wait-for-services.sh to check all health checks
- [x] **Subtask 3.1.4**: Start apps only after infrastructure healthy
- [x] **Subtask 3.1.5**: Report startup status after each tier

**Task 3.2**: Add intelligent orchestration targets

- [x] **Subtask 3.2.1**: Add `make infra-only` (just infrastructure)
- [x] **Subtask 3.2.2**: Add `make apps-only` (assumes infra running)
- [x] **Subtask 3.2.3**: Add `make full-stack` (infra + apps + monitoring)
- [x] **Subtask 3.2.4**: Add `make health` (check all services health status)
- [x] **Subtask 3.2.5**: Update help documentation with new targets

**Task 3.3**: Improve service management targets

- [x] **Subtask 3.3.1**: Enhance `service-restart` to handle dependencies
- [x] **Subtask 3.3.2**: Add `make apps-restart` (restart all apps, keep infra)
- [x] **Subtask 3.3.3**: Add `make infra-restart` (restart infrastructure)
- [x] **Subtask 3.3.4**: Ensure all targets are idempotent

### Phase 4: Testing & Documentation (1 Story Point)

**Task 4.1**: Verify standardization compliance

- [x] **Subtask 4.1.1**: Audit all compose files use external network
- [x] **Subtask 4.1.2**: Verify all services have health checks
- [x] **Subtask 4.1.3**: Check all container names follow `prospectflow-*` pattern
- [x] **Subtask 4.1.4**: Verify restart policies are consistent

**Task 4.2**: Test orchestration workflow

- [x] **Subtask 4.2.1**: Clean environment (`make clean`)
- [x] **Subtask 4.2.2**: Create network (`make network-create`)
- [x] **Subtask 4.2.3**: Start infra only (`make infra-only`)
- [x] **Subtask 4.2.4**: Verify all infra healthy (`make health`)
- [x] **Subtask 4.2.5**: Start apps (`make apps-only`)
- [x] **Subtask 4.2.6**: Verify all apps healthy
- [x] **Subtask 4.2.7**: Test full stack (`make full-stack`)

**Task 4.3**: Test service management

- [x] **Subtask 4.3.1**: Test individual service restart
- [x] **Subtask 4.3.2**: Test apps-restart (keeps infra running)
- [x] **Subtask 4.3.3**: Test infra-restart (stops apps first)
- [x] **Subtask 4.3.4**: Verify hot-reload works for API
- [x] **Subtask 4.3.5**: Run integration tests (`make test-integration`)

**Task 4.4**: Update documentation

- [x] **Subtask 4.4.1**: Update README.md with new Makefile targets
- [x] **Subtask 4.4.2**: Document startup order and dependencies diagram
- [x] **Subtask 4.4.3**: Add troubleshooting section for common issues
- [x] **Subtask 4.4.4**: Update [project-context.md](../project-context.md#deployment--infrastructure)
- [x] **Subtask 4.4.5**: Document standardized compose file pattern

---

## References

### Technical Details Sources

- **[Project Context](../project-context.md)**: Deployment commands, infrastructure components, health checks
- **[Story 0.1](../_archive/0-1-multi-tenant-postgresql-database-setup.md)**: PostgreSQL configuration, health checks
- **[Story 0.3](../_archive/0-3-rabbitmq-message-queue-configuration.md)**: RabbitMQ setup, queue definitions
- **[Story 0.8 Git Commits]**: Prometheus/Grafana configuration (commit: 1eab4f5)
- **[Story 0.9](../_archive/0-9-nginx-reverse-proxy-ssl-setup.md)**: NGINX reverse proxy, SSL volume mounts
- **[Makefile](../../Makefile)**: Existing orchestration commands, service naming conventions
- **[Epic E0 - Story 0.9](../planning/epics/epics.md#story-e09-docker-compose-orchestration)**: Original requirements

### Docker Best Practices

- [Docker Compose Specification v3.8](https://docs.docker.com/compose/compose-file/compose-file-v3/)
- [External Networks in Compose](https://docs.docker.com/compose/networking/#use-a-pre-existing-network)
- [Docker Health Check Best Practices](https://docs.docker.com/engine/reference/builder/#healthcheck)
- [Production-Ready Compose Files](https://docs.docker.com/compose/production/)

### Architecture Patterns

- Multi-tenant isolation: All services must respect `organisation_id` filtering
- Structured logging: Pino JSON format for all applications
- Metrics exposure: Prometheus `/metrics` endpoint on all services
- Health checks: `/health` endpoint returning 200 OK with service status
- Makefile orchestration: Boring technology that works

---

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 via GitHub Copilot

### Debug Log References

N/A - No debugging required

### Completion Notes List

**Implementation Summary:**

1. **Network Standardization (Phase 1)**:

   - Target `network-create` already existed in Makefile
   - Updated ClickHouse docker-compose.yaml to use external `prospectflow-network` instead of `clickhouse-network`
   - Postgres, RabbitMQ, Redis already used external network
   - All infrastructure services now share single Docker network for seamless communication

2. **Health Check Enhancement (Phase 2)**:

   - Standardized health check intervals across all services:
     - Infrastructure (postgres, redis, rabbitmq, clickhouse): 5s interval
     - Applications (ingest-api, ui-web): 10s interval
     - Monitoring (prometheus, grafana, alertmanager): 30s interval
   - Added `start_period` to all health checks (10-30s based on service startup time)
   - Added health checks to Prometheus, Grafana, and Alertmanager
   - Updated RabbitMQ health check from `status` to `ping` command
   - Added `curl` to ingest-api Dockerfile for health checks
   - Application compose files already existed and were updated with health checks

3. **Makefile Orchestration (Phase 3)**:

   - Added new tiered orchestration targets:
     - `make infra-only`: Start infrastructure tier only
     - `make apps-only`: Start application tier only (assumes infra running)
     - `make full-stack`: Start complete stack (infra + apps + monitoring)
     - `make apps-restart`: Restart applications while keeping infrastructure running
     - `make infra-restart`: Restart infrastructure (stops apps first)
   - Enhanced help menu with new tiered orchestration section
   - Updated `wait-for-services.sh` to use RabbitMQ `ping` instead of `status`
   - Improved `make health` commands for RabbitMQ and Redis

4. **Testing & Documentation (Phase 4)**:
   - Tested network creation: ✅ Network created successfully
   - Tested `infra-only`: ✅ All infrastructure services healthy
   - Tested `apps-only`: ✅ Applications started and healthy
   - Tested `apps-restart`: ✅ Applications restarted without affecting infrastructure
   - Fixed TypeScript compilation error by excluding `src/examples/` from tsconfig
   - Removed obsolete `version: '3.8'` from ui-web docker-compose.yaml
   - Updated README.md with tiered orchestration commands
   - Updated project-context.md deployment section with new Makefile targets
   - All services confirmed healthy via `make health`

**Key Decisions:**

- **Kept modular compose files**: Maintained existing architecture of separate compose files per service/concern instead of monolithic root file (aligns with story requirements)
- **External network pattern**: All services use `prospectflow-network` as external network, created once and shared
- **Health check standardization**: Used service-appropriate intervals and commands per Docker best practices
- **Backward compatibility**: Preserved existing `dev-up`, `dev-ready`, `dev-down` targets for compatibility

**Technical Highlights:**

- Container naming follows `prospectflow-*` convention
- All services have `restart: unless-stopped` policy
- Health checks include proper `start_period` for slow-starting services
- Makefile targets are idempotent (safe to run multiple times)
- Service startup order enforced through dependencies and health checks

### File List

**Files Modified**:

- [x] `infra/clickhouse/docker-compose.yaml` - Changed network to external prospectflow-network
- [x] `infra/postgres/docker-compose.yaml` - Standardized health check interval (10s→5s)
- [x] `infra/rabbitmq/docker-compose.yaml` - Changed health check to `ping`, standardized intervals
- [x] `infra/redis/docker-compose.yaml` - Standardized health check interval (10s→5s)
- [x] `infra/prometheus/docker-compose.yaml` - Added health checks for Prometheus and Alertmanager
- [x] `infra/grafana/docker-compose.yaml` - Added health check
- [x] `apps/ingest-api/docker-compose.yaml` - Added health check with 10s interval
- [x] `apps/ingest-api/Dockerfile` - Added curl for health checks
- [x] `apps/ingest-api/tsconfig.json` - Excluded examples folder from compilation
- [x] `apps/ui-web/docker-compose.yaml` - Added health check, removed obsolete version field
- [x] `Makefile` - Added infra-only, apps-only, full-stack, apps-restart, infra-restart targets
- [x] `scripts/wait-for-services.sh` - Updated RabbitMQ check to use `ping` command
- [x] `README.md` - Updated with tiered orchestration commands
- [x] `doc/project-context.md` - Updated deployment section with new Makefile targets

**Files Created**:

- None (all required files already existed)
