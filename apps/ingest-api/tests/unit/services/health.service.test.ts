// tests/unit/services/health.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HealthService } from '../../../src/services/health.service.js';
import { HealthRepository } from '../../../src/repositories/health.repository.js';

describe('HealthService', () => {
  let healthService: HealthService;
  let mockHealthRepository: HealthRepository;

  beforeEach(() => {
    mockHealthRepository = {
      checkConnection: vi.fn(),
    } as any;

    healthService = new HealthService(mockHealthRepository);
  });

  describe('check', () => {
    it('should return healthy status when database is connected', async () => {
      // Arrange
      vi.mocked(mockHealthRepository.checkConnection).mockResolvedValue({
        connected: true,
        latency: 5,
      });

      // Act
      const result = await healthService.check();

      // Assert
      expect(result.status).toBe('healthy');
      expect(result.database.connected).toBe(true);
      expect(result.database.latency).toBe(5);
      expect(result.timestamp).toBeDefined();
      expect(mockHealthRepository.checkConnection).toHaveBeenCalledOnce();
    });

    it('should include ISO timestamp in response', async () => {
      // Arrange
      vi.mocked(mockHealthRepository.checkConnection).mockResolvedValue({
        connected: true,
        latency: 10,
      });

      // Act
      const result = await healthService.check();

      // Assert
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });

    it('should propagate database connection errors', async () => {
      // Arrange
      vi.mocked(mockHealthRepository.checkConnection).mockRejectedValue(
        new Error('Connection failed'),
      );

      // Act & Assert
      await expect(healthService.check()).rejects.toThrow('Connection failed');
    });
  });
});
