import { Redis } from 'ioredis';
import { logger } from '../utils/logger.js';
import { env } from './env.js';

// Utilisation de la configuration Redis depuis env.ts
const redisConfig = env.redis;

// Création d'une instance Redis singleton
let redisClient: Redis | null = null;

/**
 * Récupère l'instance Redis existante ou en crée une nouvelle
 * @returns {Redis} Instance Redis
 */
export const getRedisClient = (): Redis => {
  if (!redisClient) {
    redisClient = new Redis(redisConfig);
    
    redisClient.on('error', (err: Error) => {
      logger.error({ err }, 'Redis connection error');
    });
    
    redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
    });
  }
  
  return redisClient;
};
