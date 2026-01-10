# Story 0.5: Extract Auth to Shared Package

**Epic**: 0 - Sprint 0: Foundation Infrastructure  
**Story ID**: 0.5  
**Story Points**: 3  
**Status**: Ready for Development  
**Dependencies**: Story 0.4 (AWS Cognito Authentication - completed)  
**Created**: 2026-01-10  
**Assignee**: TBD

---

## Story Overview

### User Story

**As a** ProspectFlow platform developer  
**I want** authentication code extracted into a shared package  
**So that** all services (backend APIs, frontend, workers) can reuse the same authentication logic without code duplication

### Business Context

This story refactors existing authentication code from `ingest-api` into a shared monorepo package. This enables:

- **Code Reuse**: Frontend (Nuxt), future APIs, and workers use the same auth logic
- **Consistency**: Single source of truth for auth types and validation
- **Maintainability**: Auth updates propagate to all consumers automatically
- **Type Safety**: Shared TypeScript types between frontend and backend

### Technical Context

**Architecture Decision**: Shared Package in Monorepo (vs Auth Microservice)

**Justification**:

- **Cognito IS the auth service**: AWS Cognito handles the heavy lifting (passwords, MFA, tokens)
- **No additional latency**: Package runs in-process, no network hop
- **No SPOF**: Each service validates JWT locally
- **Simpler ops**: No additional service to deploy/monitor
- **Perfect for MVP**: Service approach warranted only at 20+ microservices scale

**Package Location**: `packages/auth-core`

**Consumers**:

- `apps/ingest-api` - Full package (middlewares, services, types)
- `apps/ui-web` - Types only + frontend composable helpers
- Future workers - Middlewares for authenticated job processing

---

## Architecture Overview

### Package Structure

```
packages/auth-core/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                    # Main exports
│   ├── config/
│   │   ├── cognito.ts              # Cognito configuration
│   │   └── redis.ts                # Redis configuration
│   ├── middlewares/
│   │   ├── cognito-auth.middleware.ts
│   │   ├── session.middleware.ts
│   │   └── organisation-scope.middleware.ts
│   ├── services/
│   │   ├── session.service.ts
│   │   └── user-sync.service.ts
│   ├── types/
│   │   ├── cognito.ts              # JWT payload types
│   │   ├── session.ts              # Session data types
│   │   └── express.d.ts            # Express type augmentation
│   └── frontend/
│       └── types.ts                # Frontend-safe type exports
└── README.md
```

### Export Strategy

```typescript
// packages/auth-core/src/index.ts

// Backend exports (Express middlewares, services)
export { cognitoAuthMiddleware } from './middlewares/cognito-auth.middleware';
export { sessionMiddleware } from './middlewares/session.middleware';
export { organisationScopeMiddleware } from './middlewares/organisation-scope.middleware';
export { SessionService } from './services/session.service';
export { UserSyncService } from './services/user-sync.service';
export { cognitoConfig } from './config/cognito';
export { redisConfig, createRedisClient } from './config/redis';

// Type exports (safe for frontend)
export type { CognitoJwtPayload } from './types/cognito';
export type { UserSession } from './types/session';

// Frontend-specific exports
export { authTypes } from './frontend/types';
```

### Consumer Integration

**Backend (ingest-api)**:

```typescript
import { cognitoAuthMiddleware, sessionMiddleware, SessionService } from '@prospectflow/auth-core';

app.use('/api', cognitoAuthMiddleware, sessionMiddleware);
```

**Frontend (ui-web)**:

```typescript
import type { CognitoJwtPayload, UserSession } from '@prospectflow/auth-core';

// Use types for API responses, state management
```

---

## Phase 1: Package Setup (1 SP)

**Goal**: Create package structure with proper TypeScript and pnpm workspace configuration

### Task 1.1: Initialize Package Structure

**Objective**: Create the `packages/auth-core` package with proper configuration

**Files to Create**:

```
packages/auth-core/
├── package.json
├── tsconfig.json
├── src/
│   └── index.ts
└── README.md
```

**Subtasks**:

