/**
 * Validation types for prospect data validation
 */

export type ValidationErrorType =
  | 'INVALID_EMAIL_FORMAT'
  | 'INVALID_URL_FORMAT'
  | 'COMPANY_NAME_REQUIRED'
  | 'COMPANY_NAME_TOO_LONG'
  | 'COMPANY_NAME_INVALID'
  | 'CONTACT_NAME_TOO_LONG'
  | 'CONTACT_NAME_INVALID'
  | 'DUPLICATE_EMAIL' // Within-upload duplicate
  | 'DUPLICATE_EMAIL_CAMPAIGN' // Campaign-level duplicate
  | 'VALIDATION_ERROR'; // Generic validation error

export type ValidationWarningType = 'DUPLICATE_EMAIL_ORGANIZATION'; // Organization-level duplicate (90-day window)

export interface ValidationError {
  rowNumber: number;
  field: string;
  errorType: ValidationErrorType;
  message: string;
  originalValue: string | undefined;
  metadata?: {
    firstOccurrenceRow?: number; // For within-upload duplicates - indicates first row with this email
    duplicateOf?: string; // For within-upload duplicates - normalized email that was duplicated
    existingProspectId?: string; // For cross-campaign duplicates
    campaignId?: string;
    campaignName?: string;
    existingStatus?: string;
    daysSinceContact?: number;
  };
}

export interface ValidationWarning {
  rowNumber: number;
  field: string;
  warningType: ValidationWarningType;
  message: string;
  originalValue: string;
  metadata?: {
    existingProspectId: string;
    campaignId: string;
    campaignName: string;
    existingStatus: string;
    daysSinceContact: number;
  };
}

export interface ValidationResult {
  validCount: number;
  invalidCount: number;
  totalErrorCount: number;
  warningCount: number; // Organization-level duplicate warnings count
  duplicateCount: number; // Within-upload duplicates
  campaignDuplicateCount: number; // Campaign-level duplicates (errors)
  organizationDuplicateCount: number; // Organization-level duplicates (warnings)
  errors: ValidationError[];
  warnings: ValidationWarning[]; // NEW - Organization-level duplicate warnings
  validRows: Record<string, string>[];
  invalidRows: Record<string, string>[];
  summary?: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    duplicates: number;
  };
  validProspects?: Array<{
    company_name: string;
    contact_email: string;
    contact_name?: string;
    website_url?: string;
  }>;
}

export interface ValidationSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errorsByType: Record<string, number>;
}

/**
 * Prospect data structure for database insertion
 */
export interface ProspectData {
  company_name: string;
  contact_email: string;
  contact_name?: string;
  website_url?: string;
}

/**
 * Inserted prospect result from database
 */
export interface InsertedProspect {
  id: string;
  contactEmail: string;
}

/**
 * Import summary result
 */
export interface ImportSummary {
  imported: number;
  failed: number;
  prospectIds: string[];
}
