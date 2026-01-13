#!/bin/bash

# Service selector script for ProspectFlow
# Supports multi-selection with fzf or fallback to numbered menu

declare -A SERVICE_PATHS=(
    ["postgres"]="infra/postgres"
    ["rabbitmq"]="infra/rabbitmq"
    ["redis"]="infra/redis"
    ["clickhouse"]="infra/clickhouse"
    ["nginx"]="infra/nginx"
    ["prometheus"]="infra/prometheus"
    ["grafana"]="infra/grafana"
    ["ingest-api"]="apps/ingest-api"
    ["campaign-api"]="apps/campaign-api"
    ["ui-web"]="apps/ui-web"
)

SERVICES=("postgres" "rabbitmq" "redis" "clickhouse" "nginx" "prometheus" "grafana" "ingest-api" "campaign-api" "ui-web")

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

ACTION=${1:-restart}  # restart, logs, stop, or flyway

# Handle flyway as a standalone command (no service selection needed)
if [ "$ACTION" = "flyway" ]; then
    cd "$(dirname "$0")/.." || exit 1
    echo -e "${YELLOW}📦 Running Flyway migrations...${NC}"
    cd "infra/postgres" && docker compose up flyway
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Flyway migrations completed${NC}"
    else
        echo -e "${RED}❌ Flyway migrations failed${NC}"
    fi
    exit $?
fi

show_header() {
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}     🔧 ProspectFlow Service Manager       ${CYAN}║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
    echo ""
}

# Function to restart services
do_restart() {
    local service=$1
    local path=${SERVICE_PATHS[$service]}
    echo -e "${YELLOW}🔄 Restarting ${service}...${NC}"
    
    # For applications, use pnpm run deploy (includes tests and proper build)
    if [ "$service" = "ingest-api" ] || [ "$service" = "campaign-api" ] || [ "$service" = "ui-web" ]; then
        cd "$path" && pnpm run deploy
    else
        # For infrastructure services, use docker compose directly
        cd "$path" && docker compose down && docker compose up -d --build
    fi
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ ${service} restarted successfully${NC}"
    else
        echo -e "${RED}❌ Failed to restart ${service}${NC}"
    fi
    cd - > /dev/null
}

# Function to show logs
do_logs() {
    local service=$1
    local path=${SERVICE_PATHS[$service]}
    echo -e "${BLUE}📜 Showing logs for ${service}...${NC}"
    cd "$path" && docker compose logs -f --tail=100
}

# Function to stop services
do_stop() {
    local service=$1
    local path=${SERVICE_PATHS[$service]}
    echo -e "${YELLOW}🛑 Stopping ${service}...${NC}"
    cd "$path" && docker compose down
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ ${service} stopped${NC}"
    else
        echo -e "${RED}❌ Failed to stop ${service}${NC}"
    fi
    cd - > /dev/null
}

# Function to run Flyway migrations
do_flyway() {
    echo -e "${YELLOW}📦 Running Flyway migrations...${NC}"
    cd "infra/postgres" && docker compose up flyway
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Flyway migrations completed${NC}"
    else
        echo -e "${RED}❌ Flyway migrations failed${NC}"
    fi
    cd - > /dev/null
}

# Check if fzf is available
use_fzf() {
    command -v fzf &> /dev/null
}

# FZF-based selection (multi-select with Tab)
select_with_fzf() {
    show_header
    echo -e "${BLUE}Use Tab to select multiple services, Enter to confirm${NC}"
    echo ""
    
    selected=$(printf '%s\n' "${SERVICES[@]}" | fzf --multi \
        --height=15 \
        --border=rounded \
        --prompt="Select service(s) to ${ACTION}: " \
        --header="[Tab] Toggle selection  [Enter] Confirm  [Esc] Cancel" \
        --preview="docker ps --filter name=prospectflow-{} --format 'Status: {{.Status}}' 2>/dev/null || echo 'Not running'" \
        --preview-window=right:40%)
    
    echo "$selected"
}

# Fallback numbered menu
select_with_menu() {
    show_header
    echo -e "${BLUE}Select services to ${ACTION}:${NC}"
    echo -e "${YELLOW}(Enter numbers separated by spaces, or 'all' for all services)${NC}"
    echo ""
    
    for i in "${!SERVICES[@]}"; do
        # Get container status
        service=${SERVICES[$i]}
        status=$(docker ps --filter "name=prospectflow-${service}" --format "{{.Status}}" 2>/dev/null)
        if [ -n "$status" ]; then
            status_icon="${GREEN}●${NC}"
        else
            status_icon="${RED}○${NC}"
        fi
        printf "  ${status_icon} [%d] %s\n" $((i+1)) "${service}"
    done
    
    echo ""
    echo -e "  ${CYAN}[a] All services${NC}"
    echo -e "  ${CYAN}[q] Quit${NC}"
    echo ""
    read -p "Your choice: " choice
    
    if [ "$choice" = "q" ] || [ "$choice" = "Q" ]; then
        echo "Cancelled."
        exit 0
    fi
    
    if [ "$choice" = "a" ] || [ "$choice" = "A" ] || [ "$choice" = "all" ]; then
        printf '%s\n' "${SERVICES[@]}"
        return
    fi
    
    # Parse space-separated numbers
    selected_services=""
    for num in $choice; do
        if [[ "$num" =~ ^[0-9]+$ ]] && [ "$num" -ge 1 ] && [ "$num" -le ${#SERVICES[@]} ]; then
            index=$((num-1))
            if [ -n "$selected_services" ]; then
                selected_services="${selected_services}"$'\n'"${SERVICES[$index]}"
            else
                selected_services="${SERVICES[$index]}"
            fi
        fi
    done
    
    echo "$selected_services"
}

# Main execution
main() {
    cd "$(dirname "$0")/.." || exit 1
    
    # Select services
    if use_fzf; then
        selected=$(select_with_fzf)
    else
        selected=$(select_with_menu)
    fi
    
    if [ -z "$selected" ]; then
        echo -e "${YELLOW}No service selected. Exiting.${NC}"
        exit 0
    fi
    
    echo ""
    echo -e "${CYAN}Selected services:${NC}"
    echo "$selected" | while read -r svc; do
        echo -e "  → ${svc}"
    done
    echo ""
    
    # Confirm action
    read -p "Proceed with ${ACTION}? [Y/n] " confirm
    if [ "$confirm" = "n" ] || [ "$confirm" = "N" ]; then
        echo "Cancelled."
        exit 0
    fi
    
    echo ""
    
    # Execute action on each selected service
    echo "$selected" | while read -r service; do
        if [ -n "$service" ]; then
            case $ACTION in
                restart)
                    do_restart "$service"
                    ;;
                logs)
                    do_logs "$service"
                    break  # Only show logs for first service (can't show multiple at once)
                    ;;
                stop)
                    do_stop "$service"
                    ;;
                flyway)
                    do_flyway
                    break  # Flyway only runs once, not per service
                    ;;
            esac
            echo ""
        fi
    done
    
    echo -e "${GREEN}✅ Done!${NC}"
}

main
