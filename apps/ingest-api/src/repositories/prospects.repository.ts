/**
 * Prospects Repository - Database access for prospects and related entities
 */
import { createChildLogger, timeOperation } from '../utils/logger.js';
import { getPool } from '../config/database.js';
import { DatabaseError } from '../errors/DatabaseError.js';

const logger = createChildLogger('ProspectsRepository');

interface Campaign {
  id: string;
  name: string;
  organisationId: string;
}

/**
 * Repository for prospect-related database operations
 */
class ProspectsRepository {
  /**
   * Find campaign by ID with multi-tenant isolation
   */
  async findCampaignByIdAndOrg(
    campaignId: string,
    organisationId: string,
  ): Promise<Campaign | null> {
    const pool = getPool();

    try {
      const result = await timeOperation(logger, 'db.prospects.findCampaign', async () => {
        return pool.query<Campaign>(
          `SELECT id, name, organisation_id as "organisationId" 
           FROM crm.campaigns 
           WHERE id = $1 AND organisation_id = $2`,
          [campaignId, organisationId],
        );
      });

      if (result.rows.length === 0) {
        logger.debug({ campaignId, organisationId }, 'Campaign not found');
        return null;
      }

      return result.rows[0];
    } catch (error) {
      logger.error({ err: error, campaignId, organisationId }, 'Failed to fetch campaign');
      throw new DatabaseError('Failed to fetch campaign');
    }
  }
}

export const prospectsRepository = new ProspectsRepository();
