import type { ColumnMapping, ValidationResult } from '../services/column-validator.service.js';

export interface ColumnDetectionResponse {
  uploadId: string;
  detectedColumns: string[];
  suggestedMappings: ColumnMapping[];
  validation: ValidationResult;
}

export interface ParsedCsvData {
  uploadId: string;
  rowCount: number;
  columnsMapped: string[];
  preview: Record<string, string>[];
  parseErrors: Array<{
    row?: number;
    message: string;
  }>;
}

export interface ColumnMappingsInput {
  columnMappings: Record<string, string>;
}
