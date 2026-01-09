// tests/unit/middlewares/validation.middleware.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validate } from '../../../src/middlewares/validation.middleware.js';
import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

describe('Validation Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      body: {},
      query: {},
      params: {},
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    mockNext = vi.fn();
  });

  describe('validate', () => {
    it('should call next() when validation passes', async () => {
      // Arrange
      const schema = z.object({
        body: z.object({
          name: z.string(),
          age: z.number(),
        }),
      });

      mockReq.body = { name: 'John', age: 30 };

      const middleware = validate(schema);

      // Act
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledOnce();
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should return 400 with errors when validation fails', async () => {
      // Arrange
      const schema = z.object({
        body: z.object({
          email: z.string().email(),
          age: z.number().min(18),
        }),
      });

      mockReq.body = { email: 'invalid', age: 10 };

      const middleware = validate(schema);

      // Act
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Validation failed',
        errors: expect.arrayContaining([
          expect.objectContaining({
            code: 'invalid_string',
            path: ['body', 'email'],
          }),
          expect.objectContaining({
            code: 'too_small',
            path: ['body', 'age'],
          }),
        ]),
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should validate query parameters', async () => {
      // Arrange
      const schema = z.object({
        query: z.object({
          page: z.string(),
          limit: z.string(),
        }),
      });

      mockReq.query = { page: '1', limit: '10' };

      const middleware = validate(schema);

      // Act
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledOnce();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should validate params', async () => {
      // Arrange
      const schema = z.object({
        params: z.object({
          id: z.string().uuid(),
        }),
      });

      mockReq.params = { id: '123e4567-e89b-12d3-a456-426614174000' };

      const middleware = validate(schema);

      // Act
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledOnce();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should call next with error for non-Zod errors', async () => {
      // Arrange
      const schema = z.object({
        body: z.object({
          name: z.string(),
        }),
      });

      // Mock parseAsync to throw non-Zod error
      const middleware = validate(schema as any);
      vi.spyOn(schema, 'parseAsync').mockRejectedValue(new Error('Unexpected error'));

      // Act
      await middleware(mockReq as Request, mockRes as Response, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });
});
