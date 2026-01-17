/**
 * Integration tests for Export Errors Endpoint
 * Tests POST /api/v1/prospects/export-errors
 * 
 * These tests require a running test database and auth setup.
 * Skip when test infrastructure is not available.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../../src/app.js';
import { pool } from '../../../src/config/database.js';
import type { ValidationResult } from '../../../src/types/index.js';

// Skip integration tests if test database is not available
const TEST_DB_AVAILABLE = process.env.TEST_DB_AVAILABLE === 'true';

describe.skipIf(!TEST_DB_AVAILABLE)('POST /api/v1/prospects/export-errors', () => {
  let authToken: string;

  beforeAll(async () => {
    // Mock auth token for tests
    authToken = 'mock-token';
  });

  afterAll(async () => {
    await pool.end();
  });

  it('should export errors as CSV', async () => {
    // Arrange
    const validationResult: ValidationResult = {
      validCount: 0,
      invalidCount: 2,
      totalErrorCount: 2,
      warningCount: 0,
      duplicateCount: 0,
      campaignDuplicateCount: 0,
      organizationDuplicateCount: 0,
      errors: [
        {
          rowNumber: 1,
          field: 'contact_email',
          errorType: 'INVALID_EMAIL_FORMAT',
          message: 'Invalid email format',
          originalValue: 'invalid-email',
        },
        {
          rowNumber: 2,
          field: 'company_name',
          errorType: 'COMPANY_NAME_REQUIRED',
          message: 'Company name is required',
          originalValue: '',
        },
      ],
      warnings: [],
      validRows: [],
      invalidRows: [
        {
          company_name: 'Acme Corp',
          contact_email: 'invalid-email',
          contact_name: 'John Doe',
          website_url: 'https://acme.com',
        },
        {
          company_name: '',
          contact_email: 'jane@beta.com',
          contact_name: 'Jane Smith',
          website_url: '',
        },
      ],
    };

    // Act
    const response = await request(app)
      .post('/api/v1/prospects/export-errors')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ validationResult });

    // Assert
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.headers['content-disposition']).toContain('attachment');
    expect(response.headers['content-disposition']).toContain('validation-errors-');
    expect(response.text).toContain('Row,Company_Name,Contact_Email,Contact_Name,Website_URL,Error_Type,Error_Reason');
    expect(response.text).toContain('1,Acme Corp,invalid-email,John Doe,https://acme.com,INVALID_EMAIL_FORMAT');
    expect(response.text).toContain('2,,jane@beta.com,Jane Smith,,COMPANY_NAME_REQUIRED');
  });

  it('should return empty CSV when no errors', async () => {
    // Arrange
    const validationResult: ValidationResult = {
      validCount: 2,
      invalidCount: 0,
      totalErrorCount: 0,
      warningCount: 0,
      duplicateCount: 0,
      campaignDuplicateCount: 0,
      organizationDuplicateCount: 0,
      errors: [],
      warnings: [],
      validRows: [{ company_name: 'Acme', contact_email: 'john@acme.com' }],
      invalidRows: [],
    };

    // Act
    const response = await request(app)
      .post('/api/v1/prospects/export-errors')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ validationResult });

    // Assert
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.text).toContain('Row,Company_Name,Contact_Email,Contact_Name,Website_URL,Error_Type,Error_Reason');
    const lines = response.text.split('\n');
    expect(lines.length).toBe(2); // Header + empty line
  });

  it('should return 400 when validation result is missing', async () => {
    // Act
    const response = await request(app)
      .post('/api/v1/prospects/export-errors')
      .set('Authorization', `Bearer ${authToken}`)
      .send({});

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});
