# NGINX Reverse Proxy Deployment Guide

## Overview

This guide covers the deployment of NGINX reverse proxy with Let's Encrypt SSL for ProspectFlow.

**Target URL**: `https://app.lightandshutter.fr`

## Architecture

```
Internet → NGINX (80/443) → ui-web:3000 (Nuxt SSR)
                ↓
           Certbot (auto-renewal every 12h)
```

## Prerequisites

- [ ] VPS with Docker and Docker Compose installed
- [ ] DNS A record: `app.lightandshutter.fr` → VPS IP address
- [ ] Ports 80 and 443 open in firewall
- [ ] ProspectFlow repository cloned on VPS
- [ ] Docker network `prospectflow-network` created

## Files Created

```
infra/nginx/
├── docker-compose.yaml       # NGINX + Certbot services
├── nginx.conf                # Main NGINX configuration
├── conf.d/
│   ├── app.conf              # Virtual host (HTTPS)
│   └── app.http-only.conf.template  # HTTP-only template (for init)
├── scripts/
│   ├── init-letsencrypt.sh   # Initial certificate provisioning
│   └── renew-certs.sh        # Manual renewal script
├── certbot/                  # 🚫 GITIGNORED - Created at runtime
│   └── conf/                 # Let's Encrypt certificates
└── www/                      # 🚫 GITIGNORED - Created at runtime
    └── certbot/              # ACME challenge files
```

---

## Deployment Steps

### Step 1: Verify DNS Configuration

```bash
# From any machine, verify DNS points to your VPS IP
dig app.lightandshutter.fr +short
# Should return your VPS IP address
```

### Step 2: Pull Latest Code on VPS

```bash
ssh vps
cd ~/starlightcoder/prospectflow
git pull origin main
```

### Step 3: Create Docker Network (if not exists)

```bash
make network-create
# Or manually:
docker network create prospectflow-network
```

### Step 4: Initialize SSL Certificate (First Time Only)

⚠️ **Important**: This step is only needed ONCE when setting up NGINX for the first time.

```bash
# Option A: Using Makefile (recommended)
make nginx-init-ssl

# Option B: Directly run the script
cd infra/nginx
./scripts/init-letsencrypt.sh
```

**What happens:**

1. Creates required directories (`certbot/conf`, `www/certbot`)
2. Temporarily starts NGINX in HTTP-only mode
3. Requests certificate from Let's Encrypt using ACME HTTP challenge
4. Stores certificate in `certbot/conf/live/app.lightandshutter.fr/`
5. Restores full HTTPS configuration
6. Restarts NGINX with SSL enabled

**For testing (staging certificate):**

```bash
make nginx-init-ssl-staging
# Or:
./scripts/init-letsencrypt.sh --staging
```

### Step 5: Start NGINX

```bash
make nginx-up
# Or:
cd infra/nginx && docker compose up -d
```

### Step 6: Verify HTTPS is Working

```bash
# Check NGINX is running
docker ps | grep nginx

# Test HTTPS (from VPS or external)
curl -I https://app.lightandshutter.fr

# Check certificate details
echo | openssl s_client -connect app.lightandshutter.fr:443 2>/dev/null | openssl x509 -noout -dates
```

### Step 7: Update Cognito Callback URLs

In AWS Console or via Terraform, update the Cognito App Client:

- **Callback URL**: `https://app.lightandshutter.fr/auth/callback`
- **Logout URL**: `https://app.lightandshutter.fr/`

### Step 8: Update ui-web Environment

Ensure `apps/ui-web/.env` has:

```env
COGNITO_REDIRECT_URI=https://app.lightandshutter.fr/auth/callback
```

---

## Management Commands

| Command                    | Description                             |
| -------------------------- | --------------------------------------- |
| `make nginx-up`            | Start NGINX and Certbot                 |
| `make nginx-down`          | Stop NGINX and Certbot                  |
| `make nginx-logs`          | View NGINX logs                         |
| `make nginx-reload`        | Reload NGINX config (no downtime)       |
| `make nginx-test`          | Test NGINX configuration syntax         |
| `make nginx-init-ssl`      | Initialize SSL certificate (first time) |
| `make nginx-renew-ssl`     | Manually trigger certificate renewal    |
| `make nginx-renew-ssl-dry` | Test renewal (dry-run)                  |

---

## Certificate Renewal

### Automatic Renewal

Certbot container automatically checks for renewal every 12 hours.

- Certificates are renewed if expiring within 30 days
- Let's Encrypt certificates are valid for 90 days
- NGINX automatically reloads every 6 hours to pick up new certs

### Manual Renewal

```bash
# Force renewal
make nginx-renew-ssl

# Test renewal (dry-run, no changes)
make nginx-renew-ssl-dry
```

### Check Certificate Status

```bash
docker compose -f infra/nginx/docker-compose.yaml run --rm certbot certificates
```

---

## Troubleshooting

### NGINX Won't Start

```bash
# Check configuration syntax
docker exec prospectflow-nginx nginx -t

# View error logs
docker logs prospectflow-nginx
```

### Certificate Issues

```bash
# Check if certificate exists
ls -la infra/nginx/certbot/conf/live/app.lightandshutter.fr/

# Verify certificate validity
openssl x509 -in infra/nginx/certbot/conf/live/app.lightandshutter.fr/fullchain.pem -noout -dates
```

### DNS Issues

```bash
# Check DNS propagation
dig app.lightandshutter.fr +short

# Check from multiple locations
curl -s "https://dns.google/resolve?name=app.lightandshutter.fr&type=A" | jq
```

### Port Access Issues

```bash
# Check if ports are open
sudo netstat -tlnp | grep -E ':80|:443'

# Test from external
nc -zv app.lightandshutter.fr 80
nc -zv app.lightandshutter.fr 443
```

### Rate Limits

Let's Encrypt has rate limits:

- 50 certificates per week per domain
- 5 duplicate certificates per week
- 5 failed validations per hour

If you hit rate limits, wait or use staging:

```bash
make nginx-init-ssl-staging
```

---

## Security Notes

1. **Certificates are gitignored** - Never commit SSL certificates or private keys
2. **HSTS enabled** - 2-year max-age with preload
3. **Modern TLS only** - TLSv1.2 and TLSv1.3
4. **Security headers** - X-Frame-Options, X-Content-Type-Options, etc.

---

## Full Production Deployment

To deploy the entire stack including NGINX:

```bash
make prod-up
```

This will:

1. Start all infrastructure (PostgreSQL, RabbitMQ, Redis, ClickHouse)
2. Start applications (ingest-api, ui-web)
3. Start NGINX reverse proxy with SSL

---

## References

- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Certbot Docker Guide](https://certbot.eff.org/docs/install.html#running-with-docker)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [NGINX Reverse Proxy Documentation](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)