1. **1.1.1**: Create `package.json`

   ```json
   {
     "name": "@prospectflow/auth-core",
     "version": "0.1.0",
     "description": "Shared authentication package for ProspectFlow services",
     "main": "dist/index.js",
     "types": "dist/index.d.ts",
     "exports": {
       ".": {
         "types": "./dist/index.d.ts",
         "import": "./dist/index.mjs",
         "require": "./dist/index.js"
       },
       "./frontend": {
         "types": "./dist/frontend/types.d.ts",
         "import": "./dist/frontend/types.mjs",
         "require": "./dist/frontend/types.js"
       }
     },
     "scripts": {
       "build": "tsup",
       "dev": "tsup --watch",
       "typecheck": "tsc --noEmit",
       "test": "vitest",
       "test:coverage": "vitest --coverage"
     },
     "peerDependencies": {
       "express": "^4.18.0",
       "redis": "^4.6.0"
     },
     "dependencies": {
       "aws-jwt-verify": "^4.0.1"
     },
     "devDependencies": {
       "@types/express": "^4.17.21",
       "@types/node": "^20.10.0",
       "tsup": "^8.0.0",
       "typescript": "^5.8.2",
       "vitest": "^1.0.0"
     }
   }
   ```

2. **1.1.2**: Create `tsconfig.json`

   ```json
   {
     "compilerOptions": {
       "target": "ES2022",
       "module": "ESNext",
       "moduleResolution": "bundler",
       "lib": ["ES2022"],
       "strict": true,
       "esModuleInterop": true,
       "skipLibCheck": true,
       "forceConsistentCasingInFileNames": true,
       "declaration": true,
       "declarationMap": true,
       "sourceMap": true,
       "outDir": "./dist",
       "rootDir": "./src"
     },
     "include": ["src/**/*"],
     "exclude": ["node_modules", "dist", "**/*.test.ts"]
   }
   ```

3. **1.1.3**: Create `tsup.config.ts` for bundling

   ```typescript
   import { defineConfig } from 'tsup';

   export default defineConfig({
     entry: ['src/index.ts', 'src/frontend/types.ts'],
     format: ['cjs', 'esm'],
     dts: true,
     splitting: false,
     sourcemap: true,
     clean: true,
   });
   ```

4. **1.1.4**: Verify pnpm workspace includes new package

   - Check `pnpm-workspace.yaml` includes `packages/*`
   - Run `pnpm install` from root to link package

**Acceptance Criteria**:

- ✅ `packages/auth-core` directory exists with proper structure
- ✅ `pnpm install` succeeds from root
- ✅ `pnpm build` in auth-core produces `dist/` with types
- ✅ Package is linkable from other workspace packages

---

### Task 1.2: Configure Workspace Linking

**Objective**: Ensure package is properly linked in pnpm monorepo

**Subtasks**:

1. **1.2.1**: Verify `pnpm-workspace.yaml`

   ```yaml
   packages:
     - 'apps/*'
     - 'packages/*'
   ```

2. **1.2.2**: Add package as dependency to `ingest-api`

   ```bash
   cd apps/ingest-api
   pnpm add @prospectflow/auth-core --workspace
   ```

3. **1.2.3**: Test import resolution

   ```typescript
   // apps/ingest-api/src/test-import.ts
   import { cognitoConfig } from '@prospectflow/auth-core';
   console.log(cognitoConfig);
   ```

**Acceptance Criteria**:

- ✅ `@prospectflow/auth-core` resolves correctly in ingest-api
- ✅ TypeScript types are available in consuming package
- ✅ Hot reload works during development

---

## Phase 2: Code Migration (1.5 SP)

**Goal**: Extract authentication code from ingest-api to shared package

### Task 2.1: Migrate Types

**Objective**: Move type definitions to shared package

**Files to Migrate**:

| Source (ingest-api)      | Destination (auth-core)  |
| ------------------------ | ------------------------ |
| `src/types/cognito.ts`   | `src/types/cognito.ts`   |
| `src/types/session.ts`   | `src/types/session.ts`   |
| `src/types/express.d.ts` | `src/types/express.d.ts` |

**Subtasks**:

1. **2.1.1**: Copy type files to auth-core
2. **2.1.2**: Update imports to be self-contained
3. **2.1.3**: Export types from `src/index.ts`
4. **2.1.4**: Delete original files from ingest-api
5. **2.1.5**: Update ingest-api imports to use package

**Acceptance Criteria**:

- ✅ All types exported from `@prospectflow/auth-core`
- ✅ No type definitions remain in ingest-api for auth
- ✅ TypeScript compiles without errors in both packages

---

### Task 2.2: Migrate Configuration

**Objective**: Move Cognito and Redis configuration to shared package

**Files to Migrate**:

| Source (ingest-api)     | Destination (auth-core) |
| ----------------------- | ----------------------- |
| `src/config/cognito.ts` | `src/config/cognito.ts` |
| `src/config/redis.ts`   | `src/config/redis.ts`   |

**Subtasks**:

