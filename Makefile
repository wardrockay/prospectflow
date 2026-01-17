.PHONY: help dev-up dev-down dev-restart dev-logs health clean clear-docker
.PHONY: infra-only apps-only full-stack infra-restart apps-restart
.PHONY: prod-up prod-down prod-restart prod-logs
.PHONY: test-unit test-integration
.PHONY: service-restart service-stop service-logs db-migrate db-seed
.PHONY: sync-env vps-connect network-create
.PHONY: nginx-up nginx-down nginx-logs nginx-init-ssl nginx-renew-ssl nginx-reload nginx-test
.PHONY: monitoring-up monitoring-down prometheus-up prometheus-down grafana-up grafana-down monitoring-logs

# Default target
help:
	@echo "ProspectFlow Development & Production Environment"
	@echo "================================================="
	@echo ""
	@echo "🔧 DEVELOPMENT:"
	@echo "  make dev-up            - Start full dev environment (infra + apps with .env.dev)"
	@echo "  make dev-down          - Stop all dev services"
	@echo "  make dev-restart       - Restart all dev services"
	@echo "  make dev-logs          - Show logs from all services"
	@echo ""
	@echo "🎯 TIERED ORCHESTRATION:"
	@echo "  make infra-only        - Start infrastructure tier only"
	@echo "  make apps-only         - Start apps (APP_ENV=dev by default)"
	@echo "  make full-stack        - Start complete stack (infra + apps + monitoring)"
	@echo ""
	@echo "🚀 PRODUCTION (VPS):"
	@echo "  make prod-up           - Start prod environment (infra + apps with .env.production)"
	@echo "  make prod-down         - Stop prod environment"
	@echo "  make prod-restart      - Restart prod environment"
	@echo "  make prod-logs         - Show production logs"
	@echo ""
	@echo "🔄 SERVICE MANAGEMENT:"
	@echo "  make service-restart   - Restart a service (interactive or SERVICE=name)"
	@echo "  make service-stop      - Stop a service (interactive or SERVICE=name)"
	@echo "  make service-logs      - View service logs (interactive or SERVICE=name)"
	@echo "  make db-migrate        - Run database migrations"
	@echo ""
	@echo "🔐 VPS:"
	@echo "  make sync-env          - Sync .env files to VPS"
	@echo "  make vps-connect       - SSH to VPS"
	@echo ""
	@echo "🔒 NGINX & SSL:"
	@echo "  make nginx-up          - Start NGINX reverse proxy"
	@echo "  make nginx-down        - Stop NGINX"
	@echo "  make nginx-logs        - Show NGINX logs"
	@echo "  make nginx-init-ssl    - Initialize SSL certificate (first time)"
	@echo "  make nginx-renew-ssl   - Renew SSL certificate"
	@echo "  make nginx-reload      - Reload NGINX config"
	@echo "  make nginx-test        - Test NGINX config"
	@echo ""
	@echo "📈 MONITORING:"
	@echo "  make monitoring-up     - Start monitoring stack (Prometheus + Grafana)"
	@echo "  make monitoring-down   - Stop monitoring stack"
	@echo "  make prometheus-up     - Start Prometheus only"
	@echo "  make grafana-up        - Start Grafana only"
	@echo "  make monitoring-logs   - Show monitoring logs"
	@echo ""
	@echo "💚 HEALTH & TESTING:"
	@echo "  make health            - Show health status of all services"
	@echo "  make test-unit         - Run unit tests"
	@echo "  make test-integration  - Run integration tests"
	@echo ""
	@echo "🛠️  CLEANUP:"
	@echo "  make clean             - Remove all containers, volumes, networks"
	@echo "  make clear-docker      - Clean Docker cache and unused resources"
	@echo ""

# ============================================
# DEVELOPMENT
# ============================================

