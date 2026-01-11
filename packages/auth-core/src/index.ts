// @prospectflow/auth-core
// Shared authentication package for ProspectFlow services

// ============================================
// Types (safe for all consumers)
// ============================================
export type { CognitoJwtPayload } from './types/cognito.js';
export type { UserSession, CreateSessionPayload } from './types/session.js';

// ============================================
// Configuration
// ============================================
export { createCognitoConfig, cognitoConfig } from './config/cognito.js';
export type { CognitoConfigOptions } from './config/cognito.js';
export {
  redisConfig,
  createRedisClient,
  checkRedisHealth,
  type RedisConfig,
  type RedisLogger,
} from './config/redis.js';

// ============================================
// Middlewares (Express)
// ============================================
export {
  createCognitoAuthMiddleware,
  cognitoAuthMiddleware,
  type AuthMiddlewareLogger,
} from './middlewares/cognito-auth.middleware.js';
export {
  createSessionMiddleware,
  attachOrganisationId,
  createRequireRole,
  createRequireGroup,
  type SessionMiddlewareOptions,
  type SessionMiddlewareLogger,
} from './middlewares/session.middleware.js';
export {
  createOrganisationScopeMiddleware,
  organisationScopeMiddleware,
  checkOrganisationAccess,
  getOrganisationIdFromRequest,
  ForbiddenError,
  type OrgScopeMiddlewareOptions,
  type OrgScopeLogger,
} from './middlewares/organisation-scope.middleware.js';

// ============================================
// Services
// ============================================
export {
  SessionService,
  type SessionServiceConfig,
  type SessionServiceLogger,
} from './services/session.service.js';
export {
  UserSyncService,
  type User,
  type UserSyncServiceConfig,
  type UserSyncServiceLogger,
  type DatabasePool,
} from './services/user-sync.service.js';

// ============================================
// Express type augmentation
// ============================================
export type {} from './types/express.js';