1. **2.2.1**: Copy config files to auth-core
2. **2.2.2**: Make configuration injectable (accept env vars or config object)

   ```typescript
   // packages/auth-core/src/config/cognito.ts
   export interface CognitoConfigOptions {
     region?: string;
     userPoolId: string;
     clientId: string;
     issuer?: string;
   }

   export const createCognitoConfig = (options: CognitoConfigOptions) => ({
     region: options.region || process.env.AWS_REGION || 'eu-west-1',
     userPoolId: options.userPoolId || process.env.COGNITO_USER_POOL_ID!,
     clientId: options.clientId || process.env.COGNITO_CLIENT_ID!,
     issuer: options.issuer || process.env.COGNITO_ISSUER!,
   });

   // Default config using env vars
   export const cognitoConfig = createCognitoConfig({
     userPoolId: process.env.COGNITO_USER_POOL_ID!,
     clientId: process.env.COGNITO_CLIENT_ID!,
   });
   ```

3. **2.2.3**: Export from index.ts
4. **2.2.4**: Update ingest-api to import from package

**Acceptance Criteria**:

- ✅ Configuration is injectable for testing
- ✅ Default configuration works with env vars
- ✅ ingest-api uses config from package

---

### Task 2.3: Migrate Middlewares

**Objective**: Move Express authentication middlewares to shared package

**Files to Migrate**:

| Source (ingest-api)                                | Destination (auth-core)                            |
| -------------------------------------------------- | -------------------------------------------------- |
| `src/middlewares/cognito-auth.middleware.ts`       | `src/middlewares/cognito-auth.middleware.ts`       |
| `src/middlewares/session.middleware.ts`            | `src/middlewares/session.middleware.ts`            |
| `src/middlewares/organisation-scope.middleware.ts` | `src/middlewares/organisation-scope.middleware.ts` |

**Subtasks**:

1. **2.3.1**: Copy middleware files to auth-core
2. **2.3.2**: Update imports to use local types and config
3. **2.3.3**: Make middlewares configurable via factory functions

   ```typescript
   // packages/auth-core/src/middlewares/cognito-auth.middleware.ts
   import { CognitoJwtVerifier } from 'aws-jwt-verify';
   import type { RequestHandler } from 'express';
   import type { CognitoConfigOptions } from '../config/cognito';

   export const createCognitoAuthMiddleware = (config: CognitoConfigOptions): RequestHandler => {
     const verifier = CognitoJwtVerifier.create({
       userPoolId: config.userPoolId,
       clientId: config.clientId,
       tokenUse: 'access',
     });

     return async (req, res, next) => {
       // ... existing middleware logic
     };
   };

   // Default middleware using env vars
   export const cognitoAuthMiddleware = createCognitoAuthMiddleware({
     userPoolId: process.env.COGNITO_USER_POOL_ID!,
     clientId: process.env.COGNITO_CLIENT_ID!,
   });
   ```

4. **2.3.4**: Export from index.ts
5. **2.3.5**: Delete original files from ingest-api
6. **2.3.6**: Update ingest-api to import from package

**Acceptance Criteria**:

- ✅ All middlewares exported from package
- ✅ Middlewares are configurable via factory functions
- ✅ Default exports work with env vars
- ✅ ingest-api auth flow unchanged after migration

---

### Task 2.4: Migrate Services

**Objective**: Move authentication services to shared package

**Files to Migrate**:

| Source (ingest-api)                 | Destination (auth-core)             |
| ----------------------------------- | ----------------------------------- |
| `src/services/session.service.ts`   | `src/services/session.service.ts`   |
| `src/services/user-sync.service.ts` | `src/services/user-sync.service.ts` |

**Subtasks**:

1. **2.4.1**: Copy service files to auth-core
2. **2.4.2**: Update imports to use local types
3. **2.4.3**: Make services injectable (Redis client, DB pool)

   ```typescript
   // packages/auth-core/src/services/session.service.ts
   import type { RedisClientType } from 'redis';
   import type { UserSession } from '../types/session';

   export class SessionService {
     constructor(private redis: RedisClientType) {}

     async createSession(cognitoSub: string, payload: UserSession): Promise<void> {
       // ... existing logic
     }

     // ... other methods
   }
   ```

4. **2.4.4**: Export from index.ts
5. **2.4.5**: Update ingest-api to instantiate services with dependencies

**Acceptance Criteria**:

- ✅ Services are dependency-injectable
- ✅ No hard-coded Redis/DB connections in package
- ✅ ingest-api instantiates services with its own connections

---