# Start full development environment (infra + apps with dev config)
dev-up: network-create
	@echo "🚀 Starting Development Environment (APP_ENV=dev)..."
	@echo ""
	@echo "📦 Starting Infrastructure..."
	@cd infra/postgres && APP_ENV=dev docker compose -p prospectflow-postgres up -d --wait
	@cd infra/rabbitmq && APP_ENV=dev docker compose -p prospectflow-rabbitmq up -d --wait
	@cd infra/redis && APP_ENV=dev docker compose -p prospectflow-redis up -d --wait
	@cd infra/clickhouse && APP_ENV=dev docker compose -p prospectflow-clickhouse up -d --wait
	@echo "⏳ Waiting for infrastructure..."
	@sleep 5
	@./scripts/wait-for-services.sh
	@echo ""
	@echo "🌐 Starting Applications (dev mode)..."
	@cd apps/ingest-api && APP_ENV=dev docker compose -p prospectflow-ingest-api up -d --wait
	@cd apps/campaign-api && APP_ENV=dev docker compose -p prospectflow-campaign-api up -d --wait
	@cd apps/ui-web && APP_ENV=dev docker compose -p prospectflow-ui-web up -d --wait
	@echo ""
	@echo "⏳ Waiting for applications..."
	@sleep 5
	@docker exec prospectflow-ingest-api curl -sf http://localhost:3000/health > /dev/null 2>&1 || (echo "Waiting for ingest-api..." && sleep 5)
	@docker exec prospectflow-campaign-api curl -sf http://localhost:3001/health > /dev/null 2>&1 || (echo "Waiting for campaign-api..." && sleep 5)
	@echo ""
	@echo "✅ Development environment ready!"
	@echo "📊 Run 'make health' to check service status"

# Stop all development services
dev-down:
	@echo "🛑 Stopping Development Environment..."
	@-cd apps/ui-web && docker compose -p prospectflow-ui-web down
	@-cd apps/campaign-api && docker compose -p prospectflow-campaign-api down
	@-cd apps/ingest-api && docker compose -p prospectflow-ingest-api down
	@-cd infra/clickhouse && docker compose -p prospectflow-clickhouse down
	@-cd infra/redis && docker compose -p prospectflow-redis down
	@-cd infra/rabbitmq && docker compose -p prospectflow-rabbitmq down
	@-cd infra/postgres && docker compose -p prospectflow-postgres down
	@echo "✅ Development environment stopped"

# Restart all dev services
dev-restart: dev-down dev-up

# Show all service logs
dev-logs:
	@echo "📜 Showing logs (Ctrl+C to exit)..."
	@docker logs -f --tail=50 prospectflow-ingest-api & \
	docker logs -f --tail=50 prospectflow-campaign-api & \
	docker logs -f --tail=50 prospectflow-ui-web & \
	docker logs -f --tail=50 prospectflow-postgres & \
	docker logs -f --tail=50 prospectflow-rabbitmq & \
	docker logs -f --tail=50 prospectflow-redis & \
	docker logs -f --tail=50 prospectflow-clickhouse

# ============================================
# TIERED ORCHESTRATION
# ============================================

# Start infrastructure tier only
# Usage: make infra-only [APP_ENV=dev|production]
infra-only: network-create
	@echo "🚀 Starting Infrastructure Tier (APP_ENV=$${APP_ENV:-dev})..."
	@cd infra/postgres && APP_ENV=$${APP_ENV:-dev} docker compose -p prospectflow-postgres up -d --wait
	@cd infra/rabbitmq && APP_ENV=$${APP_ENV:-dev} docker compose -p prospectflow-rabbitmq up -d --wait
	@cd infra/redis && APP_ENV=$${APP_ENV:-dev} docker compose -p prospectflow-redis up -d --wait
	@cd infra/clickhouse && APP_ENV=$${APP_ENV:-dev} docker compose -p prospectflow-clickhouse up -d --wait
	@echo "⏳ Waiting for infrastructure..."
	@./scripts/wait-for-services.sh
	@echo "✅ Infrastructure tier ready!"

