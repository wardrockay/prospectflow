// tests/unit/controllers/health.controller.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HealthController } from '../../../src/controllers/health.controller.js';
import { HealthService } from '../../../src/services/health.service.js';
import { Request, Response, NextFunction } from 'express';

describe('HealthController', () => {
  let healthController: HealthController;
  let mockHealthService: HealthService;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockHealthService = {
      check: vi.fn(),
    } as any;

    healthController = new HealthController(mockHealthService);

    mockReq = {};
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    mockNext = vi.fn();
  });

  describe('check', () => {
    it('should return 200 with health status when successful', async () => {
      // Arrange
      const mockHealthData = {
        status: 'healthy' as const,
        timestamp: '2024-01-01T00:00:00.000Z',
        database: {
          connected: true,
          latency: 5,
        },
      };
      vi.mocked(mockHealthService.check).mockResolvedValue(mockHealthData);

      // Act
      await healthController.check(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction,
      );

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: 'success',
        data: mockHealthData,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with error when service throws', async () => {
      // Arrange
      const mockError = new Error('Database connection failed');
      vi.mocked(mockHealthService.check).mockRejectedValue(mockError);

      // Act
      await healthController.check(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction,
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(mockError);
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });
  });
});
