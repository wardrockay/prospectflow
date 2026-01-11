import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger.js';

// Redis configuration from environment
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  sessionTTL: parseInt(process.env.REDIS_SESSION_TTL || '86400', 10),
};

// Create Redis client
const redisClient: RedisClientType = createClient({
  socket: {
    host: redisConfig.host,
    port: redisConfig.port,
    reconnectStrategy: (retries: number) => {
      if (retries > 10) {
        logger.error('Redis: Max reconnection attempts reached');
        return new Error('Max reconnection attempts reached');
      }
      const delay = Math.min(retries * 100, 3000);
      logger.warn(`Redis: Reconnecting in ${delay}ms (attempt ${retries})`);
      return delay;
    },
  },
  password: redisConfig.password,
  database: redisConfig.db,
});

// Event handlers
redisClient.on('connect', () => {
  logger.info('Redis: Connection established');
});

redisClient.on('ready', () => {
  logger.info('Redis: Client ready to accept commands');
});

redisClient.on('error', (err) => {
  logger.error('Redis: Connection error', err);
});

redisClient.on('reconnecting', () => {
  logger.warn('Redis: Attempting to reconnect...');
});

redisClient.on('end', () => {
  logger.info('Redis: Connection closed');
});

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing Redis connection...');
  if (redisClient.isOpen) {
    await redisClient.quit();
  }
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing Redis connection...');
  if (redisClient.isOpen) {
    await redisClient.quit();
  }
});

// Export client and config
export { redisClient, redisConfig };

// Helper function to check Redis health
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const pong = await redisClient.ping();
    return pong === 'PONG';
  } catch (error) {
    logger.error({ err: error }, 'Redis health check failed');
    return false;
  }
}
