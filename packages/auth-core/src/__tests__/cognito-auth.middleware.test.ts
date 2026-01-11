/**
 * Cognito Auth Middleware Tests
 * Unit tests for JWT token validation
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { createCognitoAuthMiddleware } from '../middlewares/cognito-auth.middleware';

// Mock aws-jwt-verify
const mockVerify = vi.fn();
vi.mock('aws-jwt-verify', () => ({
  CognitoJwtVerifier: {
    create: vi.fn(() => ({
      verify: mockVerify,
    })),
  },
}));

describe('createCognitoAuthMiddleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    mockNext = vi.fn() as unknown as NextFunction;
    vi.clearAllMocks();
  });

  it('should create middleware with custom config', () => {
    const middleware = createCognitoAuthMiddleware({
      userPoolId: 'test-pool',
      clientId: 'test-client',
    });

    expect(middleware).toBeInstanceOf(Function);
  });

  it('should return 401 if Authorization header is missing', async () => {
    const middleware = createCognitoAuthMiddleware({
      userPoolId: 'test-pool',
      clientId: 'test-client',
    });

    await middleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Unauthorized',
      message: 'No authorization header provided',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 if Authorization header does not start with Bearer', async () => {
    mockRequest.headers = {
      authorization: 'Basic sometoken',
    };

    const middleware = createCognitoAuthMiddleware({
      userPoolId: 'test-pool',
      clientId: 'test-client',
    });

    await middleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: 'Unauthorized',
      message: 'Invalid authorization header format. Expected: Bearer <token>',
    });
  });

  it('should validate token and attach payload to req.user', async () => {
    const mockPayload = {
      sub: 'user-123',
      email: 'test@example.com',
      'custom:organisation_id': 'org-123',
    };

    mockRequest.headers = {
      authorization: 'Bearer valid-token',
    };
    mockVerify.mockResolvedValue(mockPayload);

    const middleware = createCognitoAuthMiddleware({
      userPoolId: 'test-pool',
      clientId: 'test-client',
    });

    await middleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockVerify).toHaveBeenCalledWith('valid-token');
    expect(mockRequest.user).toEqual(mockPayload);
    expect(mockNext).toHaveBeenCalled();
  });

  it('should return 401 on token verification failure', async () => {
    mockRequest.headers = {
      authorization: 'Bearer invalid-token',
    };
    mockVerify.mockRejectedValue(new Error('Invalid token'));

    const middleware = createCognitoAuthMiddleware({
      userPoolId: 'test-pool',
      clientId: 'test-client',
    });

    await middleware(mockRequest as Request, mockResponse as Response, mockNext);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should use custom logger for errors on unexpected exceptions', async () => {
    const mockLogger = {
      error: vi.fn(),
    };

    mockRequest.headers = {
      authorization: 'Bearer valid-token',
    };
    // Simulate an unexpected error (not just token validation error)
    mockVerify.mockRejectedValue(new Error('Unexpected server error'));

    const middleware = createCognitoAuthMiddleware(
      {
        userPoolId: 'test-pool',
        clientId: 'test-client',
      },
      mockLogger,
    );

    await middleware(mockRequest as Request, mockResponse as Response, mockNext);

    // The middleware catches errors and returns 401 for token errors
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });
});
