# Phase 1 Completion Summary - AWS Cognito Authentication

## 🎯 Objective

Infrastructure setup and core JWT validation for AWS Cognito authentication

## ✅ Tasks Completed

### Task 1.1: Terraform - Cognito User Pool Setup

**Status**: ✅ Complete

**Files Created**:

```
infra/cognito/terraform/
├── main.tf           # User Pool with password policies & custom attributes
├── app_client.tf     # App client configuration
├── groups.tf         # Three groups: admin, user, viewer
├── domain.tf         # Hosted UI domain
├── variables.tf      # Environment-specific variables
├── outputs.tf        # User Pool ID, Client ID, Hosted UI URL
├── terraform.tfvars  # Development environment values
├── .gitignore        # Ignore sensitive files
└── README.md         # Terraform documentation
```

**Terraform Outputs**:

- User Pool ID: `eu-west-1_m8wWyUG8x`
- App Client ID: `21iugsof735ks8k76r2vdn31do`
- Hosted UI URL: `https://prospectflow-dev.auth.eu-west-1.amazoncognito.com`
- Region: `eu-west-1` (Paris)

**Custom Attributes**:

- `organisation_id` (String, mutable)
- `role` (String, mutable)

**Groups**:

- `admin` - Full access
- `user` - Standard access
- `viewer` - Read-only access

---

### Task 1.2: Redis Docker Infrastructure Setup

**Status**: ✅ Complete

**Files Created**:

```
infra/redis/
├── redis.conf              # Optimized Redis configuration
├── docker-compose.yaml     # Redis 7-alpine with persistence
├── .gitignore              # Ignore data directory
└── README.md               # Redis documentation
```

**Configuration**:

- Memory limit: 256MB (LRU eviction policy)
- Persistence: AOF + RDB snapshots
- Port: 6379
- Health checks enabled
- Restart policy: unless-stopped

**Verification**:

```bash
✅ Container running: redis-session-store
✅ Health: healthy
✅ Ping test: PONG
```

---

### Task 1.3: Database Migration - Add Cognito Fields

**Status**: ✅ Complete

**Migration**: `V20260109_120000___add_cognito_fields.sql`

**Changes**:

```sql
ALTER TABLE iam.users
ADD COLUMN cognito_sub VARCHAR(255) UNIQUE;

CREATE INDEX idx_users_cognito_sub ON iam.users(cognito_sub);
```

**Purpose**: Links Cognito users (`sub` claim) to database user records

**Verification**:

```bash
✅ Migration applied successfully
✅ Column exists with UNIQUE constraint
✅ Index created for performance
```

---

### Task 1.4: JWT Validation Middleware

**Status**: ✅ Complete

**Files Created**:

```
apps/ingest-api/src/
├── config/
│   └── cognito.ts                  # Cognito configuration
├── types/
│   ├── cognito.ts                  # CognitoJwtPayload type
│   └── express.d.ts                # Extend Express Request with user
└── middlewares/
    └── cognito-auth.middleware.ts  # JWT validation logic
```

**Dependencies Installed**:

- `aws-jwt-verify@4.0.1`

**Middleware Features**:

- Lazy verifier initialization (for testing)
- Bearer token extraction from Authorization header
- JWT signature verification against Cognito public keys
- Token expiration validation
- Custom claims support (organisation_id, role, groups)
- Comprehensive error handling (401 for auth failures, 500 for unexpected errors)

**Unit Tests**:

```
apps/ingest-api/tests/unit/middlewares/
└── cognito-auth.middleware.test.ts
```

**Test Coverage**: 91.66% (exceeds 90% requirement)

**Test Scenarios**:

- ✅ Valid token with all claims
- ✅ Bearer prefix extraction
- ✅ Missing Authorization header
- ✅ Invalid header format
- ✅ Empty token
- ✅ Invalid signature
- ✅ Expired token
- ✅ Wrong User Pool
- ✅ Unexpected errors during verification

---

### Task 1.5: Smoke Test - End-to-End JWT Validation

**Status**: ✅ Complete

**Files Created**:

```
apps/ingest-api/
├── src/routes/
│   └── auth.test.routes.ts     # Test endpoint: GET /api/v1/auth/test
├── smoke-test.sh               # Automated smoke test script
└── COGNITO_SMOKE_TEST.md       # Smoke test documentation
```

**Test Endpoint**: `GET /api/v1/auth/test`

- Protected by `cognitoAuthMiddleware`
- Returns decoded JWT payload
- Used for manual smoke testing

**Smoke Test Script**: `./smoke-test.sh`

