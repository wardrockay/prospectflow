#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
MAX_WAIT=60
INTERVAL=2

# Function to check PostgreSQL
check_postgres() {
    docker exec prospectflow-postgres pg_isready -U prospectflow -d prospectflow > /dev/null 2>&1
    return $?
}

# Function to check RabbitMQ
check_rabbitmq() {
    docker exec rabbitmq rabbitmq-diagnostics ping > /dev/null 2>&1
    return $?
}

# Function to check Redis
check_redis() {
    docker exec prospectflow-redis redis-cli --raw incr ping > /dev/null 2>&1
    return $?
}

# Function to check ClickHouse
check_clickhouse() {
    docker exec clickhouse-server clickhouse-client --query "SELECT 1" > /dev/null 2>&1
    return $?
}

# Function to wait for a service
wait_for_service() {
    local service_name=$1
    local check_function=$2
    local elapsed=0
    
    echo -n "Waiting for ${service_name}..."
    
    while [ $elapsed -lt $MAX_WAIT ]; do
        if $check_function; then
            echo -e " ${GREEN}✓${NC}"
            return 0
        fi
        
        echo -n "."
        sleep $INTERVAL
        elapsed=$((elapsed + INTERVAL))
    done
    
    echo -e " ${RED}✗ (timeout after ${MAX_WAIT}s)${NC}"
    return 1
}

# Main execution
echo ""
echo "Checking service health..."
echo "=========================="

failed_services=()

# Check PostgreSQL
if ! wait_for_service "PostgreSQL" check_postgres; then
    failed_services+=("PostgreSQL")
fi

# Check RabbitMQ
if ! wait_for_service "RabbitMQ" check_rabbitmq; then
    failed_services+=("RabbitMQ")
fi

# Check Redis
if ! wait_for_service "Redis" check_redis; then
    failed_services+=("Redis")
fi

# Check ClickHouse
if ! wait_for_service "ClickHouse" check_clickhouse; then
    failed_services+=("ClickHouse")
fi

echo ""

# Report results
if [ ${#failed_services[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ All services are healthy and ready!${NC}"
    exit 0
else
    echo -e "${RED}❌ The following services failed to start:${NC}"
    for service in "${failed_services[@]}"; do
        echo -e "${RED}  - $service${NC}"
    done
    echo ""
    echo -e "${YELLOW}Tip: Check logs with 'make dev-logs'${NC}"
    exit 1
fi
