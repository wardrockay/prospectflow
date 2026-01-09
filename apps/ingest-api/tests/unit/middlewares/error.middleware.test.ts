// tests/unit/middlewares/error.middleware.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { errorHandler } from '../../../src/middlewares/error.middleware.js';
import { AppError } from '../../../src/errors/AppError.js';
import { ValidationError } from '../../../src/errors/ValidationError.js';
import { DatabaseError } from '../../../src/errors/DatabaseError.js';
import { ZodError } from 'zod';
import { Request, Response, NextFunction } from 'express';

describe('Error Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      path: '/test',
      method: 'GET',
    };
    mockRes = {
      locals: {},
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    mockNext = vi.fn();
  });

  describe('ZodError handling', () => {
    it('should return 400 with validation errors', () => {
      // Arrange
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['email'],
          message: 'Expected string, received number',
        },
      ]);

      // Act
      errorHandler(zodError, mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Validation failed',
        errors: zodError.errors,
      });
    });
  });

  describe('AppError handling', () => {
    it('should return custom status code and message for AppError', () => {
      // Arrange
      const appError = new AppError('Custom error', 403);

      // Act
      errorHandler(appError, mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Custom error',
        }),
      );
    });

    it('should handle ValidationError (extends AppError)', () => {
      // Arrange
      const validationError = new ValidationError('Invalid input');

      // Act
      errorHandler(validationError, mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Invalid input',
        }),
      );
    });

    it('should handle DatabaseError (extends AppError)', () => {
      // Arrange
      const dbError = new DatabaseError('Database connection failed');

      // Act
      errorHandler(dbError, mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'error',
          message: 'Database connection failed',
        }),
      );
    });
  });

  describe('Generic Error handling', () => {
    it('should return 500 for standard Error in production', () => {
      // Arrange
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      const error = new Error('Something went wrong');

      // Act
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Internal server error',
      });

      // Cleanup
      process.env.NODE_ENV = originalEnv;
    });

    it('should return error message in development', () => {
      // Arrange
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      const error = new Error('Detailed error');

      // Act
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Detailed error',
      });

      // Cleanup
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('JSON Syntax Error handling', () => {
    it('should return 400 for JSON syntax errors', () => {
      // Arrange
      const syntaxError = new SyntaxError('Unexpected token');
      (syntaxError as any).body = {};

      // Act
      errorHandler(syntaxError, mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid JSON syntax',
        detail: 'Unexpected token',
      });
    });
  });

  describe('Unknown error handling', () => {
    it('should return 500 for unknown error types', () => {
      // Arrange
      const unknownError = { unknown: 'error' };

      // Act
      errorHandler(unknownError, mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Unhandled server error',
      });
    });
  });
});