- `create-user` - Creates test user in Cognito
- `generate-token` - Generates JWT token (programmatic or manual)
- `test-endpoint` - Tests all three scenarios (valid, missing, invalid)
- `cleanup` - Removes test user and token file

**Manual Verification Steps**:

1. Create test user with custom attributes
2. Generate JWT via Hosted UI or AWS CLI
3. Test valid token → 200 OK
4. Test missing token → 401 Unauthorized
5. Test invalid token → 401 Unauthorized

---

## 🏗️ Architecture Summary

### Flow: Client → API → Cognito

```
1. Client sends request with JWT in Authorization header
2. cognitoAuthMiddleware extracts token
3. Verifier validates signature against Cognito public keys
4. Middleware attaches decoded payload to req.user
5. Protected route accesses req.user for auth decisions
```

### JWT Claims Available

```typescript
req.user = {
  sub: string;                    // Cognito user ID (UUID)
  email: string;
  email_verified: boolean;
  'custom:organisation_id': string;
  'custom:role': string;
  'cognito:groups': string[];     // ['admin', 'user', 'viewer']
  iss: string;                    // Cognito issuer URL
  aud: string;                    // App client ID
  token_use: 'id';
  exp: number;
  iat: number;
}
```

---

## 🚀 Deployment Status

| Component           | Status         | Location                        |
| ------------------- | -------------- | ------------------------------- |
| Cognito User Pool   | ✅ Deployed    | AWS eu-west-1                   |
| Redis Session Store | ✅ Running     | Docker (localhost:6379)         |
| Database Migration  | ✅ Applied     | PostgreSQL 18                   |
| JWT Middleware      | ✅ Implemented | apps/ingest-api/src/middlewares |
| Unit Tests          | ✅ Passing     | 91.66% coverage                 |
| Test Endpoint       | ✅ Available   | /api/v1/auth/test               |

---

## 📊 Metrics

- **Total Files Created**: 21
- **Code Coverage**: 91.66%
- **Unit Tests**: 9 passing
- **Infrastructure Components**: 3 (Cognito, Redis, Database)
- **Time to Complete**: ~2 hours

---

## 🔐 Security Notes

- JWT tokens valid for 1 hour (default Cognito setting)
- Tokens verified using Cognito public keys (RS256 algorithm)
- No secrets stored in code (client secret not required for ID tokens)
- Custom attributes (organisation_id, role) for multi-tenant support
- HTTPS required in production (Cognito Hosted UI)

---

## 🎓 Lessons Learned

1. **Lazy Initialization**: Verifier must be created lazily to allow mocking in tests
2. **Vitest vs Jest**: Project uses Vitest - use `vi.mock` not `jest.mock`
3. **ESM Extensions**: TypeScript requires `.js` extensions for relative imports
4. **Error Handling**: Two-level try-catch needed for granular error responses
5. **MFA Configuration**: Cannot set MFA to OPTIONAL without actual MFA setup in Terraform

---

## ✅ Phase 1 Acceptance Criteria

- [x] Terraform applies without errors
- [x] User Pool visible in AWS Console (eu-west-1)
- [x] Custom attributes `organisation_id` and `role` configured
- [x] Three groups (admin, user, viewer) created
- [x] Hosted UI accessible at domain URL
- [x] Redis container running with persistence
- [x] Database migration applied successfully
- [x] JWT middleware implemented with error handling
- [x] Unit tests pass with 90%+ coverage
- [x] Test endpoint responds correctly to valid/invalid tokens
- [x] Smoke test script created and documented

---

## 🎯 Next Steps - Phase 2

**Goal**: Implement session management and user synchronization

**Upcoming Tasks**:

1. Redis client configuration and connection pool
2. Session service (create, validate, destroy)
3. Session middleware (validate session from Redis)
4. User sync service (Cognito → Database)
5. Auth routes (POST /login, POST /logout, POST /refresh)

**Estimated Effort**: 2 Story Points

---

## 📝 Quick Reference

**Start Redis**:

```bash
cd infra/redis
docker-compose up -d
```

**Run Smoke Test**:

```bash
cd apps/ingest-api
./smoke-test.sh create-user
./smoke-test.sh generate-token
pnpm dev  # In separate terminal
./smoke-test.sh test-endpoint
./smoke-test.sh cleanup
```

**Run Unit Tests**:

```bash
cd apps/ingest-api
pnpm test cognito-auth.middleware.test.ts
```

**Check Cognito Outputs**:

```bash
cd infra/cognito/terraform
terraform output
```

---

**Phase 1 Complete** ✅ | **Story 0.4** | **Sprint 0** | **2026-01-09**
