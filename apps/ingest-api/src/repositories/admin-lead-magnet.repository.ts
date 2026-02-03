import { createChildLogger, timeOperation } from '../utils/logger.js';
import { getPool } from '../config/database.js';
import { DatabaseError } from '../errors/DatabaseError.js';
import type { Pool } from 'pg';

const logger = createChildLogger('AdminLeadMagnetRepository');

export interface LeadMagnetStats {
  total_signups: number;
  confirmed: number;
  confirmation_rate: number;
  unique_downloaders: number;
  total_downloads: number;
  avg_hours_to_confirm: number;
}

export interface SubscriberListItem {
  id: string;
  email: string;
  status: 'pending' | 'confirmed' | 'unsubscribed' | 'bounced';
  source: string | null;
  created_at: Date;
  confirmed_at: Date | null;
  download_count: number;
}

export interface SubscriberDetail extends SubscriberListItem {
  tags: Record<string, unknown> | null;
  unsubscribed_at: Date | null;
  last_email_sent_at: Date | null;
  consent_events: Array<{
    event_type: 'signup' | 'confirm' | 'unsubscribe';
    occurred_at: Date;
    ip: string | null;
    user_agent: string | null;
  }>;
  download_tokens: Array<{
    purpose: string;
    created_at: Date;
    used_at: Date | null;
    use_count: number;
    max_uses: number;
  }>;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Repository for admin operations on Lead Magnet system
 * Provides analytics, subscriber management, and reporting
 */
class AdminLeadMagnetRepository {
  private pool: Pool;

  constructor() {
    this.pool = getPool();
  }

  /**
   * Get lead magnet statistics for specified period
   * @param period - '7d', '30d', '90d', or 'all'
   */
  async getStats(period: '7d' | '30d' | '90d' | 'all' = 'all'): Promise<LeadMagnetStats> {
    logger.debug({ period }, 'Fetching lead magnet stats');

    try {
      // Build date filter based on period
      let dateFilter = '';
      switch (period) {
        case '7d':
          dateFilter = "AND created_at > NOW() - INTERVAL '7 days'";
          break;
        case '30d':
          dateFilter = "AND created_at > NOW() - INTERVAL '30 days'";
          break;
        case '90d':
          dateFilter = "AND created_at > NOW() - INTERVAL '90 days'";
          break;
        case 'all':
        default:
          dateFilter = '';
      }

      const result = await timeOperation(logger, 'db.admin.getStats', async () => {
        return this.pool.query<{
          total_signups: string;
          confirmed: string;
          confirmation_rate: string;
          unique_downloaders: string;
          total_downloads: string;
          avg_hours_to_confirm: string;
        }>(
          `
          SELECT 
            COUNT(*) as total_signups,
            COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
            ROUND(
              COUNT(*) FILTER (WHERE status = 'confirmed') * 100.0 / NULLIF(COUNT(*), 0), 
              1
            ) as confirmation_rate,
            (
              SELECT COUNT(DISTINCT subscriber_id) 
              FROM lm_download_tokens 
              WHERE used_at IS NOT NULL
            ) as unique_downloaders,
            (
              SELECT COALESCE(SUM(use_count), 0) 
              FROM lm_download_tokens 
              WHERE used_at IS NOT NULL
            ) as total_downloads,
            ROUND(
              AVG(EXTRACT(EPOCH FROM (confirmed_at - created_at)) / 3600) 
                FILTER (WHERE confirmed_at IS NOT NULL), 
              1
            ) as avg_hours_to_confirm
          FROM lm_subscribers
          WHERE 1=1 ${dateFilter}
          `,
        );
      });

      const row = result.rows[0];

      return {
        total_signups: parseInt(row.total_signups) || 0,
        confirmed: parseInt(row.confirmed) || 0,
        confirmation_rate: parseFloat(row.confirmation_rate) || 0,
        unique_downloaders: parseInt(row.unique_downloaders) || 0,
        total_downloads: parseInt(row.total_downloads) || 0,
        avg_hours_to_confirm: parseFloat(row.avg_hours_to_confirm) || 0,
      };
    } catch (error) {
      logger.error({ err: error, period }, 'Failed to fetch stats');
      throw new DatabaseError('Failed to fetch lead magnet statistics');
    }
  }

