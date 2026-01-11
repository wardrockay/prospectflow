.PHONY: help dev-up dev-wait dev-ready dev-down dev-logs dev-status dev-restart test-ready test-unit test-integration clean dashboard
.PHONY: prod-up prod-down prod-restart prod-logs service-restart service-stop service-logs health
.PHONY: sync-env vps-connect

# Default target
help:
	@echo "ProspectFlow Development & Production Environment"
	@echo "================================================="
	@echo ""
	@echo "🔧 DEVELOPMENT:"
	@echo "  make dev-up            - Start all infrastructure services"
	@echo "  make dev-wait          - Wait for all services to be healthy"
	@echo "  make dev-ready         - Start services and wait for health checks"
	@echo "  make dev-down          - Stop all services"
	@echo "  make dev-restart       - Restart all services"
	@echo "  make dev-logs          - Show logs from all services"
	@echo "  make dev-status        - Show status of all services"
	@echo ""
	@echo "🚀 PRODUCTION (VPS):"
	@echo "  make prod-up           - Start entire production environment"
	@echo "  make prod-down         - Stop entire production environment"
	@echo "  make prod-restart      - Restart entire production environment"
	@echo "  make prod-logs         - Show production logs"
	@echo ""
	@echo "🔄 SERVICE MANAGEMENT (Interactive menu):"
	@echo "  make service-restart   - Interactive: select service(s) to restart"
	@echo "  make service-stop      - Interactive: select service(s) to stop"
	@echo "  make service-logs      - Interactive: select service to view logs"
	@echo "  Or use: make service-restart SERVICE=<name> for direct restart"
	@echo ""
	@echo "🔐 VPS DEPLOYMENT:"
	@echo "  make sync-env          - Sync all .env files to VPS"
	@echo "  make vps-connect       - SSH connect to VPS"
	@echo ""
	@echo "💚 HEALTH CHECK:"
	@echo "  make health            - Show health status of all services"
	@echo ""
	@echo "🧪 TESTING:"
	@echo "  make test-ready        - Ensure environment is ready for integration tests"
	@echo "  make test-unit         - Run unit tests (no infrastructure needed)"
	@echo "  make test-integration  - Run integration tests (requires dev environment)"
	@echo ""
	@echo "🛠️  OTHER:"
	@echo "  make dashboard         - Launch Sprint Dashboard UI"
	@echo "  make clean             - Remove all containers, volumes, and networks"
	@echo ""

# Start all infrastructure services
dev-up:
	@echo "🚀 Starting PostgreSQL..."
	@cd infra/postgres && docker compose up -d
	@echo "🚀 Starting RabbitMQ..."
	@cd infra/rabbitmq && docker compose up -d
	@echo "🚀 Starting Redis..."
	@cd infra/redis && docker compose up -d
	@echo "🚀 Starting ClickHouse..."
	@cd infra/clickhouse && docker compose up -d
	@echo "✅ All services started"

# Wait for all services to be healthy
dev-wait:
	@echo "⏳ Waiting for services to be healthy..."
	@./scripts/wait-for-services.sh

# Start and wait for services (combined)
dev-ready: dev-up dev-wait
	@echo "✅ Development environment is ready!"

# Stop all services
dev-down:
	@echo "🛑 Stopping all services..."
	@cd infra/clickhouse && docker compose down
	@cd infra/redis && docker compose down
	@cd infra/rabbitmq && docker compose down
	@cd infra/postgres && docker compose down
	@echo "✅ All services stopped"

# Restart all services
dev-restart: dev-down dev-ready

# Show logs from all services
dev-logs:
	@echo "📜 Showing logs (Ctrl+C to exit)..."
	@docker compose -f infra/postgres/docker compose.yaml \
		-f infra/rabbitmq/docker compose.yaml \
		-f infra/redis/docker compose.yaml \
		-f infra/clickhouse/docker compose.yaml \
		logs -f

# Show status of all services
dev-status:
	@echo "📊 Service Status:"
	@echo ""
	@echo "PostgreSQL:"
	@docker ps --filter "name=prospectflow-postgres" --format "  {{.Names}}: {{.Status}}"
	@echo ""
	@echo "RabbitMQ:"
	@docker ps --filter "name=rabbitmq" --format "  {{.Names}}: {{.Status}}"
	@echo ""
	@echo "Redis:"
	@docker ps --filter "name=prospectflow-redis" --format "  {{.Names}}: {{.Status}}"
	@echo ""
	@echo "ClickHouse:"
	@docker ps --filter "name=clickhouse-server" --format "  {{.Names}}: {{.Status}}"
	@echo ""

# Ensure environment is ready for integration tests
test-ready: dev-ready
	@echo "✅ Environment ready for integration tests"