### Task 2.5: Update ingest-api Imports

**Objective**: Replace local auth imports with package imports

**Files to Update**:

- `apps/ingest-api/src/app.ts`
- `apps/ingest-api/src/routes/*.ts`
- `apps/ingest-api/src/server.ts`

**Subtasks**:

1. **2.5.1**: Update all imports

   ```typescript
   // Before
   import { cognitoAuthMiddleware } from './middlewares/cognito-auth.middleware';
   import { SessionService } from './services/session.service';

   // After
   import { cognitoAuthMiddleware, SessionService } from '@prospectflow/auth-core';
   ```

2. **2.5.2**: Delete migrated files from ingest-api

   - `src/types/cognito.ts` ❌
   - `src/types/session.ts` ❌
   - `src/types/express.d.ts` ❌
   - `src/config/cognito.ts` ❌
   - `src/middlewares/cognito-auth.middleware.ts` ❌
   - `src/middlewares/session.middleware.ts` ❌
   - `src/middlewares/organisation-scope.middleware.ts` ❌
   - `src/services/session.service.ts` ❌
   - `src/services/user-sync.service.ts` ❌

3. **2.5.3**: Run tests to verify no regressions

**Acceptance Criteria**:

- ✅ No auth-related code remains in ingest-api (except instantiation)
- ✅ All existing tests pass
- ✅ Auth flow works end-to-end

---

## Phase 3: Frontend Exports & Documentation (0.5 SP)

**Goal**: Prepare package for frontend consumption and document usage

### Task 3.1: Create Frontend-Safe Exports

**Objective**: Export types and helpers safe for browser/Nuxt usage

**Files to Create**:

```
packages/auth-core/src/frontend/
└── types.ts
```

**Subtasks**:

1. **3.1.1**: Create `src/frontend/types.ts`

   ```typescript
   // Frontend-safe type re-exports (no Node.js dependencies)

   export interface AuthUser {
     sub: string;
     email: string;
     organisationId: string;
     role: string;
     groups: string[];
   }

   export interface AuthSession {
     user: AuthUser;
     expiresAt: number;
   }

   // Re-export types that are safe for frontend
   export type { CognitoJwtPayload } from '../types/cognito';
   export type { UserSession } from '../types/session';
   ```

2. **3.1.2**: Update `package.json` exports

   ```json
   "exports": {
     ".": {
       "types": "./dist/index.d.ts",
       "import": "./dist/index.mjs",
       "require": "./dist/index.js"
     },
     "./frontend": {
       "types": "./dist/frontend/types.d.ts",
       "import": "./dist/frontend/types.mjs",
       "require": "./dist/frontend/types.js"
     }
   }
   ```

3. **3.1.3**: Test import from simulated frontend context

**Acceptance Criteria**:

- ✅ `@prospectflow/auth-core/frontend` exports types only
- ✅ No Node.js dependencies in frontend exports
- ✅ Types are usable in Nuxt/Vue components

---

### Task 3.2: Create Package Documentation

**Objective**: Document package usage for all consumers

**Files to Create**:

```
packages/auth-core/
└── README.md
```

**Subtasks**:

1. **3.2.1**: Create comprehensive README.md

   ````markdown
   # @prospectflow/auth-core

   Shared authentication package for ProspectFlow services.

   ## Installation

   ```bash
   # From workspace root
   pnpm add @prospectflow/auth-core --filter <your-app>
   ```
   ````

   ## Backend Usage (Express)

   ```typescript
   import {
     cognitoAuthMiddleware,
     sessionMiddleware,
     SessionService,
     createCognitoAuthMiddleware,
   } from '@prospectflow/auth-core';

   // Option 1: Use default middleware (reads from env vars)
   app.use('/api', cognitoAuthMiddleware, sessionMiddleware);

   // Option 2: Create with custom config
   const authMiddleware = createCognitoAuthMiddleware({
     userPoolId: 'eu-west-1_xxxxx',
     clientId: 'your-client-id',
   });
   app.use('/api', authMiddleware);
   ```

   ## Frontend Usage (Nuxt/Vue)

   ```typescript
   import type { AuthUser, UserSession } from '@prospectflow/auth-core/frontend';

   const user = ref<AuthUser | null>(null);
   ```

   ## Environment Variables

   | Variable               | Description              | Required                |
   | ---------------------- | ------------------------ | ----------------------- |
   | `COGNITO_USER_POOL_ID` | AWS Cognito User Pool ID | Yes                     |
   | `COGNITO_CLIENT_ID`    | Cognito App Client ID    | Yes                     |
   | `COGNITO_ISSUER`       | Cognito Issuer URL       | Yes                     |
   | `AWS_REGION`           | AWS Region               | No (default: eu-west-1) |
   | `REDIS_HOST`           | Redis host               | Yes                     |
   | `REDIS_PORT`           | Redis port               | No (default: 6379)      |

   ## API Reference

   ### Middlewares

   - `cognitoAuthMiddleware` - Validates JWT tokens
   - `sessionMiddleware` - Manages Redis sessions
   - `organisationScopeMiddleware` - Enforces multi-tenant isolation

   ### Services

   - `SessionService` - CRUD operations for Redis sessions
   - `UserSyncService` - Syncs Cognito users to database

   ### Types

   - `CognitoJwtPayload` - JWT token payload structure
   - `UserSession` - Session data structure
   - `AuthUser` - Frontend user representation

   ```

   ```

