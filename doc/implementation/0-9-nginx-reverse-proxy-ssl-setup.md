# Story 0.9: NGINX Reverse Proxy with Let's Encrypt SSL

**Epic**: 0 - Sprint 0: Foundation Infrastructure  
**Story ID**: 0.9  
**Story Points**: 3  
**Status**: ready-for-dev  
**Dependencies**: Story 0.4 (AWS Cognito Authentication Integration)  
**Created**: 2026-01-12  
**Assignee**: Amelia (Dev Agent) / Tolliam (Code Review)

---

## Story Overview

### User Story

**As a** ProspectFlow platform administrator  
**I want** an NGINX reverse proxy with automatic SSL certificate management  
**So that** Cognito OAuth callbacks can use a production HTTPS URL instead of localhost

### Business Context

AWS Cognito requires HTTPS URLs for OAuth callback endpoints in production environments. This story implements:

- NGINX reverse proxy serving `app.lightandshutter.fr` over HTTPS
- Automatic SSL certificate provisioning via Let's Encrypt
- Automatic certificate renewal via separate Certbot service
- Secure reverse proxy to `ui-web` application

### Technical Context

**Architecture Decision**: NGINX + Certbot in Docker containers

**Justification**:

- **NGINX**: Industry-standard reverse proxy, lightweight, production-proven
- **Certbot**: Official Let's Encrypt client for automated certificate management
- **Separate containers**: Clean separation of concerns, independent renewal cycles
- **Docker volumes**: Shared certificate storage between NGINX and Certbot

**Stack**:

- NGINX (Docker, `nginx:alpine`)
- Certbot (Docker, `certbot/certbot`)
- Let's Encrypt (ACME protocol)
- Docker Compose orchestration

**Domain**: `app.lightandshutter.fr`

---

## Architecture Overview

### Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         VPS Server                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────────┐      ┌──────────────────────────────┐    │
│   │    Internet      │      │      Docker Network          │    │
│   │                  │      │                              │    │
│   │   :80 (HTTP)  ───┼──────┼───► NGINX Container          │    │
│   │   :443 (HTTPS)───┼──────┼───►  ├─ SSL Termination      │    │
│   │                  │      │      ├─ HTTP→HTTPS Redirect  │    │
│   └──────────────────┘      │      └─ Proxy to ui-web:3000 │    │
│                             │              │               │    │
│                             │              ▼               │    │
│                             │      ┌──────────────────┐    │    │
│                             │      │   ui-web:3000    │    │    │
│                             │      │   (Nuxt SSR)     │    │    │
│                             │      └──────────────────┘    │    │
│                             │                              │    │
│   ┌──────────────────┐      │      ┌──────────────────┐    │    │
│   │ Certbot Service  │◄─────┼──────┤ Shared Volumes   │    │    │
│   │ (renewal cron)   │      │      │ /etc/letsencrypt │    │    │
│   └──────────────────┘      │      │ /var/www/certbot │    │    │
│                             │      └──────────────────┘    │    │
│                             └──────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Certificate Renewal Flow

```
1. Certbot container runs every 12 hours (cron)
2. Certbot checks certificate expiry (renews if < 30 days)
3. ACME challenge served via /.well-known/acme-challenge/
4. New certificate written to shared volume
5. NGINX reloads configuration to pick up new cert
```

### File Structure

```
infra/nginx/
├── .gitignore                # ⚠️ CRITICAL: Exclut certbot/ et www/ du repo
├── docker-compose.yaml       # NGINX + Certbot services
├── nginx.conf                # Main NGINX configuration
├── conf.d/
│   └── app.conf              # Virtual host for app.lightandshutter.fr
├── scripts/
│   ├── init-letsencrypt.sh   # Initial certificate provisioning
│   └── renew-certs.sh        # Manual renewal trigger
├── certbot/                  # 🚫 GITIGNORED - Créé au runtime
│   └── conf/                 # Let's Encrypt certificates (volume)
└── www/                      # 🚫 GITIGNORED - Créé au runtime
    └── certbot/              # ACME challenge files (volume)
```

