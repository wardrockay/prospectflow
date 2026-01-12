import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  organisationScopeMiddleware,
  checkOrganisationAccess,
  getOrganisationIdFromRequest,
  ForbiddenError,
} from '../../../src/config/auth-middlewares';
import type { UserSession } from '@prospectflow/auth-core';

// Mock logger
vi.mock('../../../src/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
  createChildLogger: vi.fn(() => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  })),
}));

describe('organisation-scope.middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  const createMockSession = (overrides: Partial<UserSession> = {}): UserSession => ({
    cognitoSub: 'test-cognito-sub-123',
    organisationId: 'org-uuid-123',
    role: 'user',
    email: 'test@example.com',
    cognitoGroups: ['user'],
    lastActivity: Date.now(),
    createdAt: Date.now(),
    ...overrides,
  });

  beforeEach(() => {
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });

    mockRequest = {
      session: createMockSession(),
      path: '/api/test',
      method: 'GET',
    };

    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };

    mockNext = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('organisationScopeMiddleware', () => {
    describe('successful scenarios', () => {
      it('should attach organisationId to request when session is valid', async () => {
        await organisationScopeMiddleware(
          mockRequest as Request,
          mockResponse as Response,
          mockNext,
        );

        expect(mockRequest.organisationId).toBe('org-uuid-123');
        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(statusMock).not.toHaveBeenCalled();
      });

      it('should call next() after attaching organisationId', async () => {
        await organisationScopeMiddleware(
          mockRequest as Request,
          mockResponse as Response,
          mockNext,
        );

        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(mockNext).toHaveBeenCalledWith();
      });
    });

    describe('error scenarios - missing session', () => {
      it('should return 401 when session is undefined', async () => {
        mockRequest.session = undefined;

        await organisationScopeMiddleware(
          mockRequest as Request,
          mockResponse as Response,
          mockNext,
        );

        expect(statusMock).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({
          error: 'Authentication required',
          code: 'SESSION_REQUIRED',
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should not set organisationId when session is missing', async () => {
        mockRequest.session = undefined;

        await organisationScopeMiddleware(
          mockRequest as Request,
          mockResponse as Response,
          mockNext,
        );

        expect(mockRequest.organisationId).toBeUndefined();
      });
    });

    describe('error scenarios - missing organisationId in session', () => {
      it('should return 403 when session is missing organisationId', async () => {
        mockRequest.session = createMockSession({ organisationId: '' });

        await organisationScopeMiddleware(
          mockRequest as Request,
          mockResponse as Response,
          mockNext,
        );

        expect(statusMock).toHaveBeenCalledWith(403);
        expect(jsonMock).toHaveBeenCalledWith({
          error: 'User not assigned to an organisation',
          code: 'MISSING_ORGANISATION',
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should return 403 when organisationId is undefined', async () => {
        mockRequest.session = {
          ...createMockSession(),
          organisationId: undefined as unknown as string,
        };

        await organisationScopeMiddleware(
          mockRequest as Request,
          mockResponse as Response,
          mockNext,
        );

        expect(statusMock).toHaveBeenCalledWith(403);
        expect(jsonMock).toHaveBeenCalledWith({
          error: 'User not assigned to an organisation',
          code: 'MISSING_ORGANISATION',
        });
      });
    });

    describe('different organisation IDs', () => {
      it('should correctly attach different organisation IDs', async () => {
        const orgId = 'different-org-uuid-456';
        mockRequest.session = createMockSession({ organisationId: orgId });

        await organisationScopeMiddleware(
          mockRequest as Request,
          mockResponse as Response,
          mockNext,
        );

        expect(mockRequest.organisationId).toBe(orgId);
        expect(mockNext).toHaveBeenCalled();
      });
    });
  });

  describe('checkOrganisationAccess', () => {
    describe('successful access', () => {
      it('should not throw when organisation IDs match', () => {
        expect(() => {
          checkOrganisationAccess('org-123', 'org-123');
        }).not.toThrow();
      });

      it('should not throw with custom resource type when IDs match', () => {
        expect(() => {
          checkOrganisationAccess('org-123', 'org-123', 'prospect');
        }).not.toThrow();
      });
    });

    describe('cross-tenant access denied', () => {
      it('should throw ForbiddenError when organisation IDs do not match', () => {
        expect(() => {
          checkOrganisationAccess('org-123', 'org-456');
        }).toThrow(ForbiddenError);
      });

      it('should include default resource type in error message', () => {
        try {
          checkOrganisationAccess('org-123', 'org-456');
        } catch (error) {
          expect(error).toBeInstanceOf(ForbiddenError);
          expect((error as ForbiddenError).message).toContain('resource');
          expect((error as ForbiddenError).code).toBe('CROSS_TENANT_ACCESS_DENIED');
        }
      });

      it('should include custom resource type in error message', () => {
        try {
          checkOrganisationAccess('org-123', 'org-456', 'prospect');
        } catch (error) {
          expect(error).toBeInstanceOf(ForbiddenError);
          expect((error as ForbiddenError).message).toContain('prospect');
        }
      });

      it('should have status 403 on ForbiddenError', () => {
        try {
          checkOrganisationAccess('org-123', 'org-456');
        } catch (error) {
          expect((error as ForbiddenError).status).toBe(403);
        }
      });
    });

    describe('edge cases', () => {
      it('should throw when one org ID is empty string', () => {
        expect(() => {
          checkOrganisationAccess('', 'org-123');
        }).toThrow(ForbiddenError);
      });

      it('should not throw when both org IDs are empty (edge case)', () => {
        // Both empty = technically same org (degenerate case)
        expect(() => {
          checkOrganisationAccess('', '');
        }).not.toThrow();
      });
    });
  });

  describe('getOrganisationIdFromRequest', () => {
    describe('successful retrieval', () => {
      it('should return organisationId when present on request', () => {
        mockRequest.organisationId = 'org-uuid-123';

        const result = getOrganisationIdFromRequest(mockRequest as Request);

        expect(result).toBe('org-uuid-123');
      });
    });

    describe('error scenarios', () => {
      it('should throw Error when organisationId is not set', () => {
        mockRequest.organisationId = undefined;

        expect(() => {
          getOrganisationIdFromRequest(mockRequest as Request);
        }).toThrow('Organisation ID not available');
      });

      it('should throw Error when organisationId is empty string', () => {
        mockRequest.organisationId = '';

        expect(() => {
          getOrganisationIdFromRequest(mockRequest as Request);
        }).toThrow('Organisation ID not available');
      });

      it('should include middleware suggestion in error message', () => {
        mockRequest.organisationId = undefined;

        expect(() => {
          getOrganisationIdFromRequest(mockRequest as Request);
        }).toThrow(/organisation-scope middleware/);
      });
    });
  });
});
