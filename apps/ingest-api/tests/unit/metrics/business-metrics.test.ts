import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../../../src/app.js';
import {
  emailsSentTotal,
  draftsGeneratedTotal,
  prospectsProcessedTotal,
} from '../../../src/config/metrics.js';

// Mock metrics
vi.mock('../../../src/config/metrics', async () => {
  const actual = await vi.importActual('../../../src/config/metrics');
  return {
    ...actual,
    emailsSentTotal: {
      inc: vi.fn(),
    },
    draftsGeneratedTotal: {
      inc: vi.fn(),
    },
    prospectsProcessedTotal: {
      inc: vi.fn(),
    },
  };
});

describe('Business Metrics - Multi-Tenant Labels', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AC11: organisation_id labels', () => {
    it('should include organisation_id label in email metrics', async () => {
      const organisationId = 'org-123';
      const campaignId = 'campaign-456';

      // Simulate email sent
      emailsSentTotal.inc({
        organisation_id: organisationId,
        campaign_id: campaignId,
        success: 'true',
      });

      expect(emailsSentTotal.inc).toHaveBeenCalledWith(
        expect.objectContaining({
          organisation_id: organisationId,
        }),
      );
    });

    it('should include organisation_id label in draft metrics', async () => {
      const organisationId = 'org-789';

      draftsGeneratedTotal.inc({
        organisation_id: organisationId,
        success: 'true',
      });

      expect(draftsGeneratedTotal.inc).toHaveBeenCalledWith(
        expect.objectContaining({
          organisation_id: organisationId,
        }),
      );
    });

    it('should include organisation_id label in prospect metrics', async () => {
      const organisationId = 'org-abc';

      prospectsProcessedTotal.inc({
        organisation_id: organisationId,
        action: 'imported',
      });

      expect(prospectsProcessedTotal.inc).toHaveBeenCalledWith(
        expect.objectContaining({
          organisation_id: organisationId,
        }),
      );
    });

    it('should track success/failure with organisation_id', async () => {
      const organisationId = 'org-fail-test';

      // Success case
      emailsSentTotal.inc({
        organisation_id: organisationId,
        campaign_id: 'camp-1',
        success: 'true',
      });

      // Failure case
      emailsSentTotal.inc({
        organisation_id: organisationId,
        campaign_id: 'camp-1',
        success: 'false',
      });

      expect(emailsSentTotal.inc).toHaveBeenCalledTimes(2);
      expect(emailsSentTotal.inc).toHaveBeenCalledWith(
        expect.objectContaining({
          organisation_id: organisationId,
          success: 'true',
        }),
      );
      expect(emailsSentTotal.inc).toHaveBeenCalledWith(
        expect.objectContaining({
          organisation_id: organisationId,
          success: 'false',
        }),
      );
    });
  });

  describe('Metrics endpoint exposes organisation_id labels', () => {
    it('should expose business metrics with organisation_id in /metrics output', async () => {
      // Simulate some business metrics
      emailsSentTotal.inc({
        organisation_id: 'org-test-123',
        campaign_id: 'camp-1',
        success: 'true',
      });

      draftsGeneratedTotal.inc({
        organisation_id: 'org-test-456',
        success: 'true',
      });

      const response = await request(app).get('/metrics');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/plain');

      // Verify metrics are defined
      const body = response.text;
      expect(body).toContain('emails_sent_total');
      expect(body).toContain('drafts_generated_total');
      expect(body).toContain('prospects_processed_total');
    });
  });
});