# Start application tier only
# Usage: make apps-only [APP_ENV=dev|production]
apps-only:
	@echo "🚀 Starting Application Tier (APP_ENV=$${APP_ENV:-dev})..."
	@cd apps/ingest-api && APP_ENV=$${APP_ENV:-dev} docker compose -p prospectflow-ingest-api up -d --wait
	@cd apps/campaign-api && APP_ENV=$${APP_ENV:-dev} docker compose -p prospectflow-campaign-api up -d --wait
	@cd apps/ui-web && APP_ENV=$${APP_ENV:-dev} docker compose -p prospectflow-ui-web up -d --wait
	@echo "⏳ Waiting for applications..."
	@sleep 5
	@docker exec prospectflow-ingest-api curl -sf http://localhost:3000/health > /dev/null 2>&1 || echo "⚠️  ingest-api not ready yet"
	@docker exec prospectflow-campaign-api curl -sf http://localhost:3001/health > /dev/null 2>&1 || echo "⚠️  campaign-api not ready yet"
	@docker exec prospectflow-ui-web wget --no-verbose --tries=1 --spider http://localhost:3000/ > /dev/null 2>&1 || echo "⚠️  ui-web not ready yet"
	@echo "✅ Application tier started!"

# Start complete stack (infra + apps + monitoring)
full-stack: infra-only apps-only monitoring-up
	@echo ""
	@echo "🎉 Full stack ready!"
	@echo ""
	@echo "📊 Service URLs:"
	@echo "  • Ingest API:    http://localhost:3000"
	@echo "  • Campaign API:  http://localhost:3001"
	@echo "  • UI Web:        http://localhost:4000"
	@echo "  • PostgreSQL:    localhost:5432"
	@echo "  • RabbitMQ Mgmt: http://localhost:15672"
	@echo "  • Redis:         localhost:6379"
	@echo "  • Prometheus:    http://localhost:9090"
	@echo "  • Grafana:       http://localhost:3002"

# Restart infrastructure tier
infra-restart:
	@echo "🔄 Restarting Infrastructure..."
	@-cd apps/ui-web && docker compose -p prospectflow-ui-web down
	@-cd apps/campaign-api && docker compose -p prospectflow-campaign-api down
	@-cd apps/ingest-api && docker compose -p prospectflow-ingest-api down
	@-cd infra/clickhouse && docker compose -p prospectflow-clickhouse down
	@-cd infra/redis && docker compose -p prospectflow-redis down
	@-cd infra/rabbitmq && docker compose -p prospectflow-rabbitmq down
	@-cd infra/postgres && docker compose -p prospectflow-postgres down
	@$(MAKE) infra-only
	@echo "✅ Infrastructure restarted! Run 'make apps-only' to restart apps"

# Restart application tier
apps-restart:
	@echo "🔄 Restarting Applications..."
	@-cd apps/ui-web && docker compose -p prospectflow-ui-web down
	@-cd apps/campaign-api && docker compose -p prospectflow-campaign-api down
	@-cd apps/ingest-api && docker compose -p prospectflow-ingest-api down
	@$(MAKE) apps-only
	@echo "✅ Applications restarted!"

# ============================================
# PRODUCTION
# ============================================

# Create Docker network if it doesn't exist
network-create:
	@docker network inspect prospectflow-network >/dev/null 2>&1 || docker network create prospectflow-network

# Start production environment
prod-up: network-create
	@echo "🚀 Starting Production Environment (APP_ENV=production)..."
	@echo ""
	@echo "🔄 Syncing .env files..."
	@./scripts/sync-env-to-vps.sh || true
	@echo ""
	@echo "📦 Starting Infrastructure..."
	@cd infra/postgres && APP_ENV=dev docker compose -p prospectflow-postgres up -d --wait
	@cd infra/rabbitmq && APP_ENV=dev docker compose -p prospectflow-rabbitmq up -d --wait
	@cd infra/redis && APP_ENV=dev docker compose -p prospectflow-redis up -d --wait
	@cd infra/clickhouse && APP_ENV=dev docker compose -p prospectflow-clickhouse up -d --wait
	@echo "⏳ Waiting for infrastructure..."
	@sleep 10
	@echo ""
	@echo "🌐 Starting Applications (production mode)..."
	@cd apps/ingest-api && APP_ENV=production docker compose -p prospectflow-ingest-api up -d --wait
	@cd apps/campaign-api && APP_ENV=production docker compose -p prospectflow-campaign-api up -d --wait
	@cd apps/ui-web && APP_ENV=production docker compose -p prospectflow-ui-web up -d --wait
	@echo ""
	@echo "🔒 Starting Reverse Proxy..."
	@cd infra/nginx && docker compose -p prospectflow-nginx up -d --wait
	@echo ""
	@echo "✅ Production environment started!"
	@echo "🔗 Access at: https://app.lightandshutter.fr"
	@echo "📊 Run 'make health' to check status"

