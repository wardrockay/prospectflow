import { createChildLogger } from '../utils/logger.js';
import { ingestRepository } from '../repositories/ingest.repository.js';
import { IngestEntity } from '../entities/ingest.entity.js';
import { IngestDto } from '../schemas/ingest.schema.js';

const logger = createChildLogger('IngestService');

/**
 * Service pour la logique métier de l'ingestion
 */
class IngestService {
  /**
   * Traite les données d'ingestion Pharrow
   */
  async processIngest(ingestDto: IngestDto): Promise<IngestEntity> {
    logger.info({ itemCount: ingestDto.data.length }, 'Processing Pharrow ingest data');

    // Créer les entrées en base de données PostgreSQL
    const ingest = await ingestRepository.create(ingestDto.data);

    logger.info(
      { id: ingest.id, itemCount: ingest.itemCount },
      'Pharrow data successfully stored in PostgreSQL',
    );

    return ingest;
  }
}

export const ingestService = new IngestService();
