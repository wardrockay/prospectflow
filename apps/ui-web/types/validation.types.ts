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
  | 'DUPLICATE_EMAIL';

export interface ValidationError {
  rowNumber: number;
  field: string;
  errorType: string;
  message: string;
  originalValue: string | undefined;
  metadata?: {
    firstOccurrenceRow?: number;
    duplicateOf?: string;
  };
}

export interface ValidationResult {
  validCount: number;
  invalidCount: number;
  totalErrorCount: number;
  duplicateCount: number;
  errors: ValidationError[];
  validRows: Record<string, string>[];
  invalidRows: Record<string, string>[];
}

export interface ImportSummary {
  imported: number;
  failed: number;
  prospectIds: string[];
}
