/**
 * Data Validator Service
 * Validates prospect data fields using Zod schemas
 */
import { z } from 'zod';
import { createChildLogger } from '../utils/logger.js';
import { validateEmail } from '../utils/email-validator.util.js';
import { normalizeUrl } from '../utils/url-normalizer.util.js';
import { normalizeEmail } from '../utils/email-normalizer.util.js';
import type { ValidationResult, ValidationError } from '../types/validation.types.js';

const logger = createChildLogger('DataValidatorService');

const MAX_ERRORS_IN_RESPONSE = 100;

/**
 * Zod schema for prospect row validation
 */
const ProspectRowSchema = z.object({
  company_name: z
    .string()
    .trim()
    .min(1, 'Company name is required')
    .max(200, 'Company name cannot exceed 200 characters')
    .refine((val) => /[a-zA-Z]/.test(val), {
      message: 'Company name must contain at least one letter',
    }),

  contact_email: z
    .string()
    .trim()
    .refine((val) => validateEmail(val), {
      message: 'Invalid email format',
    }),

  website_url: z
    .string()
    .trim()
    .optional()
    .transform((val) => {
      // Allow empty strings
      if (!val || val.length === 0) {
        return undefined;
      }
      return val;
    })
    .refine(
      (val) => {
        if (!val) return true; // Optional field
        try {
          normalizeUrl(val);
          return true;
        } catch {
          return false;
        }
      },
      {
        message: 'Invalid URL format or protocol',
      },
    ),

  contact_name: z
    .string()
    .trim()
    .max(100, 'Contact name cannot exceed 100 characters')
    .optional()
    .transform((val) => {
      if (!val || val.length === 0) {
        return undefined;
      }
      return val;
    }),
});

export class DataValidatorService {
  /**
   * Validate prospect data rows
   * @param rows - Array of prospect data rows
   * @param organisationId - Organisation context for logging
   * @returns Validation result with valid/invalid rows and errors
   */
  async validateData(
    rows: Record<string, string>[],
    organisationId: string,
  ): Promise<ValidationResult> {
    const startTime = Date.now();

    logger.info({ rowCount: rows.length, organisationId }, 'Starting data validation');

    const validRows: Record<string, string>[] = [];
    const invalidRows: Record<string, string>[] = [];
    const allErrors: ValidationError[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 1; // 1-indexed for user display

      try {
        // Validate row with Zod schema
        const validatedRow = ProspectRowSchema.parse(row);

        // Normalize URL if present
        if (validatedRow.website_url) {
          validatedRow.website_url = normalizeUrl(validatedRow.website_url);
        }

        validRows.push(validatedRow as Record<string, string>);
      } catch (error) {
        // Row has validation errors
        invalidRows.push(row);

        if (error instanceof z.ZodError) {
          // Extract Zod validation errors
          for (const issue of error.issues) {
            const field = issue.path[0] as string;
            const errorType = this.getErrorType(field, issue.message);

            allErrors.push({
              rowNumber,
              field,
              errorType,
              message: issue.message,
              originalValue: row[field],
            });
          }
        } else {
          // Unexpected error
          logger.error({ err: error, rowNumber }, 'Unexpected validation error');
          allErrors.push({
            rowNumber,
            field: 'unknown',
            errorType: 'VALIDATION_ERROR',
            message: 'Unexpected validation error',
            originalValue: undefined,
          });
        }
      }
    }

    // Step 2: Duplicate detection (NEW)
    const duplicateErrors = this.detectDuplicates(rows);
    allErrors.push(...duplicateErrors);

    const duration = Date.now() - startTime;

    logger.info(
      {
        validCount: validRows.length,
        invalidCount: invalidRows.length,
        totalErrors: allErrors.length,
        duplicateCount: duplicateErrors.length,
        duration,
      },
      'Data validation complete',
    );

    // Limit errors in response to prevent overwhelming client
    const errorsToReturn =
      allErrors.length > MAX_ERRORS_IN_RESPONSE
        ? allErrors.slice(0, MAX_ERRORS_IN_RESPONSE)
        : allErrors;

    return {
      validCount: validRows.length,
      invalidCount: invalidRows.length,
      totalErrorCount: allErrors.length,
      duplicateCount: duplicateErrors.length,
      errors: errorsToReturn,
      validRows,
      invalidRows,
    };
  }

  /**
   * Detect duplicate emails within the upload
   * Uses case-insensitive email normalization for duplicate detection
   * @param rows - Array of prospect data rows
   * @returns Array of validation errors for duplicate emails
   */
  private detectDuplicates(rows: Record<string, string>[]): ValidationError[] {
    const emailMap = new Map<string, number>(); // normalized email -> first row number
    const duplicateErrors: ValidationError[] = [];

    logger.debug({ rowCount: rows.length }, 'Starting duplicate detection');

    for (let i = 0; i < rows.length; i++) {
      const rawEmail = rows[i].contact_email;
      if (!rawEmail) {
        // Skip rows without email - they'll be caught by field validation
        continue;
      }

      const normalizedEmail = normalizeEmail(rawEmail);
      if (!normalizedEmail) {
        // Skip empty emails
        continue;
      }

      const firstOccurrence = emailMap.get(normalizedEmail);

      if (firstOccurrence !== undefined) {
        // Duplicate found - mark this row
        duplicateErrors.push({
          rowNumber: i + 1, // 1-indexed for user display
          field: 'contact_email',
          errorType: 'DUPLICATE_EMAIL',
          message: `Duplicate email (${rawEmail}). First occurrence at row ${firstOccurrence}.`,
          originalValue: rawEmail,
          metadata: {
            firstOccurrenceRow: firstOccurrence,
            duplicateOf: normalizedEmail,
          },
        });
      } else {
        // First occurrence - record it
        emailMap.set(normalizedEmail, i + 1);
      }
    }

    logger.info(
      { duplicateCount: duplicateErrors.length, uniqueEmails: emailMap.size },
      'Duplicate detection complete',
    );

    return duplicateErrors;
  }

  /**
   * Map Zod error message to standardized error type
   * @param field - Field name
   * @param message - Zod error message
   * @returns Standardized error type constant
   */
  private getErrorType(field: string, message: string): string {
    if (field === 'company_name') {
      if (message.includes('required')) return 'COMPANY_NAME_REQUIRED';
      if (message.includes('exceed') || message.includes('200')) return 'COMPANY_NAME_TOO_LONG';
      if (message.includes('letter')) return 'COMPANY_NAME_INVALID';
      return 'COMPANY_NAME_INVALID';
    }

    if (field === 'contact_email') {
      return 'INVALID_EMAIL_FORMAT';
    }

    if (field === 'website_url') {
      return 'INVALID_URL_FORMAT';
    }

    if (field === 'contact_name') {
      if (message.includes('exceed') || message.includes('100')) return 'CONTACT_NAME_TOO_LONG';
      return 'CONTACT_NAME_INVALID';
    }

    return 'VALIDATION_ERROR';
  }
}
