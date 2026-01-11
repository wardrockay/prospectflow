import { createClient, type RedisClientType } from 'redis';

/**
 * Redis configuration options
 */
export interface RedisConfig {
  /** Redis host (default: localhost) */
  host: string;
  /** Redis port (default: 6379) */
  port: number;
  /** Redis password (optional) */
  password?: string;
  /** Redis database number (default: 0) */
  db: number;
  /** Session TTL in seconds (default: 86400 = 24 hours) */
  sessionTTL: number;
}

/**
 * Default Redis configuration from environment variables
 */
export const redisConfig: RedisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  sessionTTL: parseInt(process.env.REDIS_SESSION_TTL || '86400', 10),
};

/**
 * Logger interface for Redis client
 * Allows consumers to inject their own logger
 */
export interface RedisLogger {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string, error?: unknown) => void;
  debug: (message: string) => void;
}

/**
 * Default console logger
 */
const defaultLogger: RedisLogger = {
  info: (msg) => console.log(`[Redis] ${msg}`),
  warn: (msg) => console.warn(`[Redis] ${msg}`),
  error: (msg, err) => console.error(`[Redis] ${msg}`, err),
  debug: (msg) => console.debug(`[Redis] ${msg}`),
};

/**
 * Create a Redis client with the given configuration
 * @param config - Redis configuration options
 * @param logger - Optional logger for Redis events
 * @returns Configured Redis client
 */
export function createRedisClient(
  config: Partial<RedisConfig> = {},
  logger: RedisLogger = defaultLogger,
): RedisClientType {
  const mergedConfig = { ...redisConfig, ...config };

  const client: RedisClientType = createClient({
    socket: {
      host: mergedConfig.host,
      port: mergedConfig.port,
      reconnectStrategy: (retries: number) => {
        if (retries > 10) {
          logger.error('Max reconnection attempts reached');
          return new Error('Max reconnection attempts reached');
        }
        const delay = Math.min(retries * 100, 3000);
        logger.warn(`Reconnecting in ${delay}ms (attempt ${retries})`);
        return delay;
      },
    },
    password: mergedConfig.password,
    database: mergedConfig.db,
  });

  // Event handlers
  client.on('connect', () => {
    logger.info('Connection established');
  });

  client.on('ready', () => {
    logger.info('Client ready to accept commands');
  });

  client.on('error', (err) => {
    logger.error('Connection error', err);
  });

  client.on('reconnecting', () => {
    logger.warn('Attempting to reconnect...');
  });

  client.on('end', () => {
    logger.info('Connection closed');
  });

  return client;
}

/**
 * Helper function to check Redis health
 * @param client - Redis client to check
 * @param logger - Optional logger for health check results
 * @returns true if Redis is healthy, false otherwise
 */
export async function checkRedisHealth(
  client: RedisClientType,
  logger: RedisLogger = defaultLogger,
): Promise<boolean> {
  try {
    const pong = await client.ping();
    return pong === 'PONG';
  } catch (error) {
    logger.error('Health check failed', error);
    return false;
  }
}