### ⚠️ Git Exclusion Strategy (Deployment Safety)

Les fichiers générés par Certbot et NGINX sont exclus via `.gitignore` pour éviter les conflits lors des `git pull` sur le VPS :

| Répertoire | Raison d'exclusion |
|------------|-------------------|
| `certbot/conf/` | Certificats SSL + clés privées (sensible + généré) |
| `certbot/www/` | Challenges ACME temporaires |
| `www/` | Fichiers webroot générés |
| `logs/` | Logs NGINX (si activés) |

**Important** : Ces répertoires sont créés automatiquement par Docker au premier démarrage.

---

## Phase 1: NGINX Base Configuration (1 Story Point)

**Goal**: Set up NGINX container with HTTP configuration and ACME challenge support

### Task 1.1: Create NGINX Docker Infrastructure

**Objective**: Create Docker Compose configuration for NGINX reverse proxy

**Files to Create**:

```
infra/nginx/
├── docker-compose.yaml
├── nginx.conf
└── conf.d/
    └── app.conf
```

**Subtasks**:

1. **1.1.1**: Create `docker-compose.yaml` with NGINX service

   - Image: `nginx:alpine`
   - Ports: `80:80`, `443:443`
   - Volumes for config, certificates, and ACME challenges
   - Network: connect to `prospectflow-network` (or create dedicated network)
   - Restart policy: `unless-stopped`
   - Depends on: certbot service

