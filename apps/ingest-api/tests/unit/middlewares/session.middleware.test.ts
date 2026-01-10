/**
 * Session Middleware Unit Tests
 * Tests Redis session management for authenticated users
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Mock dependencies before imports
vi.mock('../../../src/services/session.service', () => ({
  sessionService: {
    getSession: vi.fn(),
    createSession: vi.fn(),
    updateActivity: vi.fn(),
  },
}));

vi.mock('../../../src/services/user-sync.service', () => ({
  userSyncService: {
    syncUser: vi.fn(),
  },
}));

vi.mock('../../../src/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import after mocks
import {
  sessionMiddleware,
  attachOrganisationId,
  requireRole,
  requireGroup,
} from '../../../src/middlewares/session.middleware';
import { sessionService } from '../../../src/services/session.service';
import { userSyncService } from '../../../src/services/user-sync.service';
import { CognitoJwtPayload } from '../../../src/types/cognito';
import { UserSession } from '../../../src/types/session';

describe('Session Middleware', () => {
  const testOrgId = uuidv4();
  const testCognitoSub = uuidv4();

  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  const createMockCognitoPayload = (
    overrides: Partial<CognitoJwtPayload> = {},
  ): CognitoJwtPayload => ({
    sub: testCognitoSub,
    email: 'test@example.com',
    'custom:organisation_id': testOrgId,
    'custom:role': 'user',
    'cognito:groups': ['user'],
    token_use: 'id',
    iss: 'https://cognito-idp.eu-west-1.amazonaws.com/eu-west-1_Test',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    ...overrides,
  });

  const createMockSession = (overrides: Partial<UserSession> = {}): UserSession => ({
    cognitoSub: testCognitoSub,
    organisationId: testOrgId,
    role: 'user',
    email: 'test@example.com',
    cognitoGroups: ['user'],
    lastActivity: Date.now(),
    createdAt: Date.now(),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();

    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });

    mockRequest = {
      user: createMockCognitoPayload(),
      ip: '127.0.0.1',
      get: vi.fn().mockReturnValue('test-user-agent'),
      socket: { remoteAddress: '127.0.0.1' } as any,
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

  describe('sessionMiddleware', () => {
    describe('with existing session', () => {
      it('should retrieve existing session and update activity', async () => {
        const existingSession = createMockSession();
        (sessionService.getSession as ReturnType<typeof vi.fn>).mockResolvedValue(existingSession);
        (sessionService.updateActivity as ReturnType<typeof vi.fn>).mockResolvedValue(true);

        await sessionMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(sessionService.getSession).toHaveBeenCalledWith(testCognitoSub);
        expect(sessionService.updateActivity).toHaveBeenCalledWith(testCognitoSub);
        expect(mockRequest.session).toEqual(existingSession);
        expect(mockNext).toHaveBeenCalled();
      });

      it('should not create new session if one exists', async () => {
        const existingSession = createMockSession();
        (sessionService.getSession as ReturnType<typeof vi.fn>).mockResolvedValue(existingSession);

        await sessionMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(sessionService.createSession).not.toHaveBeenCalled();
        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('without existing session', () => {
      beforeEach(() => {
        (sessionService.getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      });

      it('should create new session on first request', async () => {
        const newSession = createMockSession();
        (sessionService.createSession as ReturnType<typeof vi.fn>).mockResolvedValue(newSession);
        (userSyncService.syncUser as ReturnType<typeof vi.fn>).mockResolvedValue({});

        await sessionMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(sessionService.createSession).toHaveBeenCalledWith({
          cognitoSub: testCognitoSub,
          organisationId: testOrgId,
          role: 'user',
          email: 'test@example.com',
          cognitoGroups: ['user'],
          ipAddress: '127.0.0.1',
          userAgent: 'test-user-agent',
        });
        expect(mockRequest.session).toEqual(newSession);
        expect(mockNext).toHaveBeenCalled();
      });

      it('should sync user to database on first login', async () => {
        const newSession = createMockSession();
        (sessionService.createSession as ReturnType<typeof vi.fn>).mockResolvedValue(newSession);
        (userSyncService.syncUser as ReturnType<typeof vi.fn>).mockResolvedValue({});

        await sessionMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(userSyncService.syncUser).toHaveBeenCalledWith(mockRequest.user);
      });

      it('should continue even if user sync fails', async () => {
        const newSession = createMockSession();
        (sessionService.createSession as ReturnType<typeof vi.fn>).mockResolvedValue(newSession);
        (userSyncService.syncUser as ReturnType<typeof vi.fn>).mockRejectedValue(
          new Error('DB error'),
        );

        await sessionMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

        // Should still create session and continue
        expect(sessionService.createSession).toHaveBeenCalled();
        expect(mockNext).toHaveBeenCalled();
      });
    });

    describe('error scenarios', () => {
      it('should return 401 if user is not authenticated', async () => {
        mockRequest.user = undefined;

        await sessionMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(statusMock).toHaveBeenCalledWith(401);
        expect(jsonMock).toHaveBeenCalledWith({ error: 'Authentication required' });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should return 403 if organisation_id is missing', async () => {
        mockRequest.user = createMockCognitoPayload({ 'custom:organisation_id': undefined });
        (sessionService.getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);

        await sessionMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(statusMock).toHaveBeenCalledWith(403);
        expect(jsonMock).toHaveBeenCalledWith({
          error: 'User not assigned to an organisation',
          code: 'MISSING_ORGANISATION',
        });
        expect(mockNext).not.toHaveBeenCalled();
      });

      it('should return 503 if Redis is unavailable', async () => {
        const redisError = new Error('Redis connection refused');
        (sessionService.getSession as ReturnType<typeof vi.fn>).mockRejectedValue(redisError);

        await sessionMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(statusMock).toHaveBeenCalledWith(503);
        expect(jsonMock).toHaveBeenCalledWith({
          error: 'Session service unavailable',
          code: 'REDIS_UNAVAILABLE',
          message: 'Please try again in a moment',
        });
      });

      it('should return 500 for generic errors', async () => {
        const genericError = new Error('Something went wrong');
        (sessionService.getSession as ReturnType<typeof vi.fn>).mockRejectedValue(genericError);

        await sessionMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(statusMock).toHaveBeenCalledWith(500);
        expect(jsonMock).toHaveBeenCalledWith({
          error: 'Internal server error',
          code: 'SESSION_ERROR',
        });
      });
    });

    describe('default role handling', () => {
      it('should use default role "user" when not provided in JWT', async () => {
        mockRequest.user = createMockCognitoPayload({ 'custom:role': undefined });
        (sessionService.getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
        (sessionService.createSession as ReturnType<typeof vi.fn>).mockResolvedValue(
          createMockSession(),
        );
        (userSyncService.syncUser as ReturnType<typeof vi.fn>).mockResolvedValue({});

        await sessionMiddleware(mockRequest as Request, mockResponse as Response, mockNext);

        expect(sessionService.createSession).toHaveBeenCalledWith(
          expect.objectContaining({ role: 'user' }),
        );
      });
    });
  });

  describe('attachOrganisationId', () => {
    it('should attach organisationId to request from session', () => {
      mockRequest.session = createMockSession();

      attachOrganisationId(mockRequest as Request, mockResponse as Response, mockNext);

      expect((mockRequest as any).organisationId).toBe(testOrgId);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should not attach organisationId if session is missing', () => {
      mockRequest.session = undefined;

      attachOrganisationId(mockRequest as Request, mockResponse as Response, mockNext);

      expect((mockRequest as any).organisationId).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    it('should allow access for matching role', () => {
      mockRequest.session = createMockSession({ role: 'admin' });

      const middleware = requireRole('admin', 'superuser');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should deny access for non-matching role', () => {
      mockRequest.session = createMockSession({ role: 'viewer' });

      const middleware = requireRole('admin', 'user');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Insufficient permissions',
        required: ['admin', 'user'],
        current: 'viewer',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 if session is missing', () => {
      mockRequest.session = undefined;

      const middleware = requireRole('admin');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Authentication required' });
    });
  });

  describe('requireGroup', () => {
    it('should allow access for matching group', () => {
      mockRequest.session = createMockSession({ cognitoGroups: ['admin', 'user'] });

      const middleware = requireGroup('admin');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should deny access for non-matching groups', () => {
      mockRequest.session = createMockSession({ cognitoGroups: ['viewer'] });

      const middleware = requireGroup('admin', 'user');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Insufficient permissions',
        required_groups: ['admin', 'user'],
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 if session is missing', () => {
      mockRequest.session = undefined;

      const middleware = requireGroup('admin');
      middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Authentication required' });
    });
  });
});
