#!/bin/bash
# ============================================================================
# init-letsencrypt.sh - Initial SSL certificate provisioning for ProspectFlow
# ============================================================================
# 
# This script obtains the initial SSL certificate from Let's Encrypt.
# Run this ONCE on the VPS after deploying NGINX for the first time.
#
# Prerequisites:
#   - DNS A record for app.lightandshutter.fr pointing to VPS IP
#   - Port 80 open and accessible from internet
#   - Docker and docker compose installed
#
# Usage:
#   ./scripts/init-letsencrypt.sh [--staging]
#
#   Options:
#     --staging    Use Let's Encrypt staging environment (for testing)
#
# ============================================================================

set -e

# Configuration
DOMAIN="app.lightandshutter.fr"
EMAIL="admin@lightandshutter.fr"  # Change this to your email
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NGINX_DIR="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Parse arguments
STAGING_ARG=""
if [[ "$1" == "--staging" ]]; then
    STAGING_ARG="--staging"
    echo -e "${YELLOW}⚠️  Using Let's Encrypt STAGING environment${NC}"
    echo "   Certificates will NOT be valid for production"
    echo ""
fi

echo "============================================"
echo "🔐 ProspectFlow SSL Certificate Provisioning"
echo "============================================"
echo ""
echo "Domain: $DOMAIN"
echo "Email:  $EMAIL"
echo ""

# Check if certificate already exists
if [[ -f "$NGINX_DIR/certbot/conf/live/$DOMAIN/fullchain.pem" ]]; then
    echo -e "${YELLOW}⚠️  Certificate already exists for $DOMAIN${NC}"
    echo ""
    read -p "Do you want to force renewal? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
    FORCE_RENEWAL="--force-renewal"
else
    FORCE_RENEWAL=""
fi

# Step 1: Create required directories
echo "📁 Creating required directories..."
mkdir -p "$NGINX_DIR/certbot/conf"
mkdir -p "$NGINX_DIR/www/certbot"

# Step 2: Create temporary HTTP-only configuration
echo "📝 Setting up HTTP-only configuration for ACME challenge..."
if [[ -f "$NGINX_DIR/conf.d/app.conf" ]]; then
    cp "$NGINX_DIR/conf.d/app.conf" "$NGINX_DIR/conf.d/app.conf.backup"
fi
cp "$NGINX_DIR/conf.d/app.http-only.conf.template" "$NGINX_DIR/conf.d/app.conf"

# Step 3: Start nginx in HTTP-only mode
echo "🚀 Starting NGINX in HTTP-only mode..."
cd "$NGINX_DIR"

# Stop existing containers if running
docker compose down 2>/dev/null || true

# Start only nginx (not certbot yet)
docker compose up -d nginx

# Wait for nginx to start
echo "⏳ Waiting for NGINX to start..."
sleep 5

# Verify nginx is running
if ! docker ps | grep -q "prospectflow-nginx"; then
    echo -e "${RED}❌ NGINX failed to start${NC}"
    echo "Check logs with: docker logs prospectflow-nginx"
    exit 1
fi

# Step 4: Verify domain is accessible
echo "🔍 Verifying domain accessibility..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://$DOMAIN/.well-known/acme-challenge/test" 2>/dev/null || echo "000")

if [[ "$HTTP_CODE" == "000" ]]; then
    echo -e "${YELLOW}⚠️  Warning: Could not reach $DOMAIN from this machine${NC}"
    echo "   This might be normal if testing locally."
    echo "   Make sure DNS is properly configured."
    echo ""
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        # Restore original config
        if [[ -f "$NGINX_DIR/conf.d/app.conf.backup" ]]; then
            mv "$NGINX_DIR/conf.d/app.conf.backup" "$NGINX_DIR/conf.d/app.conf"
        fi
        docker compose down
        exit 1
    fi
fi

# Step 5: Request certificate from Let's Encrypt
echo ""
echo "🔐 Requesting certificate from Let's Encrypt..."
echo ""

docker compose run --rm certbot certonly \
    --webroot \
    -w /var/www/certbot \
    -d "$DOMAIN" \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    $STAGING_ARG \
    $FORCE_RENEWAL

# Check if certificate was obtained
if [[ ! -f "$NGINX_DIR/certbot/conf/live/$DOMAIN/fullchain.pem" ]]; then
    echo -e "${RED}❌ Certificate provisioning failed${NC}"
    echo "Check the output above for errors."
    # Restore original config
    if [[ -f "$NGINX_DIR/conf.d/app.conf.backup" ]]; then
        mv "$NGINX_DIR/conf.d/app.conf.backup" "$NGINX_DIR/conf.d/app.conf"
    fi
    exit 1
fi

echo -e "${GREEN}✅ Certificate obtained successfully!${NC}"

# Step 6: Restore full HTTPS configuration
echo ""
echo "📝 Restoring full HTTPS configuration..."
if [[ -f "$NGINX_DIR/conf.d/app.conf.backup" ]]; then
    mv "$NGINX_DIR/conf.d/app.conf.backup" "$NGINX_DIR/conf.d/app.conf"
else
    # If no backup, copy from template (this shouldn't happen normally)
    echo -e "${YELLOW}⚠️  No backup found, using default HTTPS config${NC}"
fi

# Step 7: Restart nginx with full configuration
echo "🔄 Restarting NGINX with SSL configuration..."
docker compose restart nginx

# Wait for nginx to restart
sleep 3

# Step 8: Start certbot for automatic renewal
echo "🔄 Starting Certbot renewal service..."
docker compose up -d certbot

# Step 9: Verify HTTPS is working
echo ""
echo "🔍 Verifying HTTPS configuration..."
sleep 2

HTTPS_CODE=$(curl -sk -o /dev/null -w "%{http_code}" "https://$DOMAIN" 2>/dev/null || echo "000")

if [[ "$HTTPS_CODE" == "200" ]] || [[ "$HTTPS_CODE" == "301" ]] || [[ "$HTTPS_CODE" == "302" ]]; then
    echo -e "${GREEN}✅ HTTPS is working!${NC}"
else
    echo -e "${YELLOW}⚠️  Could not verify HTTPS (status: $HTTPS_CODE)${NC}"
    echo "   This might be normal if ui-web is not running yet."
fi

echo ""
echo "============================================"
echo -e "${GREEN}🎉 SSL Certificate Provisioning Complete!${NC}"
echo "============================================"
echo ""
echo "📋 Summary:"
echo "   - Certificate: /etc/letsencrypt/live/$DOMAIN/"
echo "   - Valid for:   90 days"
echo "   - Auto-renewal: Every 12 hours (if < 30 days remaining)"
echo ""
echo "🔗 Your site is now available at:"
echo "   https://$DOMAIN"
echo ""
echo "📝 Next steps:"
echo "   1. Update Cognito callback URLs to use https://$DOMAIN"
echo "   2. Update ui-web environment variables"
echo "   3. Ensure ui-web container is running"
echo ""
