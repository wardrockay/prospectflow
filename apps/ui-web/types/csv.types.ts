// CSV Types shared between frontend and backend
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
