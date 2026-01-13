import { createChildLogger } from '../utils/logger.js';
import type { Logger } from 'pino';

/**
 * Base Service class with common service patterns
 */
export class BaseService {
  protected logger: Logger;

  constructor(moduleName: string = 'BaseService') {
    this.logger = createChildLogger(moduleName);
  }

  /**
   * Log business event
   */
  protected logEvent(event: string, data?: Record<string, any>) {
    this.logger.info(data || {}, event);
  }

  /**
   * Log error event
   */
  protected logError(event: string, error: Error, data?: Record<string, any>) {
    this.logger.error({ error: error.message, ...data }, event);
  }
}
