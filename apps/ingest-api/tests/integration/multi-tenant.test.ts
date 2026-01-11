/**
 * Multi-Tenant Isolation Integration Tests
 * Validates that users from different organisations cannot access each other's data
 *
 * Test scenarios:
 * - User from Org A creates resource → belongs to Org A
 * - User from Org B cannot access Org A's resources (403 Forbidden)
 * - User from Org A can access their own resources
 * - List endpoints only return resources from user's organisation
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import {
  checkOrganisationAccess,
  getOrganisationIdFromRequest,
} from '../../src/middlewares/organisation-scope.middleware';
import { ForbiddenError } from '../../src/errors/http-errors';
import { Request } from 'express';

// Mock logger to prevent console noise
vi.mock('../../src/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('Multi-Tenant Isolation', () => {
  // Test organisations
  const orgAlpha = {
    id: uuidv4(),
    name: 'Organisation Alpha',
  };

  const orgBeta = {
    id: uuidv4(),
    name: 'Organisation Beta',
  };

  // Test users
  const userFromOrgAlpha = {
    sub: uuidv4(),
    email: 'alice@alpha.com',
    organisationId: orgAlpha.id,
    role: 'user',
  };

  const userFromOrgBeta = {
    sub: uuidv4(),
    email: 'bob@beta.com',
    organisationId: orgBeta.id,
    role: 'admin',
  };

  // Test resources (simulated)
  const prospectFromOrgAlpha = {
    id: uuidv4(),
    organisation_id: orgAlpha.id,
    name: 'Alice Prospect',
    email: 'prospect@example.com',
  };

  const prospectFromOrgBeta = {
    id: uuidv4(),
    organisation_id: orgBeta.id,
    name: 'Bob Prospect',
    email: 'prospect2@example.com',
  };

  const campaignFromOrgAlpha = {
    id: uuidv4(),
    organisation_id: orgAlpha.id,
    name: 'Alpha Campaign',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Organisation Access Validation', () => {
    describe('Same organisation access (allowed)', () => {
      it('should allow User A to access resources from Org A', () => {
        expect(() => {
          checkOrganisationAccess(
            prospectFromOrgAlpha.organisation_id,
            userFromOrgAlpha.organisationId,
            'prospect',
          );
        }).not.toThrow();
      });

      it('should allow User B to access resources from Org B', () => {
        expect(() => {
          checkOrganisationAccess(
            prospectFromOrgBeta.organisation_id,
            userFromOrgBeta.organisationId,
            'prospect',
          );
        }).not.toThrow();
      });

      it('should allow access to campaign from same organisation', () => {
        expect(() => {
          checkOrganisationAccess(
            campaignFromOrgAlpha.organisation_id,
            userFromOrgAlpha.organisationId,
            'campaign',
          );
        }).not.toThrow();
      });
    });

    describe('Cross-tenant access (forbidden)', () => {
      it('should deny User B from accessing Org A prospect', () => {
        expect(() => {
          checkOrganisationAccess(
            prospectFromOrgAlpha.organisation_id,
            userFromOrgBeta.organisationId,
            'prospect',
          );
        }).toThrow(ForbiddenError);
      });

      it('should deny User A from accessing Org B prospect', () => {
        expect(() => {
          checkOrganisationAccess(
            prospectFromOrgBeta.organisation_id,
            userFromOrgAlpha.organisationId,
            'prospect',
          );
        }).toThrow(ForbiddenError);
      });

      it('should deny User B from accessing Org A campaign', () => {
        expect(() => {
          checkOrganisationAccess(
            campaignFromOrgAlpha.organisation_id,
            userFromOrgBeta.organisationId,
            'campaign',
          );
        }).toThrow(ForbiddenError);
      });

      it('should return 403 status code on cross-tenant access', () => {
        try {
          checkOrganisationAccess(
            prospectFromOrgAlpha.organisation_id,
            userFromOrgBeta.organisationId,
          );
          expect.fail('Should have thrown ForbiddenError');
        } catch (error) {
          expect(error).toBeInstanceOf(ForbiddenError);
          expect((error as ForbiddenError).status).toBe(403);
        }
      });

      it('should include CROSS_TENANT_ACCESS_DENIED code in error', () => {
        try {
          checkOrganisationAccess(
            prospectFromOrgAlpha.organisation_id,
            userFromOrgBeta.organisationId,
          );
          expect.fail('Should have thrown ForbiddenError');
        } catch (error) {
          expect((error as ForbiddenError).code).toBe('CROSS_TENANT_ACCESS_DENIED');
        }
      });

      it('should include resource type in error message', () => {
        try {
          checkOrganisationAccess(
            prospectFromOrgAlpha.organisation_id,
            userFromOrgBeta.organisationId,
            'prospect',
          );
        } catch (error) {
          expect((error as ForbiddenError).message).toContain('prospect');
        }
      });
    });

    describe('Admin role does NOT bypass org isolation', () => {
      it('should deny admin from Org B accessing Org A resources', () => {
        // Even though userFromOrgBeta has admin role, cross-tenant is forbidden
        expect(() => {
          checkOrganisationAccess(
            prospectFromOrgAlpha.organisation_id,
            userFromOrgBeta.organisationId, // Admin user from different org
            'prospect',
          );
        }).toThrow(ForbiddenError);
      });
    });
  });

  describe('Organisation ID Extraction from Request', () => {
    it('should extract organisationId when present', () => {
      const mockRequest = {
        organisationId: orgAlpha.id,
      } as Partial<Request>;

      const result = getOrganisationIdFromRequest(mockRequest as Request);
      expect(result).toBe(orgAlpha.id);
    });

    it('should throw error when organisationId not set', () => {
      const mockRequest = {} as Partial<Request>;

      expect(() => {
        getOrganisationIdFromRequest(mockRequest as Request);
      }).toThrow('Organisation ID not available');
    });

    it('should throw error with middleware hint', () => {
      const mockRequest = {} as Partial<Request>;

      expect(() => {
        getOrganisationIdFromRequest(mockRequest as Request);
      }).toThrow(/organisation-scope middleware/);
    });
  });

  describe('Simulated Database Query Scoping', () => {
    // These tests simulate how services should scope queries

    interface MockResource {
      id: string;
      organisation_id: string;
      name: string;
    }

    const allProspects: MockResource[] = [
      prospectFromOrgAlpha,
      prospectFromOrgBeta,
      {
        id: uuidv4(),
        organisation_id: orgAlpha.id,
        name: 'Another Alpha Prospect',
      },
      {
        id: uuidv4(),
        organisation_id: orgBeta.id,
        name: 'Another Beta Prospect',
      },
    ];

    // Simulated scoped query function
    const findProspectsByOrganisation = (organisationId: string): MockResource[] => {
      return allProspects.filter((p) => p.organisation_id === organisationId);
    };

    // Simulated single resource fetch with access check
    const findProspectById = (
      prospectId: string,
      userOrganisationId: string,
    ): MockResource | null => {
      const prospect = allProspects.find((p) => p.id === prospectId);
      if (!prospect) return null;

      // Check organisation access
      checkOrganisationAccess(prospect.organisation_id, userOrganisationId, 'prospect');

      return prospect;
    };

    describe('List queries should filter by organisation', () => {
      it('should return only Org A prospects for User A', () => {
        const results = findProspectsByOrganisation(userFromOrgAlpha.organisationId);

        expect(results.length).toBe(2);
        expect(results.every((p) => p.organisation_id === orgAlpha.id)).toBe(true);
      });

      it('should return only Org B prospects for User B', () => {
        const results = findProspectsByOrganisation(userFromOrgBeta.organisationId);

        expect(results.length).toBe(2);
        expect(results.every((p) => p.organisation_id === orgBeta.id)).toBe(true);
      });

      it('should not include cross-tenant resources in list', () => {
        const resultsForA = findProspectsByOrganisation(userFromOrgAlpha.organisationId);

        expect(resultsForA.some((p) => p.organisation_id === orgBeta.id)).toBe(false);
      });
    });

    describe('Single resource access should validate organisation', () => {
      it('should allow User A to fetch their prospect', () => {
        const result = findProspectById(prospectFromOrgAlpha.id, userFromOrgAlpha.organisationId);

        expect(result).not.toBeNull();
        expect(result?.id).toBe(prospectFromOrgAlpha.id);
      });

      it('should deny User B from fetching Org A prospect', () => {
        expect(() => {
          findProspectById(prospectFromOrgAlpha.id, userFromOrgBeta.organisationId);
        }).toThrow(ForbiddenError);
      });

      it('should return null for non-existent prospect', () => {
        const result = findProspectById('non-existent-id', userFromOrgAlpha.organisationId);
        expect(result).toBeNull();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null organisation IDs gracefully', () => {
      expect(() => {
        checkOrganisationAccess(null as unknown as string, orgAlpha.id);
      }).toThrow(ForbiddenError);
    });

    it('should handle undefined organisation IDs gracefully', () => {
      expect(() => {
        checkOrganisationAccess(undefined as unknown as string, orgAlpha.id);
      }).toThrow(ForbiddenError);
    });

    it('should be case-sensitive for organisation IDs', () => {
      const upperCaseOrg = orgAlpha.id.toUpperCase();

      // If IDs are UUIDs, case shouldn't matter, but let's verify behavior
      if (upperCaseOrg !== orgAlpha.id) {
        expect(() => {
          checkOrganisationAccess(upperCaseOrg, orgAlpha.id);
        }).toThrow(ForbiddenError);
      }
    });

    it('should handle whitespace in organisation IDs', () => {
      expect(() => {
        checkOrganisationAccess(` ${orgAlpha.id} `, orgAlpha.id);
      }).toThrow(ForbiddenError);
    });
  });

  describe('Audit Trail Verification', () => {
    it('should log warning on cross-tenant access attempt', async () => {
      const { logger } = await import('../../src/utils/logger');

      try {
        checkOrganisationAccess(
          prospectFromOrgAlpha.organisation_id,
          userFromOrgBeta.organisationId,
        );
      } catch {
        // Expected to throw
      }

      // Pino logger signature: logger.warn(object, message)
      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          resourceOrgId: prospectFromOrgAlpha.organisation_id,
          userOrgId: userFromOrgBeta.organisationId,
        }),
        'Cross-tenant access attempt blocked',
      );
    });
  });
});
