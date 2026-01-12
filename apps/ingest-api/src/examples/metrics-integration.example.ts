// Example: Database Metrics Integration
// This file shows how to integrate metrics.utils.ts in repositories

import { trackDatabaseQuery, updateConnectionPoolMetrics } from '../utils/metrics.utils.js';
import { db } from '../config/database.js';

export class ExampleRepository {
  /**
   * Example: Tracking a SELECT query
   */
  async findUserById(userId: string, organisationId: string) {
    return await trackDatabaseQuery('SELECT', 'iam', async () => {
      const result = await db.query(
        'SELECT * FROM iam.users WHERE id = $1 AND organisation_id = $2',
        [userId, organisationId],
      );
      return result.rows[0];
    });
  }

  /**
   * Example: Tracking an INSERT query
   */
  async createCampaign(data: any, organisationId: string) {
    return await trackDatabaseQuery('INSERT', 'crm', async () => {
      const result = await db.query(
        'INSERT INTO crm.campaigns (name, organisation_id) VALUES ($1, $2) RETURNING *',
        [data.name, organisationId],
      );
      return result.rows[0];
    });
  }

  /**
   * Example: Tracking an UPDATE query
   */
  async updateCampaignStatus(campaignId: string, status: string) {
    return await trackDatabaseQuery('UPDATE', 'crm', async () => {
      await db.query('UPDATE crm.campaigns SET status = $1 WHERE id = $2', [status, campaignId]);
    });
  }

  /**
   * Example: Update connection pool metrics
   * Call this periodically or on pool events
   */
  updatePoolMetrics() {
    const pool = db.pool;
    updateConnectionPoolMetrics(pool.totalCount - pool.idleCount, pool.idleCount);
  }
}

// Example: Business Metrics Integration
import {
  emailsSentTotal,
  draftsGeneratedTotal,
  prospectsProcessedTotal,
} from '../config/metrics.js';

export class EmailService {
  async sendEmail(emailData: any, organisationId: string, campaignId: string) {
    try {
      // ... send email logic
      await this.sendToProvider(emailData);

      // Track success
      emailsSentTotal.inc({
        organisation_id: organisationId,
        campaign_id: campaignId,
        success: 'true',
      });

      return { success: true };
    } catch (error) {
      // Track failure
      emailsSentTotal.inc({
        organisation_id: organisationId,
        campaign_id: campaignId,
        success: 'false',
      });

      throw error;
    }
  }
}

export class DraftService {
  async generateDraft(prospectId: string, organisationId: string) {
    try {
      // ... generate draft logic
      const draft = await this.callAI(prospectId);

      // Track success
      draftsGeneratedTotal.inc({
        organisation_id: organisationId,
        success: 'true',
      });

      return draft;
    } catch (error) {
      // Track failure
      draftsGeneratedTotal.inc({
        organisation_id: organisationId,
        success: 'false',
      });

      throw error;
    }
  }
}

export class ProspectService {
  async importProspects(prospects: any[], organisationId: string) {
    for (const prospect of prospects) {
      // ... import logic

      // Track each prospect processed
      prospectsProcessedTotal.inc({
        organisation_id: organisationId,
        action: 'imported',
      });
    }
  }

  async validateProspect(prospectId: string, organisationId: string) {
    // ... validation logic

    prospectsProcessedTotal.inc({
      organisation_id: organisationId,
      action: 'validated',
    });
  }
}
