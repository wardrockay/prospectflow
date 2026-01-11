# @prospectflow/auth-core

Shared authentication package for ProspectFlow services using AWS Cognito.

## Installation

```bash
# From workspace root
pnpm add @prospectflow/auth-core --filter <your-app>
```

## Features

- 🔐 **JWT Token Validation** - Validates AWS Cognito JWT tokens
- 🗄️ **Session Management** - Redis-backed session storage
- 🏢 **Multi-Tenant Support** - Organisation-scoped authentication
- 🔒 **Role-Based Access Control** - Role and group-based authorization
- 📦 **Type-Safe** - Full TypeScript support with shared types
- 🌐 **Frontend Compatible** - Type exports safe for browser/Nuxt usage

## Backend Usage (Express)

### Basic Setup

```typescript
import {
  createCognitoAuthMiddleware,
  createSessionMiddleware,
  createOrganisationScopeMiddleware,
  SessionService,
  UserSyncService,
  createRedisClient,
} from '@prospectflow/auth-core';

// Create Redis client
const redisClient = await createRedisClient({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
});

// Create services
const sessionService = new SessionService(redisClient);
const userSyncService = new UserSyncService(dbPool); // Your DB pool

// Create middlewares
const authMiddleware = createCognitoAuthMiddleware({
  userPoolId: process.env.COGNITO_USER_POOL_ID!,
  clientId: process.env.COGNITO_CLIENT_ID!,
});

const sessionMiddleware = createSessionMiddleware({
  sessionService,
  userSyncService, // Optional: syncs users to DB on first login
});

const orgScopeMiddleware = createOrganisationScopeMiddleware();

// Apply to routes
app.use('/api', authMiddleware, sessionMiddleware, orgScopeMiddleware);
```

### Advanced: Role and Group-Based Authorization

```typescript
import {
  createRequireRole,
  createRequireGroup,
  attachOrganisationId,
} from '@prospectflow/auth-core';

// Require specific role
const requireAdmin = createRequireRole('admin');
app.get('/admin/users', requireAdmin, (req, res) => {
  // Only accessible to users with 'admin' role
});

// Require group membership
const requireSalesGroup = createRequireGroup('sales');
app.get('/sales/reports', requireSalesGroup, (req, res) => {
  // Only accessible to users in 'sales' group
});

// Attach organisation ID to request (lightweight alternative to full middleware)
app.get('/organisations', attachOrganisationId, (req, res) => {
  const orgId = req.organisationId;
  // Use orgId for queries
});
```

### Custom Logger Integration

```typescript
import { createCognitoAuthMiddleware } from '@prospectflow/auth-core';
import { logger } from './logger';

const authMiddleware = createCognitoAuthMiddleware(
  {
    userPoolId: process.env.COGNITO_USER_POOL_ID!,
    clientId: process.env.COGNITO_CLIENT_ID!,
  },
  {
    error: (data, msg) => logger.error(data, msg),
  },
);
```

### Accessing User Data in Routes

```typescript
app.get('/me', authMiddleware, sessionMiddleware, (req, res) => {
  // Access JWT payload
  const cognitoUser = req.user; // CognitoJwtPayload

  // Access Redis session
  const session = req.session; // UserSession

  // Access organisation ID (if orgScopeMiddleware applied)
  const orgId = req.organisationId; // string

  res.json({
    sub: cognitoUser.sub,
    email: cognitoUser.email,
    role: session.role,
    organisationId: session.organisationId,
  });
});
```

## Frontend Usage (Nuxt/Vue)

Import types only (no Node.js dependencies):

```typescript
import type {
  AuthUser,
  AuthSession,
  CognitoJwtPayload,
  UserSession,
} from '@prospectflow/auth-core/frontend';

// Type your API responses
interface LoginResponse {
  token: string;
  user: AuthUser;
}

// Type your state
const user = ref<AuthUser | null>(null);
const session = ref<AuthSession | null>(null);

// Use in composables
export function useAuth() {
  const fetchCurrentUser = async (): Promise<AuthUser> => {
    const response = await $fetch<{ user: AuthUser }>('/api/auth/me');
    return response.user;
  };

  return { fetchCurrentUser };
}
```

## Environment Variables

