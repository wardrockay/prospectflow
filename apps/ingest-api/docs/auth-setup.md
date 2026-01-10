# Authentication Setup Guide

## Overview

ProspectFlow uses AWS Cognito for authentication with Redis session management. This guide covers the complete setup process.

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│   Frontend  │────▶│  Cognito Hosted  │────▶│   Cognito   │
│             │     │       UI         │     │  User Pool  │
└─────────────┘     └──────────────────┘     └─────────────┘
       │                                            │
       │ JWT Token                                  │
       ▼                                            ▼
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Ingest API │────▶│   JWT Verify     │────▶│   Redis     │
│             │     │   Middleware     │     │   Session   │
└─────────────┘     └──────────────────┘     └─────────────┘
                            │
                            ▼
                    ┌──────────────────┐
                    │   PostgreSQL     │
                    │   (User Sync)    │
                    └──────────────────┘
```

## Prerequisites

- AWS Account with access to Cognito
- Terraform >= 1.0
- Docker & Docker Compose
- Node.js >= 20
- pnpm

## Step 1: Terraform Cognito Setup

### Navigate to Cognito Infrastructure

```bash
cd infra/cognito/terraform
```

### Configure Variables

Create `terraform.tfvars`:

```hcl
environment  = "dev"
project_name = "prospectflow"
aws_region   = "eu-west-1"
```

### Initialize and Apply

```bash
# Initialize Terraform
terraform init

# Preview changes
terraform plan

# Apply infrastructure
terraform apply

# Export outputs for environment variables
terraform output -json > outputs.json
```

### Expected Resources Created

- Cognito User Pool (`prospectflow-dev`)
- User Pool Client (`prospectflow-api-client`)
- Custom attributes: `organisation_id`, `role`
- Groups: `admin`, `user`, `viewer`
- Hosted UI domain: `prospectflow-dev.auth.eu-west-1.amazoncognito.com`

## Step 2: Redis Setup

### Start Redis Container

```bash
cd infra/redis
docker-compose up -d
```

### Verify Redis is Running

```bash
docker-compose ps
redis-cli ping  # Should return PONG
```

### Redis Configuration

Default settings in `redis.conf`:

| Setting            | Value       | Description            |
| ------------------ | ----------- | ---------------------- |
| `maxmemory`        | 256mb       | Memory limit           |
| `maxmemory-policy` | allkeys-lru | Eviction policy        |
| `appendonly`       | yes         | AOF persistence        |
| `save 900 1`       | -           | RDB snapshot frequency |

## Step 3: Database Migration

### Run Flyway Migration

```bash
cd infra/postgres
flyway migrate
```

This creates:

- `cognito_sub` column in `iam.users` table
- Index `idx_users_cognito_sub` for fast lookups

## Step 4: Environment Variables

### Required Variables

Add to `apps/ingest-api/.env`:

```bash
# AWS Cognito
AWS_REGION=eu-west-1
COGNITO_USER_POOL_ID=<from-terraform-output>
COGNITO_CLIENT_ID=<from-terraform-output>
COGNITO_ISSUER=https://cognito-idp.eu-west-1.amazonaws.com/<pool-id>

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_SESSION_TTL=86400

# Session
SESSION_SECRET=<generate-32-char-random-string>
```

### Generate Session Secret

```bash
openssl rand -hex 32
```

### Extract Terraform Outputs

```bash
cd infra/cognito/terraform
echo "COGNITO_USER_POOL_ID=$(terraform output -raw user_pool_id)"
echo "COGNITO_CLIENT_ID=$(terraform output -raw app_client_id)"
echo "COGNITO_ISSUER=$(terraform output -raw issuer_url)"
```

## Step 5: Create Test User

### Via AWS Console

1. Open AWS Console → Cognito → User Pools
2. Select `prospectflow-dev` pool
3. Users → Create user
4. Fill in:
   - Email: `test@example.com`
   - Temporary password: `TempPass123!`
5. Add custom attributes:
   - `organisation_id`: `test-org-uuid-001`
   - `role`: `admin`
6. Add to group: `admin`

### Via AWS CLI

```bash
# Create user
aws cognito-idp admin-create-user \
  --user-pool-id <pool-id> \
  --username test@example.com \
  --user-attributes \
    Name=email,Value=test@example.com \
    Name=email_verified,Value=true \
    Name=custom:organisation_id,Value=test-org-uuid-001 \
    Name=custom:role,Value=admin \
  --temporary-password TempPass123!

# Add to group
aws cognito-idp admin-add-user-to-group \
  --user-pool-id <pool-id> \
  --username test@example.com \
  --group-name admin
```

## Step 6: Test Authentication Flow

### Get Hosted UI URL

```bash
cd infra/cognito/terraform
terraform output hosted_ui_url
```

### Login Flow

1. Navigate to Hosted UI URL
2. Login with test credentials
3. Complete password change (first login)
4. Capture JWT from callback URL

### Test Protected Endpoint

```bash
# Set token
TOKEN="<jwt-from-callback>"

# Call protected endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/health
```

### Expected Response

```json
{
  "status": "success",
  "data": {
    "status": "healthy",
    "timestamp": "2026-01-10T10:00:00.000Z",
    "user": {
      "sub": "abc123...",
      "email": "test@example.com",
      "organisationId": "test-org-uuid-001"
    }
  }
}
```

## Middleware Chain

The authentication middleware chain runs in order:

1. **`cognito-auth.middleware`**: Validates JWT signature & expiration
2. **`session.middleware`**: Creates/retrieves Redis session
3. **`organisation-scope.middleware`**: Attaches `organisationId` to request

### Protected Route Example

```typescript
import { cognitoAuthMiddleware } from './middlewares/cognito-auth.middleware';
import { sessionMiddleware } from './middlewares/session.middleware';
import { organisationScopeMiddleware } from './middlewares/organisation-scope.middleware';

router.get(
  '/protected',
  cognitoAuthMiddleware,
  sessionMiddleware,
  organisationScopeMiddleware,
  (req, res) => {
    // req.user - JWT payload
    // req.session - Redis session
    // req.organisationId - Current org UUID
    res.json({
      message: 'Authenticated!',
      organisationId: req.organisationId,
    });
  },
);
```

## Multi-Tenant Enforcement

All database queries MUST include organisation filter:

```typescript
import { getOrganisationIdFromRequest } from '../middlewares/organisation-scope.middleware';

async function getProspects(req: Request) {
  const orgId = getOrganisationIdFromRequest(req);

  return pool.query('SELECT * FROM prospects WHERE organisation_id = $1', [orgId]);
}
```

### Cross-Tenant Access Check

```typescript
import { checkOrganisationAccess } from '../middlewares/organisation-scope.middleware';

async function getProspect(req: Request, prospectId: string) {
  const prospect = await findProspectById(prospectId);

  // Throws 403 if organisation mismatch
  checkOrganisationAccess(prospect.organisation_id, req.organisationId, 'prospect');

  return prospect;
}
```

## Troubleshooting

See [auth-troubleshooting.md](./auth-troubleshooting.md) for common issues.

## Security Considerations

1. **Never log JWT tokens** in production
2. **Session TTL**: 24 hours with sliding expiration
3. **Organisation isolation**: All queries must include `organisation_id`
4. **Token validation**: Always verify signature with Cognito public keys
