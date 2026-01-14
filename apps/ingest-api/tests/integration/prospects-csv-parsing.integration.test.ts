/**
 * Integration tests for CSV parsing endpoints
 * Tests the full flow: Upload → Column Detection → Parse with Mappings
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { Pool } from 'pg';
import { getPool } from '../../src/config/database.js';

// Mock logger to prevent console spam in tests
vi.mock('../../src/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  createChildLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
  timeOperation: vi.fn(async (_logger, _name, fn) => fn()),
}));

describe('CSV Parsing Integration Tests', () => {
  let pool: Pool;
  let testOrgId: string;
  let testCampaignId: string;
  let testUploadId: string;

  beforeAll(async () => {
    pool = getPool();

    // Create test organization
    const orgResult = await pool.query(
      `INSERT INTO iam.organisations (id, name) 
       VALUES (gen_random_uuid(), 'Test Org CSV') 
       RETURNING id`,
    );
    testOrgId = orgResult.rows[0].id;

    // Create test campaign
    const campaignResult = await pool.query(
      `INSERT INTO outreach.campaigns (id, organisation_id, name, status) 
       VALUES (gen_random_uuid(), $1, 'Test Campaign CSV', 'draft') 
       RETURNING id`,
      [testOrgId],
    );
    testCampaignId = campaignResult.rows[0].id;
  });

  afterAll(async () => {
    // Cleanup
    await pool.query('DELETE FROM outreach.import_uploads WHERE organisation_id = $1', [testOrgId]);
    await pool.query('DELETE FROM outreach.campaigns WHERE organisation_id = $1', [testOrgId]);
    await pool.query('DELETE FROM iam.organisations WHERE id = $1', [testOrgId]);
  });

  describe('POST /api/v1/imports/upload', () => {
    it('should upload CSV and store file buffer', async () => {
      const csvContent = `company_name,contact_email,website_url
Acme Corp,sarah@acme.com,https://acme.com
Tech Inc,john@tech.com,https://tech.com`;

      const buffer = Buffer.from(csvContent, 'utf-8');

      // Simulate upload via service layer
      const { prospectsService } = await import('../../src/services/prospects.service.js');

      const result = await prospectsService.handleUpload(testCampaignId, testOrgId, {
        originalname: 'test.csv',
        size: buffer.length,
        buffer,
      } as Express.Multer.File);

      expect(result.uploadId).toBeDefined();
      expect(result.filename).toBe('test.csv');
      expect(result.rowCount).toBe(2);

      testUploadId = result.uploadId;

      // Verify file was stored in database
      const dbResult = await pool.query(
        'SELECT file_buffer FROM outreach.import_uploads WHERE id = $1',
        [testUploadId],
      );
      expect(dbResult.rows[0].file_buffer).toBeInstanceOf(Buffer);
    });
  });

  describe('GET /api/v1/imports/:uploadId/columns', () => {
    it('should detect columns and suggest mappings', async () => {
      const { prospectsService } = await import('../../src/services/prospects.service.js');

      const result = await prospectsService.getColumnMappings(testUploadId, testOrgId);

      expect(result.uploadId).toBe(testUploadId);
      expect(result.detectedColumns).toEqual(['company_name', 'contact_email', 'website_url']);
      expect(result.suggestedMappings).toHaveLength(3);

      // All columns should match with high confidence
      expect(result.suggestedMappings[0].confidence).toBe('high');
      expect(result.suggestedMappings[0].suggested).toBe('company_name');

      expect(result.validation.valid).toBe(true);
      expect(result.validation.missing).toHaveLength(0);
    });

    it('should detect missing required columns', async () => {
      // Upload CSV without required email column
      const csvContent = `company,website
Acme Corp,https://acme.com`;
      const buffer = Buffer.from(csvContent, 'utf-8');

      const { prospectsService } = await import('../../src/services/prospects.service.js');

      const uploadResult = await prospectsService.handleUpload(testCampaignId, testOrgId, {
        originalname: 'incomplete.csv',
        size: buffer.length,
        buffer,
      } as Express.Multer.File);

      const result = await prospectsService.getColumnMappings(uploadResult.uploadId, testOrgId);

      expect(result.validation.valid).toBe(false);
      expect(result.validation.missing).toContain('contact_email');
    });
  });

  describe('POST /api/v1/imports/:uploadId/parse', () => {
    it('should parse CSV with user-confirmed mappings', async () => {
      const { prospectsService } = await import('../../src/services/prospects.service.js');

      const columnMappings = {
        company_name: 'company_name',
        contact_email: 'contact_email',
        website_url: 'website_url',
      };

      const result = await prospectsService.parseWithMappings(
        testUploadId,
        testOrgId,
        columnMappings,
      );

      expect(result.uploadId).toBe(testUploadId);
      expect(result.rowCount).toBe(2);
      expect(result.columnsMapped).toEqual(['company_name', 'contact_email', 'website_url']);
      expect(result.preview).toHaveLength(2);
      expect(result.preview[0]).toEqual({
        company_name: 'Acme Corp',
        contact_email: 'sarah@acme.com',
        website_url: 'https://acme.com',
      });
      expect(result.parseErrors).toHaveLength(0);
    });

    it('should reject parsing without required columns mapped', async () => {
      const { prospectsService } = await import('../../src/services/prospects.service.js');

      const columnMappings = {
        company_name: 'company_name',
        // Missing contact_email
      };

      await expect(
        prospectsService.parseWithMappings(testUploadId, testOrgId, columnMappings),
      ).rejects.toThrow('Missing required columns: contact_email');
    });
  });

  describe('E2E Flow: Upload → Detect → Parse', () => {
    it('should complete full CSV import flow', async () => {
      const csvContent = `Company,Email,Website,Contact Name
Startup Inc,founder@startup.com,https://startup.com,Jane Doe
Big Corp,ceo@bigcorp.com,https://bigcorp.com,John Smith`;

      const buffer = Buffer.from(csvContent, 'utf-8');
      const { prospectsService } = await import('../../src/services/prospects.service.js');

      // Step 1: Upload
      const uploadResult = await prospectsService.handleUpload(testCampaignId, testOrgId, {
        originalname: 'full-flow.csv',
        size: buffer.length,
        buffer,
      } as Express.Multer.File);

      expect(uploadResult.rowCount).toBe(2);

      // Step 2: Detect columns
      const columnResult = await prospectsService.getColumnMappings(
        uploadResult.uploadId,
        testOrgId,
      );

      expect(columnResult.detectedColumns).toEqual(['company', 'email', 'website', 'contact name']);
      expect(columnResult.validation.valid).toBe(true);

      // Step 3: Confirm mappings and parse
      const parseResult = await prospectsService.parseWithMappings(
        uploadResult.uploadId,
        testOrgId,
        {
          company: 'company_name',
          email: 'contact_email',
          website: 'website_url',
          'contact name': 'contact_name',
        },
      );

      expect(parseResult.rowCount).toBe(2);
      expect(parseResult.preview[0].company_name).toBe('Startup Inc');
      expect(parseResult.preview[0].contact_email).toBe('founder@startup.com');
      expect(parseResult.preview[1].contact_name).toBe('John Smith');
    });
  });
});