| Variable               | Description              | Required | Default        |
| ---------------------- | ------------------------ | -------- | -------------- |
| `COGNITO_USER_POOL_ID` | AWS Cognito User Pool ID | Yes      | -              |
| `COGNITO_CLIENT_ID`    | Cognito App Client ID    | Yes      | -              |
| `COGNITO_ISSUER`       | Cognito Issuer URL       | No       | Auto-generated |
| `AWS_REGION`           | AWS Region               | No       | `eu-west-1`    |
| `REDIS_HOST`           | Redis host               | Yes      | -              |
| `REDIS_PORT`           | Redis port               | No       | `6379`         |
| `REDIS_PASSWORD`       | Redis password           | No       | -              |
| `REDIS_DB`             | Redis database number    | No       | `0`            |
| `REDIS_SESSION_TTL`    | Session TTL in seconds   | No       | `86400` (24h)  |

## API Reference

### Middlewares

#### `createCognitoAuthMiddleware(config, logger?)`

Creates a middleware to validate AWS Cognito JWT tokens.

**Parameters:**

- `config: CognitoConfigOptions` - Cognito configuration
  - `userPoolId: string` - AWS Cognito User Pool ID
  - `clientId: string` - Cognito App Client ID
  - `region?: string` - AWS region (default: `eu-west-1`)
- `logger?: AuthMiddlewareLogger` - Optional logger for errors

**Returns:** `RequestHandler`

**Attaches to request:**

- `req.user: CognitoJwtPayload` - Decoded JWT payload

---

#### `createSessionMiddleware(options)`

Creates a middleware to manage Redis sessions.

**Parameters:**

- `options: SessionMiddlewareOptions`
  - `sessionService: SessionService` - Session service instance
  - `userSyncService?: UserSyncService` - Optional user sync service
  - `logger?: SessionMiddlewareLogger` - Optional logger

**Returns:** `RequestHandler`

**Attaches to request:**

- `req.session: UserSession` - Redis session data

**Requirements:**

- Must run after `cognitoAuthMiddleware`
- Requires `req.user` to be set

---

#### `createOrganisationScopeMiddleware(options?)`

Creates a middleware to attach organisation ID to request.

**Parameters:**

- `options?: OrganisationScopeOptions`
  - `logger?: OrganisationScopeLogger` - Optional logger

**Returns:** `RequestHandler`

**Attaches to request:**

- `req.organisationId: string` - Organisation UUID

**Requirements:**

- Must run after `sessionMiddleware`
- Requires `req.session` to be set

---

#### `attachOrganisationId(req, res, next)`

Lightweight middleware to attach organisation ID without logging.

**Use Case:** When you need just the organisation ID without full middleware overhead.

---

#### `createRequireRole(...roles)`

Creates a middleware that requires specific role(s).

**Parameters:**

- `...roles: string[]` - Allowed role names (e.g., `'admin'`, `'user'`)

**Returns:** `RequestHandler`

**Throws:** `403 Forbidden` if user doesn't have required role

---

#### `createRequireGroup(...groups)`

Creates a middleware that requires membership in specific group(s).

**Parameters:**

- `...groups: string[]` - Required Cognito group names

**Returns:** `RequestHandler`

**Throws:** `403 Forbidden` if user is not in any of the specified groups

---

### Services

#### `SessionService`

Manages user sessions in Redis.

**Constructor:**

```typescript
new SessionService(redisClient: RedisClientType)
```

**Methods:**

- `createSession(payload: CreateSessionPayload): Promise<UserSession>` - Create a new session
- `getSession(cognitoSub: string): Promise<UserSession | null>` - Get session by Cognito sub
- `updateActivity(cognitoSub: string): Promise<void>` - Update last activity timestamp
- `deleteSession(cognitoSub: string): Promise<void>` - Delete session
- `extendSession(cognitoSub: string, additionalSeconds: number): Promise<void>` - Extend session TTL

---

#### `UserSyncService`

Syncs Cognito users to database.

**Constructor:**

```typescript
new UserSyncService(dbPool: Pool) // PostgreSQL Pool from 'pg' package
```

**Methods:**

- `syncUser(cognitoPayload: CognitoJwtPayload): Promise<void>` - Sync user from JWT to database
  - Inserts user if not exists
  - Updates user if already exists
  - Idempotent operation

---

### Types

#### `CognitoJwtPayload`

JWT token payload structure from AWS Cognito.