  /**
   * Get paginated list of subscribers with search and sort
   */
  async listSubscribers(options: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<PaginatedResult<SubscriberListItem>> {
    const page = options.page || 1;
    const limit = options.limit || 25;
    const offset = (page - 1) * limit;
    const sortBy = options.sortBy || 'created_at';
    const sortOrder = options.sortOrder || 'desc';
    const search = options.search?.trim();

    logger.debug({ page, limit, sortBy, sortOrder, search }, 'Listing subscribers');

    try {
      // Build WHERE clause for search
      let whereClause = '';
      const params: unknown[] = [];
      
      if (search) {
        whereClause = 'WHERE LOWER(email) LIKE LOWER($1)';
        params.push(`%${search}%`);
      }

      // Validate sortBy to prevent SQL injection
      const allowedSortColumns = ['email', 'status', 'source', 'created_at', 'confirmed_at'];
      const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
      const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';

      // Get total count
      const countResult = await this.pool.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM lm_subscribers ${whereClause}`,
        params,
      );
      const total = parseInt(countResult.rows[0].count);

      // Get paginated data with download count
      const dataParams = search ? [...params, limit, offset] : [limit, offset];
      const dataResult = await timeOperation(logger, 'db.admin.listSubscribers', async () => {
        return this.pool.query<SubscriberListItem>(
          `
          SELECT 
            s.id,
            s.email,
            s.status,
            s.source,
            s.created_at,
            s.confirmed_at,
            COALESCE(
              (SELECT SUM(use_count) 
               FROM lm_download_tokens 
               WHERE subscriber_id = s.id AND used_at IS NOT NULL), 
              0
            ) as download_count
          FROM lm_subscribers s
          ${whereClause}
          ORDER BY ${safeSortBy} ${safeSortOrder}
          LIMIT $${search ? 2 : 1} OFFSET $${search ? 3 : 2}
          `,
          dataParams,
        );
      });

      return {
        data: dataResult.rows,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error({ err: error, options }, 'Failed to list subscribers');
      throw new DatabaseError('Failed to list subscribers');
    }
  }

  /**
   * Get detailed information about a single subscriber
   */
  async getSubscriberDetail(subscriberId: string): Promise<SubscriberDetail | null> {
    logger.debug({ subscriberId }, 'Fetching subscriber detail');

    try {
      // Get subscriber basic info with download count
      const subscriberResult = await this.pool.query<SubscriberListItem>(
        `
        SELECT 
          s.id,
          s.email,
          s.status,
          s.source,
          s.tags,
          s.created_at,
          s.confirmed_at,
          s.unsubscribed_at,
          s.last_email_sent_at,
          COALESCE(
            (SELECT SUM(use_count) 
             FROM lm_download_tokens 
             WHERE subscriber_id = s.id AND used_at IS NOT NULL), 
            0
          ) as download_count
        FROM lm_subscribers s
        WHERE s.id = $1
        `,
        [subscriberId],
      );

      if (subscriberResult.rows.length === 0) {
        return null;
      }

      const subscriber = subscriberResult.rows[0] as SubscriberDetail;

      // Get consent events
      const consentResult = await this.pool.query(
        `
        SELECT event_type, occurred_at, ip, user_agent
        FROM lm_consent_events
        WHERE subscriber_id = $1
        ORDER BY occurred_at DESC
        `,
        [subscriberId],
      );
      subscriber.consent_events = consentResult.rows;

      // Get download tokens
      const tokensResult = await this.pool.query(
        `
        SELECT purpose, created_at, used_at, use_count, max_uses
        FROM lm_download_tokens
        WHERE subscriber_id = $1
        ORDER BY created_at DESC
        `,
        [subscriberId],
      );
      subscriber.download_tokens = tokensResult.rows;

      return subscriber;
    } catch (error) {
      logger.error({ err: error, subscriberId }, 'Failed to fetch subscriber detail');
      throw new DatabaseError('Failed to fetch subscriber details');
    }
  }

  /**
   * Delete a subscriber and all related data (RGPD compliance)
   * Uses CASCADE to automatically remove consent_events and download_tokens
   */
  async deleteSubscriber(subscriberId: string): Promise<boolean> {
    logger.info({ subscriberId }, 'Deleting subscriber (RGPD)');

    try {
      const result = await timeOperation(logger, 'db.admin.deleteSubscriber', async () => {
        return this.pool.query(
          `DELETE FROM lm_subscribers WHERE id = $1`,
          [subscriberId],
        );
      });

      const deleted = result.rowCount && result.rowCount > 0;
      
      if (deleted) {
        logger.info({ subscriberId }, 'Subscriber deleted successfully (cascaded to related tables)');
      } else {
        logger.warn({ subscriberId }, 'Subscriber not found for deletion');
      }

      return deleted;
    } catch (error) {
      logger.error({ err: error, subscriberId }, 'Failed to delete subscriber');
      throw new DatabaseError('Failed to delete subscriber');
    }
  }

  /**
   * Export subscribers to CSV format
   * Returns data for filtered subscribers
   */
  async exportSubscribers(search?: string): Promise<SubscriberListItem[]> {
    logger.debug({ search }, 'Exporting subscribers to CSV');

    try {
      let whereClause = '';
      const params: unknown[] = [];
      
      if (search?.trim()) {
        whereClause = 'WHERE LOWER(email) LIKE LOWER($1)';
        params.push(`%${search.trim()}%`);
      }

      const result = await timeOperation(logger, 'db.admin.exportSubscribers', async () => {
        return this.pool.query<SubscriberListItem>(
          `
          SELECT 
            s.id,
            s.email,
            s.status,
            s.source,
            s.created_at,
            s.confirmed_at,
            COALESCE(
              (SELECT SUM(use_count) 
               FROM lm_download_tokens 
               WHERE subscriber_id = s.id AND used_at IS NOT NULL), 
              0
            ) as download_count
          FROM lm_subscribers s
          ${whereClause}
          ORDER BY s.created_at DESC
          `,
          params,
        );
      });

      logger.info({ count: result.rows.length }, 'Subscribers exported');
      return result.rows;
    } catch (error) {
      logger.error({ err: error }, 'Failed to export subscribers');
      throw new DatabaseError('Failed to export subscribers');
    }
  }
}

// Singleton instance
let instance: AdminLeadMagnetRepository | null = null;

export function getAdminLeadMagnetRepository(): AdminLeadMagnetRepository {
  if (!instance) {
    instance = new AdminLeadMagnetRepository();
  }
  return instance;
}