**Acceptance Criteria**:

- ✅ README covers backend and frontend usage
- ✅ All exports documented
- ✅ Environment variables listed

---

### Task 3.3: Write Unit Tests

**Objective**: Ensure package has adequate test coverage

**Files to Create**:

```
packages/auth-core/src/
├── __tests__/
│   ├── middlewares/
│   │   └── cognito-auth.middleware.test.ts
│   ├── services/
│   │   └── session.service.test.ts
│   └── types.test.ts
```

**Subtasks**:

1. **3.3.1**: Migrate existing tests from ingest-api
2. **3.3.2**: Add tests for factory functions
3. **3.3.3**: Verify coverage > 80%

**Acceptance Criteria**:

- ✅ All exported functions have tests
- ✅ Coverage > 80%
- ✅ `pnpm test` passes in auth-core package

---

## Environment Variables Reference

**No new environment variables** - Package uses existing variables from Story 0.4:

```bash
# AWS Cognito (existing)
AWS_REGION=eu-west-1
COGNITO_USER_POOL_ID=<from-terraform-output>
COGNITO_CLIENT_ID=<from-terraform-output>
COGNITO_ISSUER=https://cognito-idp.eu-west-1.amazonaws.com/<pool-id>

# Redis (existing)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_SESSION_TTL=86400
```

---

## Testing Requirements

### Unit Tests

- Package exports: 100% coverage
- Middleware factory functions: 90%+ coverage
- Service classes: 90%+ coverage

### Integration Tests

- ingest-api auth flow works with package imports
- No regressions from migration

### Test Commands

```bash
# Run package tests
cd packages/auth-core
pnpm test

# Run with coverage
pnpm test:coverage

# Run ingest-api tests (verify no regressions)
cd apps/ingest-api
pnpm test
```

---

## Acceptance Criteria Summary

### AC1: Package Structure ✅

- `packages/auth-core` exists with proper structure
- TypeScript configured with declaration files
- Package builds successfully

### AC2: Code Migration ✅

- All auth types moved to package
- All auth middlewares moved to package
- All auth services moved to package
- No auth code remains in ingest-api (except instantiation)

### AC3: Workspace Integration ✅

- Package linkable via `@prospectflow/auth-core`
- ingest-api imports from package
- TypeScript types resolve correctly

### AC4: Frontend Compatibility ✅

- `/frontend` export provides types only
- No Node.js dependencies in frontend exports
- Types usable in Nuxt/Vue

### AC5: No Regressions ✅

- All existing ingest-api tests pass
- Auth flow works end-to-end
- Session management unchanged

### AC6: Documentation ✅

- README covers all usage patterns
- API reference complete
- Environment variables documented

---

## Dependencies

### Upstream (Must be completed first)

- ✅ **Story 0.4**: AWS Cognito Authentication (code to migrate)

### Downstream (Enabled by this story)

- **Story UI-0.2**: Authentication UI (can import types)
- **Future workers**: Can use auth middlewares
- **Future APIs**: Can use auth package

---

## Notes

### Why Package over Service?

- **Cognito IS the auth service**: No need for another layer
- **Local validation**: Faster, no network hop for JWT verification
- **No SPOF**: Each service validates independently
- **Simpler ops**: One less service to deploy/monitor

### Migration Strategy

- **Copy-then-delete**: Safer than move, allows rollback
- **Incremental imports**: Update one file at a time
- **Test between steps**: Run tests after each migration task

### Future Considerations

- **Auth Service**: Consider if >20 microservices or gateway needs
- **Token refresh**: May add refresh token helper to package
- **Multi-region**: May need region-aware config for global deployment

---

**Story 0.5 Ready for Development** ✅
