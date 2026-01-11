import type { RedisClientType } from 'redis';
import type { UserSession, CreateSessionPayload } from '../types/session.js';
import type { RedisConfig } from '../config/redis.js';
import { redisConfig } from '../config/redis.js';

/**
 * Logger interface for SessionService
 */
export interface SessionServiceLogger {
  info: (data: Record<string, unknown>, message: string) => void;
  warn: (message: string) => void;
  error: (data: Record<string, unknown>, message: string) => void;
  debug: (message: string) => void;
}

/**
 * Default console logger
 */
const defaultLogger: SessionServiceLogger = {
  info: (data, msg) => console.log(`[SessionService] ${msg}`, data),
  warn: (msg) => console.warn(`[SessionService] ${msg}`),
  error: (data, msg) => console.error(`[SessionService] ${msg}`, data),
  debug: (msg) => console.debug(`[SessionService] ${msg}`),
};

/**
 * Session service configuration
 */
export interface SessionServiceConfig {
  /** Redis client instance */
  redisClient: RedisClientType;
  /** Session TTL in seconds (default: from redisConfig) */
  sessionTTL?: number;
  /** Logger instance (optional) */
  logger?: SessionServiceLogger;
}

/**
 * Service for managing user sessions in Redis
 */
export class SessionService {
  private readonly SESSION_PREFIX = 'session:';
  private readonly TTL: number;
  private readonly redis: RedisClientType;
  private readonly logger: SessionServiceLogger;

  /**
   * Create a new SessionService
   * @param config - Service configuration with Redis client
   */
  constructor(config: SessionServiceConfig) {
    this.redis = config.redisClient;
    this.TTL = config.sessionTTL || redisConfig.sessionTTL;
    this.logger = config.logger || defaultLogger;
  }

  /**
   * Generate Redis key for session
   */
  private getSessionKey(cognitoSub: string): string {
    return `${this.SESSION_PREFIX}${cognitoSub}`;
  }

  /**
   * Create a new session in Redis
   * @param payload - Session data from Cognito JWT
   * @returns Promise<UserSession>
   */
  async createSession(payload: CreateSessionPayload): Promise<UserSession> {
    try {
      const now = Date.now();
      const session: UserSession = {
        cognitoSub: payload.cognitoSub,
        organisationId: payload.organisationId,
        role: payload.role,
        email: payload.email,
        cognitoGroups: payload.cognitoGroups,
        lastActivity: now,
        createdAt: now,
        ipAddress: payload.ipAddress,
        userAgent: payload.userAgent,
      };

      const key = this.getSessionKey(payload.cognitoSub);
      const serialized = JSON.stringify(session);

      // Store with TTL
      await this.redis.setEx(key, this.TTL, serialized);

      this.logger.info(
        { organisationId: payload.organisationId, email: payload.email },
        `Session created for user ${payload.cognitoSub}`,
      );

      return session;
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to create session');
      throw new Error('Session creation failed');
    }
  }

  /**
   * Retrieve session from Redis
   * @param cognitoSub - Cognito user identifier
   * @returns Promise<UserSession | null>
   */
  async getSession(cognitoSub: string): Promise<UserSession | null> {
    try {
      const key = this.getSessionKey(cognitoSub);
      const data = await this.redis.get(key);

      if (!data) {
        this.logger.debug(`Session not found for user ${cognitoSub}`);
        return null;
      }

      const session: UserSession = JSON.parse(data);
      return session;
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to retrieve session');
      return null;
    }
  }

  /**
   * Update session activity timestamp and refresh TTL (sliding expiration)
   * @param cognitoSub - Cognito user identifier
   * @returns Promise<boolean> - true if updated, false if session not found
   */
  async updateActivity(cognitoSub: string): Promise<boolean> {
    try {
      const session = await this.getSession(cognitoSub);

      if (!session) {
        this.logger.debug(`Cannot update activity: session not found for ${cognitoSub}`);
        return false;
      }

      // Update lastActivity
      session.lastActivity = Date.now();

      const key = this.getSessionKey(cognitoSub);
      const serialized = JSON.stringify(session);

      // Update with refreshed TTL (sliding expiration)
      await this.redis.setEx(key, this.TTL, serialized);

      this.logger.debug(`Activity updated for user ${cognitoSub}`);
      return true;
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to update session activity');
      return false;
    }
  }

  /**
   * Delete a single session
   * @param cognitoSub - Cognito user identifier
   * @returns Promise<boolean> - true if deleted, false if not found
   */
  async deleteSession(cognitoSub: string): Promise<boolean> {
    try {
      const key = this.getSessionKey(cognitoSub);
      const result = await this.redis.del(key);

      if (result === 1) {
        this.logger.info({}, `Session deleted for user ${cognitoSub}`);
        return true;
      }

      this.logger.debug(`Session not found for deletion: ${cognitoSub}`);
      return false;
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to delete session');
      throw new Error('Session deletion failed');
    }
  }

  /**
   * Delete all sessions for a specific organisation (admin function)
   * @param organisationId - Organisation UUID
   * @returns Promise<number> - count of deleted sessions
   */
  async deleteOrganisationSessions(organisationId: string): Promise<number> {
    try {
      const pattern = `${this.SESSION_PREFIX}*`;
      let cursor = 0;
      let deletedCount = 0;

      do {
        // Scan for session keys
        const result = await this.redis.scan(cursor, {
          MATCH: pattern,
          COUNT: 100,
        });

        cursor = result.cursor;
        const keys = result.keys;

        // Check each session and delete if matches organisation
        for (const key of keys) {
          const data = await this.redis.get(key);
          if (data) {
            const session: UserSession = JSON.parse(data);
            if (session.organisationId === organisationId) {
              await this.redis.del(key);
              deletedCount++;
            }
          }
        }
      } while (cursor !== 0);

      this.logger.info({}, `Deleted ${deletedCount} sessions for organisation ${organisationId}`);
      return deletedCount;
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to delete organisation sessions');
      throw new Error('Organisation session deletion failed');
    }
  }

  /**
   * Get session TTL (time remaining until expiration)
   * @param cognitoSub - Cognito user identifier
   * @returns Promise<number> - TTL in seconds, -2 if key doesn't exist
   */
  async getSessionTTL(cognitoSub: string): Promise<number> {
    try {
      const key = this.getSessionKey(cognitoSub);
      const ttl = await this.redis.ttl(key);
      return ttl;
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to get session TTL');
      return -2;
    }
  }

  /**
   * Get all active sessions count (admin function)
   * @returns Promise<number>
   */
  async getActiveSessionsCount(): Promise<number> {
    try {
      const pattern = `${this.SESSION_PREFIX}*`;
      let cursor = 0;
      let count = 0;

      do {
        const result = await this.redis.scan(cursor, {
          MATCH: pattern,
          COUNT: 100,
        });

        cursor = result.cursor;
        count += result.keys.length;
      } while (cursor !== 0);

      return count;
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to count active sessions');
      return 0;
    }
  }
}
