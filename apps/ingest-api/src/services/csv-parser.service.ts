import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('CsvParserService');

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const PARSE_TIMEOUT = 30000; // 30 seconds

export interface ParseResult {
  headers: string[];
  data: Record<string, string>[];
  rowCount: number;
  errors: Papa.ParseError[];
}

export class CsvParserService {
  /**
   * Parse CSV or XLSX file from buffer
   * @param fileBuffer - Buffer containing CSV or XLSX content
   * @param filename - Original filename to determine file type
   * @returns ParseResult with headers, data, row count, and errors
   */
  async parse(fileBuffer: Buffer, filename?: string): Promise<ParseResult> {
    const startTime = Date.now();

    // Check file size
    if (fileBuffer.length > MAX_FILE_SIZE) {
      logger.warn(
        { fileSize: fileBuffer.length, maxSize: MAX_FILE_SIZE },
        'File size exceeds limit',
      );
      throw new Error('File size exceeds maximum allowed size of 50MB');
    }

    // Determine file type
    const isXlsx = filename?.match(/\.xlsx$/i);

    if (isXlsx) {
      logger.debug({ fileSize: fileBuffer.length, type: 'xlsx' }, 'Starting XLSX parse');
      return this.parseXlsx(fileBuffer, startTime);
    } else {
      logger.debug({ fileSize: fileBuffer.length, type: 'csv' }, 'Starting CSV parse');
      return this.parseCsv(fileBuffer, startTime);
    }
  }

  /**
   * Parse XLSX file from buffer
   */
  private parseXlsx(fileBuffer: Buffer, startTime: number): ParseResult {
    try {
      // Read workbook from buffer
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

      // Get first worksheet
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        throw new Error('Excel file contains no worksheets');
      }

      const worksheet = workbook.Sheets[firstSheetName];

      // Convert to JSON with headers
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        defval: '', // Default value for empty cells
        raw: false, // Format values as strings
      });

      // Extract headers from first row
      const headers =
        jsonData.length > 0
          ? Object.keys(jsonData[0] as Record<string, unknown>).map((h) => h.trim().toLowerCase())
          : [];

      const duration = Date.now() - startTime;
      const rowCount = jsonData.length;

      logger.info(
        {
          rowCount,
          columnCount: headers.length,
          duration,
          worksheet: firstSheetName,
        },
        'XLSX parsing complete',
      );

      return {
        headers,
        data: jsonData as Record<string, string>[],
        rowCount,
        errors: [],
      };
    } catch (error) {
      logger.error({ err: error }, 'XLSX parsing failed');
      throw new Error(`XLSX parsing failed: ${(error as Error).message}`);
    }
  }

  /**
   * Parse CSV file from buffer
   */
  private parseCsv(fileBuffer: Buffer, startTime: number): Promise<ParseResult> {

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
