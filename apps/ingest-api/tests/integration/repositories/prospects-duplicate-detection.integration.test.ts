/**
 * Integration tests for ProspectsRepository.findExistingProspectsByEmails
 * Tests duplicate detection queries against real database
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import type { Pool } from 'pg';
import { getPool } from '../../../src/config/database.js';
import { prospectsRepository } from '../../../src/repositories/prospects.repository.js';

// Mock logger to prevent console spam in tests
vi.mock('../../../src/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  createChildLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
  timeOperation: vi.fn(async (_logger, _name, fn) => fn()),
}));

describe('ProspectsRepository - Duplicate Detection Integration Tests', () => {
  let pool: Pool;
  let testOrgId: string;
  let testCampaign1Id: string;
  let testCampaign2Id: string;

  beforeAll(async () => {
    pool = getPool();

    // Create test organization
    const orgResult = await pool.query(
      `INSERT INTO iam.organisations (id, name) 
       VALUES (gen_random_uuid(), 'Test Org Duplicates') 
       RETURNING id`,
    );
    testOrgId = orgResult.rows[0].id;

    // Create test campaigns
    const campaign1Result = await pool.query(
      `INSERT INTO outreach.campaigns (id, organisation_id, name, status) 
       VALUES (gen_random_uuid(), $1, 'Test Campaign 1', 'draft') 
       RETURNING id`,
      [testOrgId],
    );
    testCampaign1Id = campaign1Result.rows[0].id;

    const campaign2Result = await pool.query(
      `INSERT INTO outreach.campaigns (id, organisation_id, name, status) 
       VALUES (gen_random_uuid(), $1, 'Test Campaign 2', 'draft') 
       RETURNING id`,
      [testOrgId],
    );
    testCampaign2Id = campaign2Result.rows[0].id;
  });

  afterAll(async () => {
    // Cleanup
    await pool.query('DELETE FROM crm.people WHERE organisation_id = $1', [testOrgId]);
    await pool.query('DELETE FROM outreach.campaigns WHERE organisation_id = $1', [testOrgId]);
    await pool.query('DELETE FROM iam.organisations WHERE id = $1', [testOrgId]);
  });

  beforeEach(async () => {
    // Clear prospects before each test
    await pool.query('DELETE FROM crm.people WHERE organisation_id = $1', [testOrgId]);
  });

  describe('findExistingProspectsByEmails', () => {
    it('should find existing prospects by email addresses', async () => {
      // Insert test prospects
      await pool.query(
        `INSERT INTO crm.people (organisation_id, campaign_id, company_name, contact_email, status)
         VALUES ($1, $2, 'Acme Corp', 'john@acme.com', 'New')`,
        [testOrgId, testCampaign1Id],
      );

      const results = await prospectsRepository.findExistingProspectsByEmails(testOrgId, [
        'john@acme.com',
      ]);

      expect(results).toHaveLength(1);
      expect(results[0].contactEmail).toBe('john@acme.com');
      expect(results[0].campaignName).toBe('Test Campaign 1');
      expect(results[0].status).toBe('New');
      expect(results[0].daysSinceCreated).toBeGreaterThanOrEqual(0);
    });

    it('should be case-insensitive for email matching', async () => {
      await pool.query(
        `INSERT INTO crm.people (organisation_id, campaign_id, company_name, contact_email, status)
         VALUES ($1, $2, 'Acme Corp', 'John@Acme.Com', 'New')`,
        [testOrgId, testCampaign1Id],
      );

      const results = await prospectsRepository.findExistingProspectsByEmails(testOrgId, [
        'john@acme.com',
      ]);

      expect(results).toHaveLength(1);
    });

    it('should respect multi-tenant isolation', async () => {
      // Create another org
      const org2Result = await pool.query(
        `INSERT INTO iam.organisations (id, name) 
         VALUES (gen_random_uuid(), 'Other Org') 
         RETURNING id`,
      );
      const otherOrgId = org2Result.rows[0].id;

      const campaign2Result = await pool.query(
        `INSERT INTO outreach.campaigns (id, organisation_id, name, status) 
         VALUES (gen_random_uuid(), $1, 'Other Campaign', 'draft') 
         RETURNING id`,
        [otherOrgId],
      );
      const otherCampaignId = campaign2Result.rows[0].id;

      // Insert prospect in testOrg
      await pool.query(
        `INSERT INTO crm.people (organisation_id, campaign_id, company_name, contact_email, status)
         VALUES ($1, $2, 'Acme Corp', 'john@acme.com', 'New')`,
        [testOrgId, testCampaign1Id],
      );

      // Insert same email in otherOrg
      await pool.query(
        `INSERT INTO crm.people (organisation_id, campaign_id, company_name, contact_email, status)
         VALUES ($1, $2, 'Beta Corp', 'john@acme.com', 'New')`,
        [otherOrgId, otherCampaignId],
      );

      // Query testOrg - should only return testOrg prospect
      const results = await prospectsRepository.findExistingProspectsByEmails(testOrgId, [
        'john@acme.com',
      ]);

      expect(results).toHaveLength(1);
      expect(results[0].campaignName).toBe('Test Campaign 1');

      // Cleanup
      await pool.query('DELETE FROM crm.people WHERE organisation_id = $1', [otherOrgId]);
      await pool.query('DELETE FROM outreach.campaigns WHERE organisation_id = $1', [otherOrgId]);
      await pool.query('DELETE FROM iam.organisations WHERE id = $1', [otherOrgId]);
    });

    it('should handle batch lookups efficiently', async () => {
      // Insert 50 prospects
      const emails: string[] = [];
      for (let i = 0; i < 50; i++) {
        const email = `user${i}@example.com`;
        emails.push(email);
        await pool.query(
          `INSERT INTO crm.people (organisation_id, campaign_id, company_name, contact_email, status)
           VALUES ($1, $2, $3, $4, 'New')`,
          [testOrgId, testCampaign1Id, `Company ${i}`, email],
        );
      }

      const start = Date.now();
      const results = await prospectsRepository.findExistingProspectsByEmails(testOrgId, emails);
      const duration = Date.now() - start;

      expect(results).toHaveLength(50);
      expect(duration).toBeLessThan(1000); // Should complete in < 1 second
    });

    it('should return empty array for no matches', async () => {
      const results = await prospectsRepository.findExistingProspectsByEmails(testOrgId, [
        'nonexistent@example.com',
      ]);

      expect(results).toHaveLength(0);
    });

    it('should return empty array for empty email list', async () => {
      const results = await prospectsRepository.findExistingProspectsByEmails(testOrgId, []);

      expect(results).toHaveLength(0);
    });

    it('should include campaign information in results', async () => {
      await pool.query(
        `INSERT INTO crm.people (organisation_id, campaign_id, company_name, contact_email, status)
         VALUES ($1, $2, 'Acme Corp', 'john@acme.com', 'Sent')`,
        [testOrgId, testCampaign1Id],
      );

      const results = await prospectsRepository.findExistingProspectsByEmails(testOrgId, [
        'john@acme.com',
      ]);

      expect(results[0]).toMatchObject({
        contactEmail: 'john@acme.com',
        campaignId: testCampaign1Id,
        campaignName: 'Test Campaign 1',
        status: 'Sent',
      });
      expect(results[0].id).toBeDefined();
      expect(results[0].createdAt).toBeInstanceOf(Date);
      expect(results[0].daysSinceCreated).toBeGreaterThanOrEqual(0);
    });

    it('should order results by created_at DESC (most recent first)', async () => {
      // Insert older prospect
      await pool.query(
        `INSERT INTO crm.people (organisation_id, campaign_id, company_name, contact_email, status, created_at)
         VALUES ($1, $2, 'Acme Corp', 'john@acme.com', 'Sent', NOW() - INTERVAL '30 days')`,
        [testOrgId, testCampaign1Id],
      );

      // Insert newer prospect (different campaign)
      await pool.query(
        `INSERT INTO crm.people (organisation_id, campaign_id, company_name, contact_email, status, created_at)
         VALUES ($1, $2, 'Acme Corp', 'john@acme.com', 'New', NOW() - INTERVAL '5 days')`,
        [testOrgId, testCampaign2Id],
      );

      const results = await prospectsRepository.findExistingProspectsByEmails(testOrgId, [
        'john@acme.com',
      ]);

      expect(results).toHaveLength(2);
      expect(results[0].campaignId).toBe(testCampaign2Id); // Most recent first
      expect(results[0].daysSinceCreated).toBeLessThan(results[1].daysSinceCreated);
    });

    it('should calculate daysSinceCreated correctly', async () => {
      // Insert prospect created 45 days ago
      await pool.query(
        `INSERT INTO crm.people (organisation_id, campaign_id, company_name, contact_email, status, created_at)
         VALUES ($1, $2, 'Acme Corp', 'john@acme.com', 'Sent', NOW() - INTERVAL '45 days')`,
        [testOrgId, testCampaign1Id],
      );

      const results = await prospectsRepository.findExistingProspectsByEmails(testOrgId, [
        'john@acme.com',
      ]);

      expect(results[0].daysSinceCreated).toBeGreaterThanOrEqual(44); // Allow 1 day tolerance
      expect(results[0].daysSinceCreated).toBeLessThanOrEqual(46);
    });
  });

  describe('Performance Benchmarks', () => {
    it('should handle 100 email lookups in < 1 second', async () => {
      // Insert 100 prospects
      const emails: string[] = [];
      for (let i = 0; i < 100; i++) {
        const email = `user${i}@example.com`;
        emails.push(email);
        await pool.query(
          `INSERT INTO crm.people (organisation_id, campaign_id, company_name, contact_email, status)
           VALUES ($1, $2, $3, $4, 'New')`,
          [testOrgId, testCampaign1Id, `Company ${i}`, email],
        );
      }

      const start = Date.now();
      const results = await prospectsRepository.findExistingProspectsByEmails(testOrgId, emails);
      const duration = Date.now() - start;

      expect(results).toHaveLength(100);
      expect(duration).toBeLessThan(1000); // AC3: < 1 second for 100 emails
    });

    it('should handle partial matches (some emails exist, some do not)', async () => {
      // Insert only 3 out of 10 emails
      await pool.query(
        `INSERT INTO crm.people (organisation_id, campaign_id, company_name, contact_email, status)
         VALUES 
           ($1, $2, 'Company 1', 'exists1@example.com', 'New'),
           ($1, $2, 'Company 2', 'exists2@example.com', 'New'),
           ($1, $2, 'Company 3', 'exists3@example.com', 'New')`,
        [testOrgId, testCampaign1Id],
      );

      const emails = [
        'exists1@example.com',
        'notexists1@example.com',
        'exists2@example.com',
        'notexists2@example.com',
        'exists3@example.com',
      ];

      const results = await prospectsRepository.findExistingProspectsByEmails(testOrgId, emails);

      expect(results).toHaveLength(3);
      expect(results.map((r) => r.contactEmail).sort()).toEqual([
        'exists1@example.com',
        'exists2@example.com',
        'exists3@example.com',
      ]);
    });
  });
});
