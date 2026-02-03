import type { Request, Response } from 'express';
import { createChildLogger } from '../utils/logger.js';
import { getAdminLeadMagnetRepository } from '../repositories/admin-lead-magnet.repository.js';
import { ValidationError } from '../errors/ValidationError.js';

const logger = createChildLogger('AdminLeadMagnetController');
const adminRepo = getAdminLeadMagnetRepository();

/**
 * GET /api/admin/lead-magnet/stats
 * Query params: period (7d, 30d, 90d, all)
 */
export async function getStats(req: Request, res: Response): Promise<void> {
  try {
    const period = (req.query.period as string) || 'all';
    
    // Validate period
    const validPeriods = ['7d', '30d', '90d', 'all'];
    if (!validPeriods.includes(period)) {
      throw new ValidationError(`Invalid period. Must be one of: ${validPeriods.join(', ')}`);
    }

    logger.info({ period }, 'Fetching lead magnet stats');

    const stats = await adminRepo.getStats(period as '7d' | '30d' | '90d' | 'all');

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to get stats');
    
    if (error instanceof ValidationError) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch statistics',
      });
    }
  }
}

/**
 * GET /api/admin/lead-magnet/subscribers
 * Query params: page, limit, search, sortBy, sortOrder
 */
export async function listSubscribers(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 25;
    const search = req.query.search as string;
    const sortBy = req.query.sortBy as string;
    const sortOrder = (req.query.sortOrder as string) === 'asc' ? 'asc' : 'desc';

    // Validate pagination params
    if (page < 1) {
      throw new ValidationError('Page must be >= 1');
    }
    if (limit < 1 || limit > 100) {
      throw new ValidationError('Limit must be between 1 and 100');
    }

    logger.info({ page, limit, search, sortBy, sortOrder }, 'Listing subscribers');

    const result = await adminRepo.listSubscribers({
      page,
      limit,
      search,
      sortBy,
      sortOrder,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to list subscribers');
    
    if (error instanceof ValidationError) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to list subscribers',
      });
    }
  }
}

/**
 * GET /api/admin/lead-magnet/subscribers/:id
 */
export async function getSubscriberDetail(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new ValidationError('Invalid subscriber ID format');
    }

    logger.info({ subscriberId: id }, 'Fetching subscriber detail');

    const subscriber = await adminRepo.getSubscriberDetail(id);

    if (!subscriber) {
      res.status(404).json({
        success: false,
        error: 'Subscriber not found',
      });
      return;
    }

    res.json({
      success: true,
      data: subscriber,
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to get subscriber detail');
    
    if (error instanceof ValidationError) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch subscriber details',
      });
    }
  }
}

/**
 * DELETE /api/admin/lead-magnet/subscribers/:id
 * RGPD compliance - cascade delete all related data
 */
export async function deleteSubscriber(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new ValidationError('Invalid subscriber ID format');
    }

    logger.info({ subscriberId: id }, 'Deleting subscriber (RGPD)');

    const deleted = await adminRepo.deleteSubscriber(id);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: 'Subscriber not found',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Subscriber and all related data deleted successfully',
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to delete subscriber');
    
    if (error instanceof ValidationError) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to delete subscriber',
      });
    }
  }
}

/**
 * GET /api/admin/lead-magnet/subscribers/export
 * Export subscribers to CSV format
 */
export async function exportSubscribers(req: Request, res: Response): Promise<void> {
  try {
    const search = req.query.search as string;

    logger.info({ search }, 'Exporting subscribers to CSV');

    const subscribers = await adminRepo.exportSubscribers(search);

    // Build CSV
    const headers = ['Email', 'Statut', 'Source', 'Date inscription', 'Date confirmation', 'Téléchargements'];
    const csvRows = [headers.join(',')];

    for (const sub of subscribers) {
      const row = [
        `"${sub.email}"`,
        sub.status,
        sub.source || '',
        sub.created_at.toISOString(),
        sub.confirmed_at?.toISOString() || '',
        sub.download_count.toString(),
      ];
      csvRows.push(row.join(','));
    }

    const csv = csvRows.join('\n');

    // Set CSV headers
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="subscribers-${new Date().toISOString().split('T')[0]}.csv"`);
    
    // Add BOM for Excel UTF-8 compatibility
    res.write('\ufeff');
    res.write(csv);
    res.end();
  } catch (error) {
    logger.error({ err: error }, 'Failed to export subscribers');
    
    res.status(500).json({
      success: false,
      error: 'Failed to export subscribers',
    });
  }
}
