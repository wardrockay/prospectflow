/**
 * Integration tests for Import Prospects Endpoint
 * Tests POST /api/v1/prospects/import
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../../src/app.js';
import { pool } from '../../../src/config/database.js';
import { v4 as uuidv4 } from 'uuid';
import type { ValidationResult } from '../../../src/types/index.js';

describe('POST /api/v1/prospects/import', () => {
  const orgId = `org-test-${uuidv4()}`;
  const campaignId = `campaign-test-${uuidv4()}`;
  let authToken: string;

  beforeAll(async () => {
    // Mock auth token for tests
    authToken = 'mock-token';

    // Create test campaign
    await pool.query(
      `INSERT INTO outreach.campaigns (organisation_id, id, name, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())`,
      [orgId, campaignId, 'Test Campaign', 'ACTIVE'],
    );
  });

  afterAll(async () => {
    // Cleanup test data
    await pool.query('DELETE FROM crm.people WHERE organisation_id = $1', [orgId]);
    await pool.query('DELETE FROM outreach.campaigns WHERE organisation_id = $1', [orgId]);
    await pool.end();
  });

  beforeEach(async () => {
    // Clean prospects before each test
    await pool.query('DELETE FROM crm.people WHERE organisation_id = $1', [orgId]);
  });

  it('should import valid prospects successfully', async () => {
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
      validRows: [
        {
          company_name: 'Acme Corp',
          contact_email: 'john@acme.com',
          contact_name: 'John Doe',
          website_url: 'https://acme.com',
        },
        {
          company_name: 'Beta Inc',
          contact_email: 'jane@beta.com',
          contact_name: 'Jane Smith',
          website_url: 'https://beta.com',
        },
      ],
      invalidRows: [],
      validProspects: [
        {
          company_name: 'Acme Corp',
          contact_email: 'john@acme.com',
          contact_name: 'John Doe',
          website_url: 'https://acme.com',
        },
        {
          company_name: 'Beta Inc',
          contact_email: 'jane@beta.com',
          contact_name: 'Jane Smith',
          website_url: 'https://beta.com',
        },
      ],
    };

    // Act
    const response = await request(app)
      .post('/api/v1/prospects/import')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-organisation-id', orgId)
      .send({ validationResult, campaignId });

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.imported).toBe(2);
    expect(response.body.data.failed).toBe(0);
    expect(response.body.data.prospectIds).toHaveLength(2);

    // Verify database insert
    const result = await pool.query(
      'SELECT * FROM crm.people WHERE organisation_id = $1 AND campaign_id = $2',
      [orgId, campaignId],
    );
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].company_name).toBe('Acme Corp');
    expect(result.rows[1].company_name).toBe('Beta Inc');
  });

  it('should return empty result when no valid prospects', async () => {
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
          message: 'Invalid email',
          originalValue: 'invalid',
        },
      ],
      warnings: [],
      validRows: [],
      invalidRows: [{ company_name: 'Test', contact_email: 'invalid' }],
      validProspects: [],
    };

    // Act
    const response = await request(app)
      .post('/api/v1/prospects/import')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-organisation-id', orgId)
      .send({ validationResult, campaignId });

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.imported).toBe(0);
  });

  it('should return 400 when validation result is missing', async () => {
    // Act
    const response = await request(app)
      .post('/api/v1/prospects/import')
      .set('Authorization', `Bearer ${authToken}`)
      .set('x-organisation-id', orgId)
      .send({ campaignId });

    // Assert
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should return 401 when organisation ID is missing', async () => {
    // Arrange
    const validationResult: ValidationResult = {
      validCount: 0,
      invalidCount: 0,
      totalErrorCount: 0,
      warningCount: 0,
      duplicateCount: 0,
      campaignDuplicateCount: 0,
      organizationDuplicateCount: 0,
      errors: [],
      warnings: [],
      validRows: [],
      invalidRows: [],
      validProspects: [],
    };

    // Act
    const response = await request(app)
      .post('/api/v1/prospects/import')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ validationResult, campaignId });

    // Assert
    expect(response.status).toBe(401);
  });
});
