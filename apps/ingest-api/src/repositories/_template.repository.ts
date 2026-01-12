/**
 * Template de Repository
 *
 * Copiez ce fichier pour créer un nouveau repository.
 * Remplacez "Example" par le nom de votre entité.
 *
 * Usage:
 *   cp src/repositories/_template.repository.ts src/repositories/mon-entite.repository.ts
 */

import { createChildLogger, timeOperation } from '../utils/logger.js';
import { getPool } from '../config/database.js';
import { DatabaseError } from '../errors/DatabaseError.js';

// ⚠️ IMPORTANT: Toujours utiliser createChildLogger avec le nom du module
const logger = createChildLogger('ExampleRepository');

interface ExampleEntity {
  id: string;
  name: string;
  organisationId: string;
  createdAt: Date;
}

/**
 * Repository pour [décrire l'entité]
 */
class ExampleRepository {
  /**
   * Récupère une entité par ID avec isolation multi-tenant
   */
  async findById(id: string, organisationId: string): Promise<ExampleEntity | null> {
    const pool = getPool();

    try {
      // Utiliser timeOperation pour les requêtes DB
      const result = await timeOperation(logger, 'db.example.findById', async () => {
        return pool.query<ExampleEntity>(
          `SELECT * FROM examples WHERE id = $1 AND organisation_id = $2`,
          [id, organisationId],
        );
      });

      if (result.rows.length === 0) {
        logger.debug({ id, organisationId }, 'Entity not found');
        return null;
      }

      return result.rows[0];
    } catch (error) {
      logger.error({ err: error, id, organisationId }, 'Failed to fetch entity');
      throw new DatabaseError('Failed to fetch entity');
    }
  }

  /**
   * Crée une nouvelle entité
   */
  async create(
    data: Omit<ExampleEntity, 'id' | 'createdAt'>,
    organisationId: string,
  ): Promise<ExampleEntity> {
    const pool = getPool();

    logger.info({ name: data.name, organisationId }, 'Creating entity');

    try {
      const result = await timeOperation(logger, 'db.example.create', async () => {
        return pool.query<ExampleEntity>(
          `INSERT INTO examples (name, organisation_id) 
           VALUES ($1, $2) 
           RETURNING *`,
          [data.name, organisationId],
        );
      });

      const entity = result.rows[0];
      logger.info({ id: entity.id, organisationId }, 'Entity created');

      return entity;
    } catch (error) {
      logger.error({ err: error, data, organisationId }, 'Failed to create entity');
      throw new DatabaseError('Failed to create entity');
    }
  }

  /**
   * Liste les entités avec pagination
   */
  async findAll(
    organisationId: string,
    options: { limit?: number; offset?: number } = {},
  ): Promise<ExampleEntity[]> {
    const pool = getPool();
    const { limit = 50, offset = 0 } = options;

    logger.debug({ organisationId, limit, offset }, 'Listing entities');

    try {
      const result = await timeOperation(logger, 'db.example.findAll', async () => {
        return pool.query<ExampleEntity>(
          `SELECT * FROM examples 
           WHERE organisation_id = $1 
           ORDER BY created_at DESC 
           LIMIT $2 OFFSET $3`,
          [organisationId, limit, offset],
        );
      });

      logger.debug({ organisationId, count: result.rows.length }, 'Entities retrieved');

      return result.rows;
    } catch (error) {
      logger.error({ err: error, organisationId }, 'Failed to list entities');
      throw new DatabaseError('Failed to list entities');
    }
  }
}

export const exampleRepository = new ExampleRepository();
