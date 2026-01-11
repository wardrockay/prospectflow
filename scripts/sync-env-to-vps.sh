#!/bin/bash

# Sync .env files to VPS
# Usage: ./scripts/sync-env-to-vps.sh

set -e

# VPS Configuration
VPS_ALIAS="vps"
VPS_PATH="~/starlightcoder/prospectflow"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}╔═══════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC}     🔐 ProspectFlow ENV Sync to VPS           ${CYAN}║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════╝${NC}"
echo ""

# Find all .env files (excluding .env.example)
mapfile -t ENV_FILES_ARRAY < <(find . -type f -name ".env*" ! -name "*.example" ! -path "*/node_modules/*" ! -path "*/.git/*" 2>/dev/null)

if [ ${#ENV_FILES_ARRAY[@]} -eq 0 ]; then
    echo -e "${YELLOW}⚠️  No .env files found locally${NC}"
    echo ""
    echo "Expected locations:"
    echo "  - infra/postgres/.env"
    echo "  - infra/redis/.env"
    echo "  - infra/rabbitmq/.env"
    echo "  - infra/clickhouse/.env"
    echo "  - apps/ingest-api/.env or apps/ingest-api/env/.env.*"
    echo "  - apps/ui-web/.env"
    echo ""
    exit 1
fi

echo -e "${BLUE}📋 Found ${#ENV_FILES_ARRAY[@]} .env file(s):${NC}"
for file in "${ENV_FILES_ARRAY[@]}"; do
    echo "  → $file"
done
echo ""

# Confirm before syncing
if [ -t 0 ]; then
    # Running interactively (terminal attached)
    read -p "Sync these files to ${VPS_ALIAS}? [Y/n] " confirm
    if [ "$confirm" = "n" ] || [ "$confirm" = "N" ]; then
        echo "Cancelled."
        exit 0
    fi
else
    # Running non-interactively (from Makefile automation)
    echo "Auto-syncing (non-interactive mode)..."
fi

echo ""
echo -e "${YELLOW}🚀 Starting sync...${NC}"
echo ""

# Test SSH connection first
echo -e "${BLUE}Testing SSH connection to ${VPS_ALIAS}...${NC}"
if ! ssh -o ConnectTimeout=10 "${VPS_ALIAS}" "echo 'Connection OK'" 2>&1 | grep -q "Connection OK"; then
    echo -e "${RED}❌ Cannot connect to VPS${NC}"
    echo ""
    echo "Please ensure:"
    echo "  1. The VPS is reachable"
    echo "  2. Your SSH config is correct: ssh ${VPS_ALIAS}"
    echo "  3. Check your ~/.ssh/config file"
    echo ""
    exit 1
fi
echo -e "${GREEN}✅ SSH connection OK${NC}"
echo ""

# Sync each .env file
success_count=0
fail_count=0

for file in "${ENV_FILES_ARRAY[@]}"; do
    if [ -n "$file" ]; then
        # Remove leading ./
        clean_path="${file#./}"
        
        echo -e "${BLUE}📤 Syncing ${clean_path}...${NC}"
        
        # Create remote directory if it doesn't exist
        remote_dir=$(dirname "$clean_path")
        ssh "${VPS_ALIAS}" "mkdir -p ${VPS_PATH}/${remote_dir}" 2>/dev/null
        
        # Copy the file
        if rsync -avz --progress "$file" "${VPS_ALIAS}:${VPS_PATH}/${clean_path}"; then
            echo -e "${GREEN}✅ ${clean_path} synced${NC}"
            ((success_count++))
        else
            echo -e "${RED}❌ Failed to sync ${clean_path}${NC}"
            ((fail_count++))
        fi
        echo ""
    fi
done

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Sync complete!${NC}"
echo ""
echo -e "📊 Summary:"
echo -e "  ${GREEN}✓${NC} Synced files: ${success_count}"
if [ $fail_count -gt 0 ]; then
    echo -e "  ${RED}✗${NC} Failed files: ${fail_count}"
fi
echo ""
echo -e "${YELLOW}💡 Next steps on VPS:${NC}"
echo -e "  ssh ${VPS_ALIAS}"
echo -e "  cd ${VPS_PATH}"
echo -e "  make prod-up"
echo ""
