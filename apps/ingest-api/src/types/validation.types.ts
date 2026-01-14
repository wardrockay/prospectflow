/**
 * Validation types for prospect data validation
 */

export interface ValidationError {
  rowNumber: number;
  field: string;
  errorType: string;
  message: string;
  originalValue: string | undefined;
}

export interface ValidationResult {
  validCount: number;
  invalidCount: number;
  totalErrorCount: number;
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
