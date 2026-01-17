import { createChildLogger } from '../utils/logger.js';
import type { ValidationResult } from '../types/validation.types.js';
import { stringify } from 'csv-stringify/sync';

export class ExportErrorsService {
  private readonly logger = createChildLogger('ExportErrorsService');

  /**
   * Generate CSV file with validation errors
   * @param validationResult - Validation result with errors
   * @returns CSV string
   */
  async generateErrorCSV(validationResult: ValidationResult): Promise<string> {
    const logger = createChildLogger('ExportErrorsService.generateErrorCSV');

    if (!validationResult.errors || validationResult.errors.length === 0) {
      logger.warn('No errors to export');
      return this.generateEmptyCSV();
    }

    logger.info({ errorCount: validationResult.errors.length }, 'Generating error CSV');

    // Map error row numbers to get original row data
    const errorRowMap = new Map(
      validationResult.errors.map((error) => [error.rowNumber, error]),
    );

    // Build CSV rows with original data + error reason
    const rows = validationResult.invalidRows.map((row, index) => {
      const rowNumber = index + 1;
      const error = errorRowMap.get(rowNumber);

      return {
        Row: rowNumber,
        Company_Name: row.company_name || '',
        Contact_Email: row.contact_email || '',
        Contact_Name: row.contact_name || '',
        Website_URL: row.website_url || '',
        Error_Type: error?.errorType || 'UNKNOWN',
        Error_Reason: error?.message || 'Unknown error',
      };
    });

    // Generate CSV
    const csv = stringify(rows, {
      header: true,
      columns: [
        'Row',
        'Company_Name',
        'Contact_Email',
        'Contact_Name',
        'Website_URL',
        'Error_Type',
        'Error_Reason',
      ],
    });

    logger.info({ rowCount: rows.length }, 'Error CSV generated');

    return csv;
  }

  /**
   * Generate empty CSV with headers only
   */
  private generateEmptyCSV(): string {
    return stringify([], {
      header: true,
      columns: [
        'Row',
        'Company_Name',
        'Contact_Email',
        'Contact_Name',
        'Website_URL',
        'Error_Type',
        'Error_Reason',
      ],
    });
  }
}
