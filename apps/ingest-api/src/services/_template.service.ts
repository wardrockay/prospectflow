/**
 * Template de Service
 *
 * Copiez ce fichier pour créer un nouveau service.
 * Remplacez "Example" par le nom de votre service.
 *
 * Usage:
 *   cp src/services/_template.service.ts src/services/mon-nouveau.service.ts
 */

import { createChildLogger, timeOperation } from '../utils/logger.js';

// ⚠️ IMPORTANT: Toujours utiliser createChildLogger avec le nom du module
const logger = createChildLogger('ExampleService');

/**
 * Service pour [décrire la responsabilité]
 */
class ExampleService {
  /**
   * Exemple de méthode avec logging approprié
   */
  async processData(data: { id: string; items: unknown[] }): Promise<void> {
    // Log de début avec contexte
    logger.info({ dataId: data.id, itemCount: data.items.length }, 'Processing started');

    try {
      // Utiliser timeOperation pour mesurer les opérations longues
      const result = await timeOperation(logger, 'example.heavyOperation', async () => {
        // ... votre logique métier
        return { success: true };
      });

      // Log de succès
      logger.info({ dataId: data.id, result }, 'Processing completed');
    } catch (error) {
      // Log d'erreur avec contexte complet
      logger.error(
        {
          err: error,
          dataId: data.id,
          itemCount: data.items.length,
        },
        'Processing failed',
      );
      throw error;
    }
  }

  /**
   * Exemple avec différents niveaux de log
   */
  async fetchWithRetry(url: string, maxRetries = 3): Promise<unknown> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.debug({ url, attempt }, 'Fetching URL');

        // ... fetch logic
        const data = {}; // placeholder

        logger.info({ url }, 'Fetch successful');
        return data;
      } catch (error) {
        if (attempt < maxRetries) {
          // Warning car on va retry
          logger.warn({ url, attempt, maxRetries, err: error }, 'Fetch failed, retrying');
        } else {
          // Error car c'est le dernier essai
          logger.error({ url, attempts: maxRetries, err: error }, 'Fetch failed after all retries');
          throw error;
        }
      }
    }
  }
}

export const exampleService = new ExampleService();
