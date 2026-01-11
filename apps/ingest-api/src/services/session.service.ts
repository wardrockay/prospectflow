import { redisClient, redisConfig } from '../config/redis.js';
import { UserSession, CreateSessionPayload } from '../types/session.js';
import { logger } from '../utils/logger.js';

export class SessionService {
  private readonly SESSION_PREFIX = 'session:';
  private readonly TTL = redisConfig.sessionTTL;

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
      await redisClient.setEx(key, this.TTL, serialized);

      logger.info(
        { organisationId: payload.organisationId, email: payload.email },
        `Session created for user ${payload.cognitoSub}`,
      );

      return session;
    } catch (error) {
      logger.error({ err: error }, 'Failed to create session');
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
      const data = await redisClient.get(key);

      if (!data) {
        logger.debug(`Session not found for user ${cognitoSub}`);
        return null;
      }

      const session: UserSession = JSON.parse(data);
      return session;
    } catch (error) {
      logger.error({ err: error }, 'Failed to retrieve session');
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
        logger.debug(`Cannot update activity: session not found for ${cognitoSub}`);
        return false;
      }

      // Update lastActivity
      session.lastActivity = Date.now();

      const key = this.getSessionKey(cognitoSub);
      const serialized = JSON.stringify(session);

      // Update with refreshed TTL (sliding expiration)
      await redisClient.setEx(key, this.TTL, serialized);

      logger.debug(`Activity updated for user ${cognitoSub}`);
      return true;
    } catch (error) {
      logger.error({ err: error }, 'Failed to update session activity');
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
      const result = await redisClient.del(key);

      if (result === 1) {
        logger.info(`Session deleted for user ${cognitoSub}`);
        return true;
      }

      logger.debug(`Session not found for deletion: ${cognitoSub}`);
      return false;
    } catch (error) {
      logger.error({ err: error }, 'Failed to delete session');
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
        const result = await redisClient.scan(cursor, {
          MATCH: pattern,
          COUNT: 100,
        });

        cursor = result.cursor;
        const keys = result.keys;

        // Check each session and delete if matches organisation
        for (const key of keys) {
          const data = await redisClient.get(key);
          if (data) {
            const session: UserSession = JSON.parse(data);
            if (session.organisationId === organisationId) {
              await redisClient.del(key);
              deletedCount++;
            }
          }
        }
      } while (cursor !== 0);

      logger.info(`Deleted ${deletedCount} sessions for organisation ${organisationId}`);
      return deletedCount;
    } catch (error) {
      logger.error({ err: error }, 'Failed to delete organisation sessions');
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
      const ttl = await redisClient.ttl(key);
      return ttl;
    } catch (error) {
      logger.error({ err: error }, 'Failed to get session TTL');
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
        const result = await redisClient.scan(cursor, {
          MATCH: pattern,
          COUNT: 100,
        });

        cursor = result.cursor;
        count += result.keys.length;
      } while (cursor !== 0);

      return count;
    } catch (error) {
      logger.error({ err: error }, 'Failed to count active sessions');
      return 0;
    }
  }
}

// Export singleton instance
export const sessionService = new SessionService();
