.PHONY: help dev-up dev-wait dev-ready dev-down dev-logs dev-status dev-restart test-ready test-unit test-integration clean dashboard

# Default target
help:
	@echo "ProspectFlow Development Environment"
	@echo "===================================="
	@echo ""
	@echo "Available targets:"
	@echo "  make dev-up            - Start all infrastructure services"
	@echo "  make dev-wait          - Wait for all services to be healthy"
	@echo "  make dev-ready         - Start services and wait for health checks"
	@echo "  make dev-down          - Stop all services"
	@echo "  make dev-restart       - Restart all services"
	@echo "  make dev-logs          - Show logs from all services"
	@echo "  make dev-status        - Show status of all services"
	@echo "  make test-ready        - Ensure environment is ready for integration tests"
	@echo "  make test-unit         - Run unit tests (no infrastructure needed)"
	@echo "  make test-integration  - Run integration tests (requires dev environment)"
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
