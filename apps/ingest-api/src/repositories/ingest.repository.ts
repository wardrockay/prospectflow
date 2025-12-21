import { logger } from '../utils/logger.js';
import { IngestEntity } from '../entities/ingest.entity.js';
import { PharowItem } from '../schemas/ingest.schema.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Repository pour gérer la persistance des données d'ingestion
 * Pour l'instant en mémoire, à remplacer par une vraie base de données
 */
class IngestRepository {
  private ingestData: Map<string, IngestEntity> = new Map();

  /**
   * Crée une nouvelle entrée d'ingestion
   */
  async create(data: PharowItem[]): Promise<IngestEntity> {
    const id = uuidv4();
    const ingest: IngestEntity = {
      id,
      data,
      itemCount: data.length,
      createdAt: new Date(),
      status: 'pending',
    };

    this.ingestData.set(id, ingest);
    logger.info({ id, itemCount: data.length }, 'Ingest data created in repository');

    return ingest;
  }

  /**
   * Récupère une entrée d'ingestion par son ID
   */
  async findById(id: string): Promise<IngestEntity | null> {
    return this.ingestData.get(id) || null;
  }

  /**
   * Met à jour le statut d'une ingestion
   */
  async updateStatus(id: string, status: IngestEntity['status']): Promise<IngestEntity | null> {
    const ingest = this.ingestData.get(id);
    if (!ingest) {
      return null;
    }

    ingest.status = status;
    if (status === 'completed') {
      ingest.processedAt = new Date();
    }

    this.ingestData.set(id, ingest);
    return ingest;
  }

  /**
   * Récupère toutes les entrées d'ingestion
   */
  async findAll(): Promise<IngestEntity[]> {
    return Array.from(this.ingestData.values());
  }
}

export const ingestRepository = new IngestRepository();