# Stop production environment
prod-down:
	@echo "🛑 Stopping Production Environment..."
	@-cd infra/nginx && docker compose -p prospectflow-nginx down
	@-cd apps/ui-web && docker compose -p prospectflow-ui-web down
	@-cd apps/campaign-api && docker compose -p prospectflow-campaign-api down
	@-cd apps/ingest-api && docker compose -p prospectflow-ingest-api down
	@-cd infra/clickhouse && docker compose -p prospectflow-clickhouse down
	@-cd infra/redis && docker compose -p prospectflow-redis down
	@-cd infra/rabbitmq && docker compose -p prospectflow-rabbitmq down
	@-cd infra/postgres && docker compose -p prospectflow-postgres down
	@echo "✅ Production environment stopped"

# Restart production environment
prod-restart: prod-down prod-up

# Show production logs
prod-logs:
	@echo "📜 Production Logs (Ctrl+C to exit)..."
	@docker logs -f --tail=100 $$(docker ps -q --filter "name=prospectflow")

# ============================================
# TESTING
# ============================================

# Run unit tests
test-unit:
	@echo "🧪 Running unit tests..."
	@cd apps/ingest-api && pnpm test --run tests/unit

# Run integration tests (requires dev environment)
test-integration: dev-up
	@echo "🧪 Running integration tests..."
	@cd apps/ingest-api && pnpm test --run tests/integration tests/security

# ============================================
# SERVICE MANAGEMENT
# ============================================

# Service paths mapping
SERVICE_PATH_postgres = infra/postgres
SERVICE_PATH_rabbitmq = infra/rabbitmq
SERVICE_PATH_redis = infra/redis
SERVICE_PATH_clickhouse = infra/clickhouse
SERVICE_PATH_nginx = infra/nginx
SERVICE_PATH_prometheus = infra/prometheus
SERVICE_PATH_grafana = infra/grafana
SERVICE_PATH_ingest-api = apps/ingest-api
SERVICE_PATH_campaign-api = apps/campaign-api
SERVICE_PATH_ui-web = apps/ui-web

# Restart a service
# Restart a service (interactive multi-select with fzf)
# Usage: make service-restart [SERVICE=ingest-api] [APP_ENV=dev|production]
service-restart:
ifdef SERVICE
	@echo "🔄 Restarting $(SERVICE) (APP_ENV=$${APP_ENV:-dev})..."
ifeq ($(SERVICE),ingest-api)
	@cd $(SERVICE_PATH_$(SERVICE)) && APP_ENV=$${APP_ENV:-dev} docker compose -p prospectflow-$(SERVICE) down && APP_ENV=$${APP_ENV:-dev} docker compose -p prospectflow-$(SERVICE) up -d --build --wait
else ifeq ($(SERVICE),campaign-api)
	@cd $(SERVICE_PATH_$(SERVICE)) && APP_ENV=$${APP_ENV:-dev} docker compose -p prospectflow-$(SERVICE) down && APP_ENV=$${APP_ENV:-dev} docker compose -p prospectflow-$(SERVICE) up -d --build --wait
else ifeq ($(SERVICE),ui-web)
	@cd $(SERVICE_PATH_$(SERVICE)) && APP_ENV=$${APP_ENV:-dev} docker compose -p prospectflow-$(SERVICE) down && APP_ENV=$${APP_ENV:-dev} docker compose -p prospectflow-$(SERVICE) up -d --build --wait
