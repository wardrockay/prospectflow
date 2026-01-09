import { logger } from '../utils/logger.js';

/**
 * Base Service class with common service patterns
 */
export class BaseService {
  /**
   * Log business event
   */
  protected logEvent(event: string, data?: Record<string, any>) {
    logger.info(data || {}, event);
  }

  /**
   * Log error event
   */
  protected logError(event: string, error: Error, data?: Record<string, any>) {
    logger.error({ error: error.message, ...data }, event);
  }
}
