import { logger } from './logger.js';
import { getRedisClient } from '../config/redis.js';

/**
 * Options pour la fonction getOrSetCache
 * @interface CacheOptions
 */
export interface CacheOptions {
  /** Durée de vie du cache en secondes */
  ttl?: number;
  /** Préfixe à ajouter à la clé */
  prefix?: string;
}

/**
 * Récupère une valeur depuis le cache ou l'y stocke si elle n'existe pas
 * @template T Type de la valeur à récupérer/stocker
 * @param {string} key Clé de cache
 * @param {() => Promise<T>} fetchFn Fonction asynchrone pour récupérer la donnée si elle n'est pas en cache
 * @param {CacheOptions} options Options de cache (ttl, prefix)
 * @returns {Promise<T>} Valeur récupérée depuis le cache ou générée par fetchFn
 * @throws {Error} Si une erreur survient lors de la récupération ou du stockage des données
 */
export const getOrSetCache = async <T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> => {
  const { ttl = 3600, prefix = '' } = options;
  const cacheKey = `${prefix}${key}`;
  const redis = getRedisClient();
  
  try {
    // Tentative de récupération depuis le cache
    const cachedData = await redis.get(cacheKey);
    
    if (cachedData) {
      try {
        // Tentative de parsing des données JSON
        logger.debug({ key: cacheKey }, 'Cache HIT');
        return JSON.parse(cachedData) as T;
      } catch (parseError: unknown) {
        logger.warn({ key: cacheKey, error: parseError }, 'Failed to parse cached data, fetching fresh data');
        // Si le parsing échoue, on continue pour récupérer des données fraîches
      }
    }
    
    // Log du cache miss
    logger.debug({ key: cacheKey }, 'Cache MISS');
    
    // Si pas de données en cache ou parsing échoué, on récupère des données fraîches
    const freshData = await fetchFn();
    
    // Stockage des nouvelles données en cache
    await redis.set(
      cacheKey,
      JSON.stringify(freshData),
      'EX',
      ttl
    );
    
    return freshData;
  } catch (error: unknown) {
    logger.error({ key: cacheKey, error }, 'Error in getOrSetCache');
    
    // En cas d'erreur avec Redis, on exécute quand même la fonction de récupération
    // pour assurer la disponibilité des données même si le cache échoue
    return fetchFn();
  }
};

/**
 * Supprime une entrée spécifique du cache
 * @param {string} key Clé de cache à invalider
 * @param {string} [prefix=''] Préfixe optionnel de la clé
 * @returns {Promise<boolean>} true si la suppression a réussi, false sinon
 */
export const invalidateCache = async (key: string, prefix = ''): Promise<boolean> => {
  const cacheKey = `${prefix}${key}`;
  const redis = getRedisClient();
  
  try {
    await redis.del(cacheKey);
    return true;
  } catch (error: unknown) {
    logger.error({ key: cacheKey, error }, 'Error invalidating cache');
    return false;
  }
};

/**
 * Supprime toutes les entrées du cache correspondant à un motif
 * @param {string} pattern Motif de clés à supprimer (ex: 'user:*')
 * @returns {Promise<number>} Nombre de clés supprimées
 */
export const invalidateCachePattern = async (pattern: string): Promise<number> => {
  const redis = getRedisClient();
  
  try {
    const keys = await redis.keys(pattern);
    
    if (keys.length === 0) {
      return 0;
    }
    
    const pipeline = redis.pipeline();
    keys.forEach((key: string) => pipeline.del(key));
    
    const results = await pipeline.exec();
    return results ? results.length : 0;
  } catch (error) {
    logger.error({ pattern, error }, 'Error invalidating cache pattern');
    return 0;
  }
};