# Run unit tests (no infrastructure required)
test-unit:
	@echo "🧪 Running unit tests..."
	@cd apps/ingest-api && pnpm test --run tests/unit

# Run integration tests (requires dev environment)
test-integration: dev-ready
	@echo "🧪 Running integration tests with real infrastructure..."
	@echo "📊 Redis: localhost:6379"
	@echo "📊 PostgreSQL: localhost:5432"
	@echo "📊 RabbitMQ: localhost:5672"
	@echo ""
	@cd apps/ingest-api && pnpm test --run tests/integration tests/security

# Launch Sprint Dashboard UI
dashboard:
	@echo "🚀 Lancement du Sprint Dashboard sur http://localhost:8080/tools/sprint-dashboard/"
	@echo "📊 Appuyez sur Ctrl+C pour arrêter"
	@npx http-server -p 8080 -c-1 -o /tools/sprint-dashboard/

# Clean up everything (containers, volumes, networks)
clean:
	@echo "🧹 Cleaning up all containers, volumes, and networks..."
	@cd infra/postgres && docker compose down -v
	@cd infra/rabbitmq && docker compose down -v
	@cd infra/redis && docker compose down -v
	@cd infra/clickhouse && docker compose down -v
	@echo "✅ Cleanup complete"

# ============================================
# PRODUCTION COMMANDS (VPS)
# ============================================

# Create Docker network if it doesn't exist
network-create:
	@docker network inspect prospectflow-network >/dev/null 2>&1 || docker network create prospectflow-network
	@echo "✅ Network prospectflow-network ready"

# Start entire production environment
prod-up: network-create
	@echo "🚀 Starting Production Environment..."
	@echo ""
	@echo "� Syncing .env files first..."
	@./scripts/sync-env-to-vps.sh || true
	@echo ""
	@echo "�📦 Starting Infrastructure..."
	@cd infra/postgres && docker compose up -d
	@cd infra/rabbitmq && docker compose up -d
	@cd infra/redis && docker compose up -d
	@cd infra/clickhouse && docker compose up -d
	@echo "⏳ Waiting for infrastructure to be ready..."
	@sleep 10
	@echo ""
	@echo "🌐 Starting Applications..."
	@cd apps/ingest-api && docker compose up -d
	@cd apps/ui-web && docker compose up -d
	@echo ""
	@echo "✅ Production environment started!"
	@echo "📊 Run 'make health' to check service status"

# Stop entire production environment
prod-down:
	@echo "🛑 Stopping Production Environment..."
	@echo ""
	@echo "🌐 Stopping Applications..."
	@-cd apps/ui-web && docker compose down
	@-cd apps/ingest-api && docker compose down
	@echo ""
	@echo "📦 Stopping Infrastructure..."
	@-cd infra/clickhouse && docker compose down
	@-cd infra/redis && docker compose down
	@-cd infra/rabbitmq && docker compose down
	@-cd infra/postgres && docker compose down
	@echo ""
	@echo "✅ Production environment stopped"

# Restart entire production environment
prod-restart: prod-down prod-up

# Show production logs
prod-logs:
	@echo "📜 Production Logs (Ctrl+C to exit)..."
	@docker logs -f --tail=100 $$(docker ps -q --filter "name=prospectflow")

# ============================================
# SERVICE MANAGEMENT
# ============================================

# Service paths mapping
SERVICE_PATH_postgres = infra/postgres
SERVICE_PATH_rabbitmq = infra/rabbitmq
SERVICE_PATH_redis = infra/redis
SERVICE_PATH_clickhouse = infra/clickhouse
SERVICE_PATH_ingest-api = apps/ingest-api
SERVICE_PATH_ui-web = apps/ui-web

# Interactive service restart (shows selection menu)
service-restart:
ifdef SERVICE
	@echo "🔄 Syncing .env files first..."
	@./scripts/sync-env-to-vps.sh || true
	@echo ""
	@echo "🔄 Restarting service: $(SERVICE)..."
ifeq ($(SERVICE),ingest-api)
	@cd $(SERVICE_PATH_$(SERVICE)) && pnpm run deploy
else ifeq ($(SERVICE),ui-web)
	@cd $(SERVICE_PATH_$(SERVICE)) && pnpm run deploy
else
	@cd $(SERVICE_PATH_$(SERVICE)) && docker compose down && docker compose up -d --build
endif
	@echo "✅ Service $(SERVICE) restarted"
else
	@echo "🔄 Syncing .env files first..."
	@./scripts/sync-env-to-vps.sh || true
	@echo ""
	@./scripts/service-selector.sh restart
endif

# Interactive service stop (shows selection menu)
service-stop:
ifdef SERVICE
	@echo "🛑 Stopping service: $(SERVICE)..."
	@cd $(SERVICE_PATH_$(SERVICE)) && docker compose down
	@echo "✅ Service $(SERVICE) stopped"
