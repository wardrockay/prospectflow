import { logger } from '../utils/logger.js';
import { ingestRepository } from '../repositories/ingest.repository.js';
import { IngestEntity } from '../entities/ingest.entity.js';
import { IngestDto } from '../schemas/ingest.schema.js';

/**
 * Service pour la logique métier de l'ingestion
 */
class IngestService {
  /**
   * Traite les données d'ingestion Pharrow
   */
  async processIngest(ingestDto: IngestDto): Promise<IngestEntity> {
    logger.info({ itemCount: ingestDto.data.length }, 'Processing Pharrow ingest data');

    // Créer l'entrée en base
    const ingest = await ingestRepository.create(ingestDto.data);

    // Traitement asynchrone
    // Dans un cas réel, vous enverriez à RabbitMQ pour traitement par les workers
    this.processAsync(ingest.id).catch((err) => {
      logger.error({ err, id: ingest.id }, 'Error processing ingest asynchronously');
    });

    return ingest;
  }

  /**
   * Traitement asynchrone des données
   * TODO: Envoyer à RabbitMQ pour traitement distribué
   */
  private async processAsync(id: string): Promise<void> {
    try {
      // Mettre à jour le statut à "processing"
      await ingestRepository.updateStatus(id, 'processing');

      // Récupérer les données
      const ingest = await ingestRepository.findById(id);
      if (!ingest) {
        throw new Error('Ingest not found');
      }

      // TODO: Implémenter la logique métier
      // 1. Valider et enrichir les données
      // 2. Créer/mettre à jour les contacts dans votre CRM
      // 3. Envoyer à la queue pour les workers (draft, followup, etc.)
      logger.info({ id, itemCount: ingest.itemCount }, 'Processing Pharrow data items');

      // Simuler un traitement
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mettre à jour le statut à "completed"
      await ingestRepository.updateStatus(id, 'completed');
      logger.info({ id, itemCount: ingest.itemCount }, 'Ingest processing completed');
    } catch (error) {
      await ingestRepository.updateStatus(id, 'failed');
      logger.error({ error, id }, 'Ingest processing failed');
      throw error;
    }
  }
}

export const ingestService = new IngestService();