```typescript
interface CognitoJwtPayload {
  sub: string; // Cognito user ID (UUID)
  email: string; // User email
  'cognito:groups'?: string[]; // Cognito groups
  'custom:organisation_id'?: string; // Organisation UUID
  'custom:role'?: string; // User role
  aud: string; // Audience (client ID)
  token_use: string; // Token type (id/access)
  auth_time: number; // Authentication timestamp
  iat: number; // Issued at
  exp: number; // Expiration
}
```

---

#### `UserSession`

Session data stored in Redis.

```typescript
interface UserSession {
  cognitoSub: string; // Cognito user ID
  organisationId: string; // Organisation UUID
  email: string; // User email
  role: string; // User role
  cognitoGroups: string[]; // Cognito groups
  createdAt: string; // ISO 8601 timestamp
  lastActivity: string; // ISO 8601 timestamp
  ipAddress?: string; // Client IP
  userAgent?: string; // User agent string
}
```

---

#### `AuthUser` (Frontend)

Frontend-safe user representation.

```typescript
interface AuthUser {
  sub: string;
  email: string;
  organisationId: string;
  role: string;
  groups: string[];
}
```

---

#### `AuthSession` (Frontend)

Frontend-safe session representation.

```typescript
interface AuthSession {
  user: AuthUser;
  expiresAt: number;
}
```

---

## Middleware Chain Order

**Critical:** Middlewares must be applied in the correct order:

```typescript
app.use(
  '/api',
  cognitoAuthMiddleware, // 1. Validates JWT → sets req.user
  sessionMiddleware, // 2. Manages session → sets req.session
  organisationScopeMiddleware, // 3. Attaches org ID → sets req.organisationId
);
```

## Error Handling

All middlewares return appropriate HTTP status codes:

- **401 Unauthorized** - Missing or invalid JWT token
- **403 Forbidden** - Valid token but insufficient permissions
- **503 Service Unavailable** - Redis connection failure

Example error response:

```json
{
  "error": "Unauthorized",
  "message": "No authorization header provided"
}
```

## Testing

### Running Tests

```bash
cd packages/auth-core
pnpm test
pnpm test:coverage
```

### Mocking in Tests

```typescript
import { createCognitoAuthMiddleware } from '@prospectflow/auth-core';

// Mock verifier for tests
const mockAuthMiddleware = createCognitoAuthMiddleware(
  {
    userPoolId: 'mock-pool-id',
    clientId: 'mock-client-id',
  },
  {
    error: jest.fn(), // Or vitest.fn()
  },
);
```

## Architecture Decisions

### Why Shared Package Instead of Auth Service?

1. **Cognito IS the auth service** - AWS Cognito handles authentication (passwords, MFA, tokens)
2. **No latency** - JWT validation happens in-process, no network hop
3. **No SPOF** - Each service validates tokens independently using Cognito public keys
4. **Simpler operations** - One less service to deploy, monitor, and maintain
5. **Perfect for MVP** - Microservice approach warranted only at 20+ services scale

### When to Consider Auth Service?

Consider extracting to a dedicated auth service when:

- You have 20+ microservices
- You need centralized session management across multiple platforms
- You require complex authentication flows not supported by Cognito
- You need an API gateway that consolidates auth logic

## Migration Guide

If migrating from local auth code:

1. Install package: `pnpm add @prospectflow/auth-core --filter your-app`
2. Replace imports:

   ```typescript
   // Before
   import { cognitoAuthMiddleware } from './middlewares/cognito-auth.middleware';

   // After
   import { createCognitoAuthMiddleware } from '@prospectflow/auth-core';
   ```

3. Update middleware creation to use factory functions
4. Remove local auth files (middlewares, services, types)
5. Run tests to verify no regressions

## Contributing

This package is part of the ProspectFlow monorepo.

### Development Workflow

```bash
# Build package
cd packages/auth-core
pnpm build

# Watch mode (for development)
pnpm dev

# Type check
pnpm typecheck

# Run tests
pnpm test

# Test consuming app
cd ../../apps/ingest-api
pnpm dev
```

## License

UNLICENSED - Proprietary to ProspectFlow

## Related Documentation

- [Story 0.4: AWS Cognito Authentication Integration](/doc/implementation/0-4-aws-cognito-authentication-integration.md)
- [Story 0.5: Extract Auth to Shared Package](/doc/implementation/0-5-extract-auth-to-shared-package.md)
- [Architecture Reference](/doc/reference/ARCHITECTURE.md)
