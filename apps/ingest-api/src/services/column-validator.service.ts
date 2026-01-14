import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('ColumnValidatorService');

export interface ColumnMapping {
  detected: string;
  suggested: string;
  confidence: 'high' | 'medium' | 'low';
  required: boolean;
}

export interface ValidationResult {
  valid: boolean;
  missing: string[];
}

export class ColumnValidatorService {
  private readonly REQUIRED_COLUMNS = ['company_name', 'contact_email'];
  private readonly OPTIONAL_COLUMNS = ['contact_name', 'website_url'];

  // Column aliases mapping: target column -> array of recognized aliases
  private readonly COLUMN_ALIASES: Record<string, string[]> = {
    company_name: ['company', 'nom_entreprise', 'enterprise', 'organization', 'société', 'societe'],
    contact_email: ['email', 'mail', 'e-mail', 'email_address', 'contact_mail', 'courriel'],
    contact_name: ['name', 'nom', 'contact', 'person', 'full_name', 'fullname', 'prénom', 'prenom'],
    website_url: ['website', 'url', 'site', 'web', 'site_web', 'siteweb'],
  };

  /**
   * Suggest mappings for detected columns
   * @param detectedColumns - Array of column names from CSV
   * @returns Array of ColumnMapping suggestions
   */
  suggestMappings(detectedColumns: string[]): ColumnMapping[] {
    logger.debug({ detectedColumns }, 'Suggesting column mappings');

    const mappings = detectedColumns.map((col) => {
      const normalized = col.toLowerCase().trim();

      // Check for exact match (column name or alias)
      for (const [standardColumn, aliases] of Object.entries(this.COLUMN_ALIASES)) {
        if (normalized === standardColumn || aliases.includes(normalized)) {
          return {
            detected: col,
            suggested: standardColumn,
            confidence: 'high' as const,
            required: this.REQUIRED_COLUMNS.includes(standardColumn),
          };
        }
      }

      // Check for partial match (substring)
      for (const [standardColumn, aliases] of Object.entries(this.COLUMN_ALIASES)) {
        const allMatches = [standardColumn, ...aliases];
        if (allMatches.some((match) => normalized.includes(match) || match.includes(normalized))) {
          return {
            detected: col,
            suggested: standardColumn,
            confidence: 'medium' as const,
            required: this.REQUIRED_COLUMNS.includes(standardColumn),
          };
        }
      }

      // No match found
      return {
        detected: col,
        suggested: '',
        confidence: 'low' as const,
        required: false,
      };
    });

    logger.info(
      {
        detectedCount: detectedColumns.length,
        highConfidence: mappings.filter((m) => m.confidence === 'high').length,
        mediumConfidence: mappings.filter((m) => m.confidence === 'medium').length,
        lowConfidence: mappings.filter((m) => m.confidence === 'low').length,
      },
      'Column mappings suggested',
    );

    return mappings;
  }

  /**
   * Validate that all required columns are mapped
   * @param mappings - Array of column mappings
   * @returns Validation result with missing columns
   */
  validateRequiredColumns(mappings: ColumnMapping[]): ValidationResult {
    // Get all successfully mapped columns (non-empty suggested)
    const mappedColumns = mappings.filter((m) => m.suggested).map((m) => m.suggested);

    // Find required columns that are missing
    const missing = this.REQUIRED_COLUMNS.filter((required) => !mappedColumns.includes(required));

    const valid = missing.length === 0;

    if (!valid) {
      logger.warn({ missing, mappedColumns }, 'Required columns missing');
    } else {
      logger.debug({ mappedColumns }, 'All required columns present');
    }

    return {
      valid,
      missing,
    };
  }

  /**
   * Get list of required columns
   * @returns Array of required column names
   */
  getRequiredColumns(): string[] {
    return [...this.REQUIRED_COLUMNS];
  }

  /**
   * Get list of optional columns
   * @returns Array of optional column names
   */
  getOptionalColumns(): string[] {
    return [...this.OPTIONAL_COLUMNS];
  }
}