else
	@cd $(SERVICE_PATH_$(SERVICE)) && APP_ENV=$${APP_ENV:-dev} docker compose -p prospectflow-$(SERVICE) down && APP_ENV=$${APP_ENV:-dev} docker compose -p prospectflow-$(SERVICE) up -d --build --wait
endif
	@echo "✅ $(SERVICE) restarted"
else
	@./scripts/service-selector.sh restart $${APP_ENV:-dev}
endif

# Stop a service (interactive multi-select with fzf)
# Usage: make service-stop [SERVICE=ingest-api]
service-stop:
ifdef SERVICE
	@echo "🛑 Stopping $(SERVICE)..."
	@cd $(SERVICE_PATH_$(SERVICE)) && docker compose -p prospectflow-$(SERVICE) down
	@echo "✅ $(SERVICE) stopped"
else
	@./scripts/service-selector.sh stop
endif

# View service logs
service-logs:
ifdef SERVICE
	@echo "📜 Logs for $(SERVICE) (Ctrl+C to exit)..."
	@cd $(SERVICE_PATH_$(SERVICE)) && docker compose -p prospectflow-$(SERVICE) logs -f --tail=100
else
	@./scripts/service-selector.sh logs
endif

# Run database migrations
db-migrate:
	@echo "📦 Running database migrations..."
	@./scripts/service-selector.sh flyway

# Load test data into database
db-seed:
	@echo "🌱 Loading test data into database..."
	@docker exec -i prospectflow-postgres psql -U prospectflow -d prospectflow < infra/postgres/db/test-data.sql
	@echo "✅ Test data loaded successfully!"

# ============================================
# HEALTH CHECK
# ============================================

health:
	@echo ""
	@echo "💚 ProspectFlow Health Check"
	@echo "============================"
	@echo ""
	@echo "📦 INFRASTRUCTURE:"
	@echo ""
	@echo "PostgreSQL:"
	@docker ps --filter "name=prospectflow-postgres" --format "  Status: {{.Status}}" 2>/dev/null || echo "  ❌ Not running"
	@docker exec prospectflow-postgres pg_isready -U prospectflow 2>/dev/null && echo "  ✅ Database ready" || echo "  ⚠️  Not ready"
	@echo ""
	@echo "RabbitMQ:"
	@docker ps --filter "name=prospectflow-rabbitmq" --format "  Status: {{.Status}}" 2>/dev/null || echo "  ❌ Not running"
	@docker exec prospectflow-rabbitmq rabbitmq-diagnostics ping 2>/dev/null && echo "  ✅ Ready" || echo "  ⚠️  Not ready"
	@echo ""
	@echo "Redis:"
	@docker ps --filter "name=prospectflow-redis" --format "  Status: {{.Status}}" 2>/dev/null || echo "  ❌ Not running"
	@docker exec prospectflow-redis redis-cli ping 2>/dev/null && echo "  ✅ Ready" || echo "  ⚠️  Not ready"
	@echo ""
	@echo "ClickHouse:"
	@docker ps --filter "name=prospectflow-clickhouse" --format "  Status: {{.Status}}" 2>/dev/null || echo "  ❌ Not running"
	@docker exec prospectflow-clickhouse clickhouse-client --query "SELECT 1" 2>/dev/null && echo "  ✅ Ready" || echo "  ⚠️  Not ready"
	@echo ""
	@echo "🌐 APPLICATIONS:"
	@echo ""
	@echo "Ingest API:"
	@docker ps --filter "name=prospectflow-ingest-api" --format "  Status: {{.Status}}" 2>/dev/null || echo "  ❌ Not running"
	@curl -sf http://localhost:3000/health 2>/dev/null && echo "  ✅ Healthy" || echo "  ⚠️  Not responding"
	@echo ""
	@echo "Campaign API:"
	@docker ps --filter "name=prospectflow-campaign-api" --format "  Status: {{.Status}}" 2>/dev/null || echo "  ❌ Not running"
	@curl -sf http://localhost:3001/health 2>/dev/null && echo "  ✅ Healthy" || echo "  ⚠️  Not responding"
	@echo ""
	@echo "UI Web:"
	@docker ps --filter "name=prospectflow-ui-web" --format "  Status: {{.Status}}" 2>/dev/null || echo "  ❌ Not running"
	@curl -sf http://localhost:4000 2>/dev/null && echo "  ✅ Responding" || echo "  ⚠️  Not responding"
	@echo ""

