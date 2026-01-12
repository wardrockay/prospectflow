#!/bin/bash
# ============================================================================
# renew-certs.sh - Manual certificate renewal for ProspectFlow
# ============================================================================
#
# This script manually triggers certificate renewal.
# Normally, the certbot container handles this automatically every 12 hours.
#
# Use this script if:
#   - You need to force an immediate renewal
#   - Troubleshooting renewal issues
#   - Testing renewal before it's due
#
# Usage:
#   ./scripts/renew-certs.sh [--dry-run] [--force]
#
#   Options:
#     --dry-run    Test renewal without making changes
#     --force      Force renewal even if certificate is not expiring
#
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NGINX_DIR="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Parse arguments
DRY_RUN=""
FORCE=""
for arg in "$@"; do
    case $arg in
        --dry-run)
            DRY_RUN="--dry-run"
            echo -e "${YELLOW}🧪 Running in DRY-RUN mode${NC}"
            ;;
        --force)
            FORCE="--force-renewal"
            echo -e "${YELLOW}⚠️  Forcing renewal${NC}"
            ;;
    esac
done

echo ""
echo "============================================"
echo "🔄 ProspectFlow Certificate Renewal"
echo "============================================"
echo ""

cd "$NGINX_DIR"

# Check if certbot container is running
if ! docker ps | grep -q "prospectflow-certbot"; then
    echo "Starting certbot container..."
    docker compose up -d certbot
    sleep 2
fi

# Run renewal
echo "🔐 Checking/renewing certificates..."
echo ""

docker compose run --rm certbot renew \
    --webroot \
    -w /var/www/certbot \
    $DRY_RUN \
    $FORCE

RENEWAL_EXIT=$?

if [[ $RENEWAL_EXIT -eq 0 ]]; then
    echo ""
    echo -e "${GREEN}✅ Renewal check completed successfully${NC}"
    
    if [[ -z "$DRY_RUN" ]]; then
        # Reload nginx to pick up new certificate
        echo ""
        echo "🔄 Reloading NGINX..."
        docker exec prospectflow-nginx nginx -s reload
        echo -e "${GREEN}✅ NGINX reloaded${NC}"
    fi
else
    echo ""
    echo -e "${RED}❌ Renewal failed (exit code: $RENEWAL_EXIT)${NC}"
    exit $RENEWAL_EXIT
fi

echo ""
echo "============================================"
echo ""

# Show certificate info
echo "📋 Current certificate status:"
docker compose run --rm certbot certificates
