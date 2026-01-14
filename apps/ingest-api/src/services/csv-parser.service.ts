import Papa from 'papaparse';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('CsvParserService');

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const PARSE_TIMEOUT = 30000; // 30 seconds

export interface ParseResult {
  headers: string[];
  data: Record<string, string>[];
  rowCount: number;
  errors: Papa.ParseError[];
}

export class CsvParserService {
  /**
   * Parse CSV file from buffer
   * @param fileBuffer - Buffer containing CSV content
   * @returns ParseResult with headers, data, row count, and errors
   */
  async parse(fileBuffer: Buffer): Promise<ParseResult> {
    const startTime = Date.now();

    // Check file size
    if (fileBuffer.length > MAX_FILE_SIZE) {
      logger.warn(
        { fileSize: fileBuffer.length, maxSize: MAX_FILE_SIZE },
        'File size exceeds limit',
      );
      throw new Error('File size exceeds maximum allowed size of 5MB');
    }

    logger.debug({ fileSize: fileBuffer.length }, 'Starting CSV parse');

    return new Promise((resolve, reject) => {
      // Timeout handler
      const timeoutId = setTimeout(() => {
        logger.error({ duration: PARSE_TIMEOUT }, 'CSV parsing timeout');
        reject(new Error('CSV parsing timed out after 30 seconds'));
      }, PARSE_TIMEOUT);

      // Remove BOM if present
      let csvContent = fileBuffer.toString('utf-8');
      if (csvContent.charCodeAt(0) === 0xfeff) {
        csvContent = csvContent.slice(1);
        logger.debug('Removed BOM from CSV content');
      }

      Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => {
          // Normalize headers: lowercase and trim
          return header.trim().toLowerCase();
        },
        dynamicTyping: false, // Keep everything as strings for validation
        complete: (results) => {
          clearTimeout(timeoutId);

          const duration = Date.now() - startTime;
          const rowCount = Array.isArray(results.data) ? results.data.length : 0;

          logger.info(
            {
              rowCount,
              columnCount: results.meta.fields?.length || 0,
              duration,
              errorCount: results.errors.length,
            },
            'CSV parsing complete',
          );

          resolve({
            headers: results.meta.fields || [],
            data: results.data as Record<string, string>[],
            rowCount,
            errors: results.errors,
          });
        },
        error: (error: Error) => {
          clearTimeout(timeoutId);
          logger.error({ err: error }, 'CSV parsing failed');
          reject(new Error(`CSV parsing failed: ${error.message}`));
        },
      });
    });
  }
}
