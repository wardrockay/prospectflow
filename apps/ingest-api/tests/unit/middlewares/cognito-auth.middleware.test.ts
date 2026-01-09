import { Request, Response, NextFunction } from 'express';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock aws-jwt-verify AVANT l'import du middleware
const mockVerify = vi.fn();
const mockCreate = vi.fn();

vi.mock('aws-jwt-verify', () => ({
  CognitoJwtVerifier: {
    create: vi.fn(() => ({
      verify: mockVerify,
    })),
  },
}));

// Mock config
vi.mock('../../../src/config/cognito', () => ({
  cognitoConfig: {
    region: 'eu-west-1',
    userPoolId: 'eu-west-1_test',
    clientId: 'test-client-id',
    issuer: 'https://cognito-idp.eu-west-1.amazonaws.com/eu-west-1_test',
  },
}));

import { cognitoAuthMiddleware } from '../../../src/middlewares/cognito-auth.middleware';

describe('Cognito Auth Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    // Reset mocks
    mockRequest = {
      headers: {},
    };

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    mockNext = vi.fn();
    mockVerify.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Valid Token Scenarios', () => {
    it('should populate req.user with decoded JWT payload for valid token', async () => {
      // Arrange
      const mockPayload = {
        sub: 'test-cognito-sub-123',
        email: 'test@example.com',
        'cognito:groups': ['admin'],
        'custom:organisation_id': 'org-123',
        'custom:role': 'admin',
        token_use: 'id' as const,
        iss: 'https://cognito-idp.eu-west-1.amazonaws.com/eu-west-1_test',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      };

      mockVerify.mockResolvedValue(mockPayload);
      mockRequest.headers = {
        authorization: 'Bearer valid-token-12345',
      };

      // Act
      await cognitoAuthMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockVerify).toHaveBeenCalledWith('valid-token-12345');
      expect(mockRequest.user).toEqual(mockPayload);
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should extract token after "Bearer " prefix correctly', async () => {
      // Arrange
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';
      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      mockVerify.mockResolvedValue({
        sub: 'test-sub',
        email: 'test@example.com',
        token_use: 'id',
        iss: 'test-issuer',
        exp: 9999999999,
        iat: 1234567890,
      });

      // Act
      await cognitoAuthMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockVerify).toHaveBeenCalledWith(token);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Missing Token Scenarios', () => {
    it('should return 401 if Authorization header is missing', async () => {
      // Arrange
      mockRequest.headers = {};

      // Act
      await cognitoAuthMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'No authorization header provided',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 if Authorization header does not start with "Bearer "', async () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'Basic invalid-format',
      };

      // Act
      await cognitoAuthMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Invalid authorization header format. Expected: Bearer <token>',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 if token is empty after "Bearer " prefix', async () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'Bearer ',
      };

      // Act
      await cognitoAuthMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'No token provided',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Invalid Token Scenarios', () => {
    it('should return 401 for invalid token signature', async () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'Bearer invalid-signature-token',
      };

      mockVerify.mockRejectedValue(new Error('Invalid signature'));

      // Act
      await cognitoAuthMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Invalid token',
        details: 'Invalid signature',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 with "Token expired" message for expired token', async () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'Bearer expired-token',
      };

      mockVerify.mockRejectedValue(new Error('Token expired at 2024-01-01'));

      // Act
      await cognitoAuthMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Token expired',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for token from wrong User Pool', async () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'Bearer wrong-pool-token',
      };

      mockVerify.mockRejectedValue(new Error('Token issuer mismatch'));

      // Act
      await cognitoAuthMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Invalid token',
        details: 'Token issuer mismatch',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should return 401 for unexpected errors during token verification', async () => {
      // Arrange
      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      // Mock an unexpected error during verification
      mockVerify.mockImplementation(() => {
        throw new TypeError('Unexpected verification error');
      });

      // Act
      await cognitoAuthMiddleware(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Invalid token',
        details: 'Unexpected verification error',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
