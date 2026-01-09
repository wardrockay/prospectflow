import { describe, it, expect } from 'vitest';
import { ingestService } from '../../src/services/ingest.service.js';
import { IngestDto } from '../../src/schemas/ingest.schema.js';

describe('IngestService', () => {
  describe('processIngest', () => {
    it('should create an ingest with valid Pharrow data', async () => {
      const ingestDto: IngestDto = {
        data: [
          {
            position: {
              pharowListName: '2025-11 - A prospecter',
              positionJobTitle: 'Développeur',
              positionEmail: 'test@example.com',
              positionEmailStatus: 'valid',
              positionEmailReliability: '95%',
            },
            person: {
              personLastName: 'Doe',
              personFirstName: 'John',
              personSalutation: 'Monsieur',
              personLinkedinUrl: 'https://www.linkedin.com/in/johndoe',
            },
            company: {
              pharowCompanyId: '12345',
              companyName: 'Test Company',
              companySiren: '123456789',
            },
          },
        ],
      };

      const result = await ingestService.processIngest(ingestDto);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.data).toHaveLength(1);
      expect(result.itemCount).toBe(1);
      expect(['pending', 'processing']).toContain(result.status);
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('should handle multiple Pharrow items', async () => {
      const ingestDto: IngestDto = {
        data: [
          {
            position: {
              pharowListName: 'List 1',
              positionJobTitle: 'Dev',
              positionEmail: 'dev1@example.com',
            },
            person: {
              personLastName: 'Smith',
              personFirstName: 'Alice',
            },
            company: {
              pharowCompanyId: '1',
              companyName: 'Company 1',
            },
          },
          {
            position: {
              pharowListName: 'List 2',
              positionJobTitle: 'Manager',
              positionEmail: 'manager@example.com',
            },
            person: {
              personLastName: 'Brown',
              personFirstName: 'Bob',
            },
            company: {
              pharowCompanyId: '2',
              companyName: 'Company 2',
            },
          },
        ],
      };

      const result = await ingestService.processIngest(ingestDto);

      expect(result).toBeDefined();
      expect(result.itemCount).toBe(2);
      expect(result.data).toHaveLength(2);
    });
  });
});