# ============================================
# VPS
# ============================================

# Sync .env files to VPS
sync-env:
	@./scripts/sync-env-to-vps.sh

# Connect to VPS
vps-connect:
	@echo "🔐 Connecting to VPS..."
	@ssh vps

# ============================================
# NGINX & SSL
# ============================================

nginx-up: network-create
	@echo "🚀 Starting NGINX..."
	@cd infra/nginx && docker compose -p prospectflow-nginx up -d --wait
	@echo "✅ NGINX started"

nginx-down:
	@echo "🛑 Stopping NGINX..."
	@-cd infra/nginx && docker compose -p prospectflow-nginx down
	@echo "✅ NGINX stopped"

nginx-logs:
	@docker logs -f --tail=100 prospectflow-nginx

nginx-init-ssl:
	@echo "🔐 Initializing SSL certificate..."
	@cd infra/nginx && ./scripts/init-letsencrypt.sh

nginx-renew-ssl:
	@echo "🔄 Renewing SSL certificate..."
	@cd infra/nginx && ./scripts/renew-certs.sh

nginx-reload:
	@docker exec prospectflow-nginx nginx -s reload
	@echo "✅ NGINX config reloaded"

nginx-test:
	@docker exec prospectflow-nginx nginx -t

# ============================================
# MONITORING
# ============================================

monitoring-up: prometheus-up grafana-up
	@echo ""
	@echo "✅ Monitoring stack started!"
	@echo "📊 Prometheus: http://localhost:9090"
	@echo "📈 Grafana: http://localhost:3002"

monitoring-down: grafana-down prometheus-down
	@echo "✅ Monitoring stopped"

prometheus-up: network-create
	@echo "🚀 Starting Prometheus..."
	@cd infra/prometheus && docker compose -p prospectflow-prometheus up -d --wait
	@echo "✅ Prometheus: http://localhost:9090"

prometheus-down:
	@-cd infra/prometheus && docker compose -p prospectflow-prometheus down

grafana-up: network-create
	@echo "🚀 Starting Grafana..."
	@cd infra/grafana && docker compose -p prospectflow-grafana up -d --wait
	@echo "✅ Grafana: http://localhost:3002 (admin/admin)"

grafana-down:
	@-cd infra/grafana && docker compose -p prospectflow-grafana down

monitoring-logs:
	@echo "📜 Monitoring Logs (Ctrl+C to exit)..."
	@echo ""
	@echo "📋 Select: [1] Prometheus  [2] Grafana  [3] All"
	@read -p "Select (1-3): " choice; \
	case $$choice in \
		1) docker logs -f --tail=100 prospectflow-prometheus ;; \
		2) docker logs -f --tail=100 prospectflow-grafana ;; \
		3) docker logs -f --tail=50 prospectflow-prometheus & docker logs -f --tail=50 prospectflow-grafana ;; \
		*) echo "❌ Invalid"; exit 1 ;; \
	esac

# ============================================
# CLEANUP
# ============================================

clean:
	@echo "🧹 Cleaning up..."
	@-cd infra/postgres && docker compose -p prospectflow-postgres down -v
	@-cd infra/rabbitmq && docker compose -p prospectflow-rabbitmq down -v
	@-cd infra/redis && docker compose -p prospectflow-redis down -v
	@-cd infra/clickhouse && docker compose -p prospectflow-clickhouse down -v
	@-cd apps/ingest-api && docker compose -p prospectflow-ingest-api down -v
	@-cd apps/campaign-api && docker compose -p prospectflow-campaign-api down -v
	@-cd apps/ui-web && docker compose -p prospectflow-ui-web down -v
	@echo "✅ Cleanup complete"

clear-docker:
	@./tools/clear-docker.sh
	@echo "✅ Docker cache cleared"
