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
    firstOccurrenceRow?: number; // For duplicate errors - indicates first row with this email
    duplicateOf?: string; // For duplicate errors - normalized email that was duplicated
  };
}

export interface ValidationResult {
  validCount: number;
  invalidCount: number;
  totalErrorCount: number;
  duplicateCount: number; // NEW - count of duplicate emails found
  errors: ValidationError[];
  validRows: Record<string, string>[];
  invalidRows: Record<string, string>[];
}

export interface ValidationSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errorsByType: Record<string, number>;
}
