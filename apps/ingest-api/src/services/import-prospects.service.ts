import { createChildLogger } from '../utils/logger.js';
import { prospectsRepository } from '../repositories/prospects.repository.js';
import type { ValidationResult, ValidationError } from '../types/validation.types.js';

export interface ProspectData {
  company_name: string;
  contact_email: string;
  contact_name?: string;
  website_url?: string;
}

export interface ImportSummary {
  imported: number;
  failed: number;
  prospectIds: string[];
}

export class ImportProspectsService {
  /**
   * Import valid prospects from validation result
   * @param validationResult - Result from data validation
   * @param campaignId - Campaign ID to associate prospects with
   * @param organisationId - Organisation ID for multi-tenant isolation
   * @returns Import summary with counts
   */
  async importValidProspects(
    validationResult: ValidationResult,
    campaignId: string,
    organisationId: string,
  ): Promise<ImportSummary> {
    const logger = createChildLogger('ImportProspectsService.importValidProspects');

    // Extract valid prospects (no errors)
    const validProspects = this.filterValidProspects(validationResult);

    if (validProspects.length === 0) {
      logger.warn({ campaignId, organisationId }, 'No valid prospects to import');
      return { imported: 0, failed: 0, prospectIds: [] };
    }

    logger.info(
      { campaignId, organisationId, count: validProspects.length },
      'Importing valid prospects',
    );

    try {
      // Batch insert with transaction
      const inserted = await prospectsRepository.batchInsertProspects(
        validProspects,
        campaignId,
        organisationId,
      );

      logger.info(
        { campaignId, organisationId, imported: inserted.length },
        'Prospects imported successfully',
      );

      return {
        imported: inserted.length,
        failed: 0,
        prospectIds: inserted.map((p: { id: string }) => p.id),
      };
    } catch (error) {
      logger.error({ err: error, campaignId, organisationId }, 'Error importing prospects');

      throw error; // Let global error handler format response
    }
  }

  /**
   * Filter valid prospects from validation result
   * @param result - Validation result
   * @returns Array of valid prospect data
   */
  private filterValidProspects(result: ValidationResult): ProspectData[] {
    if (!result.validProspects || result.validProspects.length === 0) {
      return [];
    }

    // Get row numbers with errors
    const errorRowNumbers = new Set(result.errors.map((e: ValidationError) => e.rowNumber));

    // Filter out rows that have errors
    return result.validProspects.filter((_: ProspectData, index: number) => !errorRowNumbers.has(index + 1));
  }
}
