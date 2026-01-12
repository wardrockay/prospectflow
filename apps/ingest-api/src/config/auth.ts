// Auth services initialization for ingest-api
// Uses @prospectflow/auth-core with application-specific configuration

import { SessionService, UserSyncService, createRedisClient } from '@prospectflow/auth-core';
import type { RedisClientType } from 'redis';
import { pool, getPool } from './database.js';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('Auth');

// Adapter for pino logger to auth-core logger format
const sessionLogger = {
  info: (data: Record<string, unknown>, message: string) => logger.info(data, message),
  warn: (message: string) => logger.warn(message),
  error: (data: Record<string, unknown>, message: string) => logger.error(data, message),
  debug: (message: string) => logger.debug(message),
};

// Redis client singleton for session management
let _redisClient: RedisClientType | null = null;

// Redis logger adapter
const redisLogger = {
  info: (msg: string) => logger.info(`Redis: ${msg}`),
  warn: (msg: string) => logger.warn(`Redis: ${msg}`),
  error: (msg: string, err?: unknown) => logger.error({ err }, `Redis: ${msg}`),
  debug: (msg: string) => logger.debug(`Redis: ${msg}`),
};

/**
 * Get or create the Redis client singleton
 */
export function getRedisClient(): RedisClientType {
  if (!_redisClient) {
    _redisClient = createRedisClient({}, redisLogger);
  }
  return _redisClient;
}

/**
 * Connect the Redis client
 */
export async function connectRedis(): Promise<void> {
  const client = getRedisClient();
  if (!client.isOpen) {
    await client.connect();
  }
}

/**
 * Disconnect the Redis client gracefully
 */
export async function disconnectRedis(): Promise<void> {
  if (_redisClient?.isReady) {
    await _redisClient.quit();
  }
}

// Session service singleton
let _sessionService: SessionService | null = null;

/**
 * Get or create the SessionService singleton
 */
export function getSessionService(): SessionService {
  if (!_sessionService) {
    _sessionService = new SessionService({
      redisClient: getRedisClient(),
      logger: sessionLogger,
    });
  }
  return _sessionService;
}

// UserSync service singleton
let _userSyncService: UserSyncService | null = null;

/**
 * Get or create the UserSyncService singleton
 */
export function getUserSyncService(): UserSyncService {
  if (!_userSyncService) {
    const dbPool = getPool();
    if (!dbPool) {
      throw new Error('Database pool not initialized');
    }
    _userSyncService = new UserSyncService({
      pool: dbPool,
      logger: sessionLogger,
    });
  }
  return _userSyncService;
}

// Export singleton instances for backward compatibility
export const redisClient = getRedisClient();
export const sessionService = getSessionService();

// Note: userSyncService requires the pool to be initialized first
// Use getUserSyncService() to get the instance lazily