else
	@./scripts/service-selector.sh stop
endif

# Show logs for a specific service (interactive if no SERVICE specified)
service-logs:
ifdef SERVICE
	@echo "📜 Logs for $(SERVICE) (Ctrl+C to exit)..."
	@cd $(SERVICE_PATH_$(SERVICE)) && docker compose logs -f --tail=100
else
	@echo ""
	@echo "📋 Available services:"
	@echo "  [1] postgres      [2] rabbitmq"
	@echo "  [3] redis         [4] clickhouse"
	@echo "  [5] ingest-api    [6] ui-web"
	@echo ""
	@read -p "Select service (1-6): " choice; \
	case $$choice in \
		1) SERVICE=postgres ;; \
		2) SERVICE=rabbitmq ;; \
		3) SERVICE=redis ;; \
		4) SERVICE=clickhouse ;; \
		5) SERVICE=ingest-api ;; \
		6) SERVICE=ui-web ;; \
		*) echo "Invalid choice"; exit 1 ;; \
	esac; \
	echo ""; \
	echo "📜 Logs for $$SERVICE (Ctrl+C to exit)..."; \
	cd $(SERVICE_PATH_$$SERVICE) && docker compose logs -f --tail=100
endif

# ============================================
# HEALTH CHECK
# ============================================

# Show health status of all services
health:
	@echo ""
	@echo "💚 ProspectFlow Health Check"
	@echo "============================"
	@echo ""
	@echo "📦 INFRASTRUCTURE:"
	@echo ""
	@echo "PostgreSQL:"
	@docker ps --filter "name=prospectflow-postgres" --format "  Status: {{.Status}}" 2>/dev/null || echo "  ❌ Not running"
	@docker exec prospectflow-postgres pg_isready -U prospectflow 2>/dev/null && echo "  ✅ Database accepting connections" || echo "  ⚠️  Database not ready"
	@echo ""
	@echo "RabbitMQ:"
	@docker ps --filter "name=rabbitmq" --format "  Status: {{.Status}}" 2>/dev/null || echo "  ❌ Not running"
	@docker exec prospectflow-rabbitmq rabbitmq-diagnostics check_running 2>/dev/null && echo "  ✅ RabbitMQ healthy" || echo "  ⚠️  RabbitMQ not ready"
	@echo ""
	@echo "Redis:"
	@docker ps --filter "name=prospectflow-redis" --format "  Status: {{.Status}}" 2>/dev/null || echo "  ❌ Not running"
	@docker exec prospectflow-redis redis-cli ping 2>/dev/null | grep -q PONG && echo "  ✅ Redis responding" || echo "  ⚠️  Redis not ready"
	@echo ""
	@echo "ClickHouse:"
	@docker ps --filter "name=clickhouse-server" --format "  Status: {{.Status}}" 2>/dev/null || echo "  ❌ Not running"
	@docker exec clickhouse-server clickhouse-client --query "SELECT 1" 2>/dev/null && echo "  ✅ ClickHouse healthy" || echo "  ⚠️  ClickHouse not ready"
	@echo ""
	@echo "🌐 APPLICATIONS:"
	@echo ""
	@echo "Ingest API:"
	@docker ps --filter "name=prospectflow-ingest-api" --format "  Status: {{.Status}}" 2>/dev/null || echo "  ❌ Not running"
	@curl -sf http://localhost:3000/health 2>/dev/null && echo "  ✅ API responding" || echo "  ⚠️  API not responding (or no /health endpoint)"
	@echo ""
	@echo "UI Web:"
	@docker ps --filter "name=prospectflow-ui-web" --format "  Status: {{.Status}}" 2>/dev/null || echo "  ❌ Not running"
	@curl -sf http://localhost:4000 2>/dev/null && echo "  ✅ UI responding" || echo "  ⚠️  UI not responding"
	@echo ""
	@echo "============================"
	@echo ""

# ============================================
# VPS DEPLOYMENT
# ============================================

# VPS Configuration (uses SSH config alias)
VPS_ALIAS = vps
VPS_PATH = ~/starlightcoder/prospectflow

# Sync .env files to VPS
sync-env:
	@./scripts/sync-env-to-vps.sh

# Connect to VPS via SSH
vps-connect:
	@echo "🔐 Connecting to VPS..."
	@ssh $(VPS_ALIAS)

# Deploy to VPS (sync env + restart services)
vps-deploy: sync-env
	@echo ""
	@echo "🚀 Deploying to VPS..."
	@ssh $(VPS_ALIAS) "cd $(VPS_PATH) && git pull && make prod-restart"
	@echo "✅ Deployment complete!"