2. **1.1.2**: Create `nginx.conf` main configuration

   - Worker processes: auto
   - Worker connections: 1024
   - Include conf.d/*.conf
   - Logging to stdout/stderr for Docker
   - Security headers baseline

3. **1.1.3**: Create `conf.d/app.conf` virtual host (HTTP-only initially)

   - Server name: `app.lightandshutter.fr`
   - Listen on port 80
   - Location `/.well-known/acme-challenge/` for Let's Encrypt verification
   - Redirect all other HTTP traffic to HTTPS (placeholder until cert exists)

**Acceptance Criteria**:

- [ ] Docker Compose file valid (`docker-compose config` passes)
- [ ] NGINX container starts without errors
- [ ] HTTP requests on port 80 are handled
- [ ] ACME challenge directory accessible at `/.well-known/acme-challenge/`

---

### Task 1.2: Create Certbot Service Configuration

**Objective**: Configure Certbot container for certificate management

**Subtasks**:

1. **1.2.1**: Add Certbot service to `docker-compose.yaml`

   - Image: `certbot/certbot`
   - Volumes: shared with NGINX for certificates and webroot
   - Entrypoint: renewal check command (runs periodically)
   - Command: `certonly --webroot` or renewal loop

2. **1.2.2**: Create `scripts/init-letsencrypt.sh`

   - Check if certificate already exists
   - If not, request initial certificate using webroot method
   - Domain: `app.lightandshutter.fr`
   - Email: configurable (for expiry notifications)
   - Agree to ToS automatically
   - Reload NGINX after successful issuance

3. **1.2.3**: Create `scripts/renew-certs.sh`

   - Trigger manual certificate renewal
   - Reload NGINX after renewal
   - Useful for testing or emergency renewal

**Acceptance Criteria**:

- [ ] Certbot container configuration valid
- [ ] Init script can request certificates from Let's Encrypt staging
- [ ] Renewal script executes without errors

---

## Phase 2: SSL Configuration & Reverse Proxy (1.5 Story Points)

**Goal**: Enable HTTPS with Let's Encrypt certificate and configure reverse proxy to ui-web

### Task 2.1: Obtain Initial SSL Certificate

**Objective**: Run initial certificate provisioning

**Subtasks**:

1. **2.1.1**: Ensure DNS A record points to VPS IP

   - Domain: `app.lightandshutter.fr`
   - Verify with: `dig app.lightandshutter.fr +short`

2. **2.1.2**: Start NGINX in HTTP-only mode

   - Run: `docker-compose up -d nginx`
   - Verify: HTTP accessible on port 80

3. **2.1.3**: Run certificate initialization script

   - Execute: `./scripts/init-letsencrypt.sh`
   - Use staging environment first for testing
   - Switch to production after validation
   - Certificate stored in `certbot/conf/live/app.lightandshutter.fr/`

**Acceptance Criteria**:

- [ ] DNS resolves correctly to VPS IP
- [ ] Certificate files exist in `certbot/conf/live/app.lightandshutter.fr/`
- [ ] Certificate valid for domain (check with `openssl`)

---

### Task 2.2: Configure HTTPS Virtual Host

**Objective**: Update NGINX configuration to serve HTTPS and proxy to ui-web

**Subtasks**:

1. **2.2.1**: Update `conf.d/app.conf` with HTTPS server block

   ```nginx
   # HTTP server - redirect to HTTPS
   server {
       listen 80;
       server_name app.lightandshutter.fr;
       
       location /.well-known/acme-challenge/ {
           root /var/www/certbot;
       }
       
       location / {
           return 301 https://$host$request_uri;
       }
   }

   # HTTPS server
   server {
       listen 443 ssl http2;
       server_name app.lightandshutter.fr;
       
       # SSL certificates
       ssl_certificate /etc/letsencrypt/live/app.lightandshutter.fr/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/app.lightandshutter.fr/privkey.pem;
       
       # SSL configuration
       ssl_session_timeout 1d;
       ssl_session_cache shared:SSL:50m;
       ssl_session_tickets off;
       
       # Modern TLS configuration
       ssl_protocols TLSv1.2 TLSv1.3;
       ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
       ssl_prefer_server_ciphers off;
       
       # HSTS
       add_header Strict-Transport-Security "max-age=63072000" always;
       
       # Proxy to ui-web
       location / {
           proxy_pass http://ui-web:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

2. **2.2.2**: Add SSL options include file (optional optimization)

   - Create `conf.d/options-ssl-nginx.conf` with shared SSL settings
   - Include in server blocks to reduce duplication

3. **2.2.3**: Restart NGINX with SSL configuration

   - Run: `docker-compose restart nginx`
   - Verify: HTTPS accessible at `https://app.lightandshutter.fr`

**Acceptance Criteria**:

- [ ] HTTPS accessible at `https://app.lightandshutter.fr`
- [ ] HTTP redirects to HTTPS automatically
- [ ] SSL Labs test score A or higher
- [ ] ui-web application loads correctly through proxy

---

### Task 2.3: Configure Automatic Certificate Renewal

**Objective**: Set up automatic renewal with Certbot

**Subtasks**:

1. **2.3.1**: Configure Certbot renewal schedule

   - Certbot container runs renewal check every 12 hours
   - Command: `certbot renew --webroot -w /var/www/certbot --quiet`
   - Certificates renewed if expiring within 30 days

2. **2.3.2**: Add NGINX reload on renewal

   - Post-hook: reload NGINX after successful renewal
   - Option A: Use Certbot deploy-hook
   - Option B: Use Docker Compose exec in renewal script

3. **2.3.3**: Test renewal process

   - Run: `docker-compose run --rm certbot renew --dry-run`
   - Verify renewal simulation succeeds

**Acceptance Criteria**:

- [ ] Certbot renewal dry-run succeeds
- [ ] NGINX reload mechanism tested
- [ ] Renewal logs accessible via Docker

---

## Phase 3: Integration & Cognito Update (0.5 Story Points)

**Goal**: Update Cognito callback URLs and verify end-to-end OAuth flow

### Task 3.1: Update Cognito Callback URLs

**Objective**: Add production HTTPS callback URL to Cognito app client

**Subtasks**:

1. **3.1.1**: Update Terraform configuration

   - Add to `infra/cognito/terraform/app_client.tf`:
     - Callback URL: `https://app.lightandshutter.fr/auth/callback`
     - Logout URL: `https://app.lightandshutter.fr/`

2. **3.1.2**: Apply Terraform changes

   - Run: `terraform plan` (verify changes)
   - Run: `terraform apply`

3. **3.1.3**: Alternatively, update via AWS Console

   - Navigate to Cognito > User Pools > App Client
   - Add callback and logout URLs
   - Save changes

**Acceptance Criteria**:

- [ ] Callback URL `https://app.lightandshutter.fr/auth/callback` registered in Cognito
- [ ] Logout URL `https://app.lightandshutter.fr/` registered in Cognito

---

### Task 3.2: Update ui-web Environment Configuration

**Objective**: Configure ui-web for production domain

**Subtasks**:

1. **3.2.1**: Create/update production environment file

   - File: `apps/ui-web/.env.production`
   - Update `NUXT_PUBLIC_APP_URL=https://app.lightandshutter.fr`
   - Update Cognito redirect URIs

2. **3.2.2**: Verify environment variable usage

   - Check `nuxt.config.ts` uses runtime config
   - Ensure callback URLs are configurable

**Acceptance Criteria**:

- [ ] Production environment file configured
- [ ] ui-web uses correct callback URL in production mode

---

### Task 3.3: End-to-End Verification

**Objective**: Verify complete OAuth flow through NGINX proxy

**Subtasks**:

1. **3.3.1**: Test HTTPS accessibility

   - Navigate to `https://app.lightandshutter.fr`
   - Verify application loads correctly
   - Check browser shows valid certificate

2. **3.3.2**: Test Cognito OAuth flow

   - Click login button
   - Verify redirect to Cognito Hosted UI
   - Complete login
   - Verify callback returns to `https://app.lightandshutter.fr/auth/callback`
   - Verify user authenticated successfully

3. **3.3.3**: Test certificate renewal readiness

   - Run renewal dry-run
   - Verify logs show successful simulation

**Acceptance Criteria**:

- [ ] Full OAuth flow works via HTTPS
- [ ] No mixed content warnings
- [ ] Certificate renewal tested (dry-run)

---

## Technical Specifications

### NGINX Configuration Best Practices

```nginx
# Security headers to include
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

### Docker Compose Network Configuration

```yaml
networks:
  prospectflow-network:
    external: true
    # Or create: driver: bridge
```

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DOMAIN` | Primary domain | `app.lightandshutter.fr` |
| `EMAIL` | Let's Encrypt notifications | `admin@lightandshutter.fr` |
| `STAGING` | Use Let's Encrypt staging | `0` (production) or `1` (staging) |

### Renewal Schedule

- Certbot checks every 12 hours
- Renewal triggers at 30 days before expiry
- Let's Encrypt certificates valid for 90 days
- Effective renewal window: every 60 days

---

## Definition of Done

- [ ] NGINX container running with valid SSL certificate
- [ ] HTTP to HTTPS redirect functional
- [ ] Reverse proxy to ui-web operational
- [ ] Certbot automatic renewal configured
- [ ] Renewal dry-run successful
- [ ] Cognito callback URLs updated for HTTPS
- [ ] End-to-end OAuth flow verified
- [ ] Documentation updated (if applicable)
- [ ] All acceptance criteria marked complete

---

## Rollback Plan

If issues arise:

1. **Certificate issues**: Fall back to self-signed cert for testing
2. **NGINX misconfiguration**: Revert to last known good config
3. **Cognito callback failure**: Re-add localhost callback for development

---

## References

- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Certbot Docker Guide](https://certbot.eff.org/docs/install.html#running-with-docker)
- [NGINX SSL Best Practices](https://ssl-config.mozilla.org/)
- [Docker Compose Networking](https://docs.docker.com/compose/networking/)
