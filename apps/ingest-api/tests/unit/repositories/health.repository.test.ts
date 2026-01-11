// tests/unit/repositories/health.repository.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HealthRepository } from '../../../src/repositories/health.repository.js';
import { Pool } from 'pg';
import { DatabaseError } from '../../../src/errors/DatabaseError.js';

describe('HealthRepository', () => {
  let healthRepository: HealthRepository;
  let mockPool: Pool;

  beforeEach(() => {
    mockPool = {
      query: vi.fn(),
    } as any;

    healthRepository = new HealthRepository(mockPool);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('checkConnection', () => {
    it('should return connected true and latency when database is accessible', async () => {
      // Arrange
      vi.mocked(mockPool.query).mockResolvedValue({} as any);

      // Act
      const result = await healthRepository.checkConnection();

      // Assert
      expect(result.connected).toBe(true);
      expect(result.latency).toBeGreaterThanOrEqual(0);
      expect(mockPool.query).toHaveBeenCalledWith('SELECT 1');
    });

    it('should throw DatabaseError when connection fails', async () => {
      // Arrange
      vi.mocked(mockPool.query).mockRejectedValue(new Error('Connection failed'));

      // Act & Assert
      await expect(healthRepository.checkConnection()).rejects.toThrow(
        'Unable to connect to database',
      );
    });

    it('should measure latency accurately', async () => {
      // Arrange
      vi.mocked(mockPool.query).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({} as any), 10)),
      );

      // Act
      const result = await healthRepository.checkConnection();

      // Assert - allow 1ms variance due to timer precision
      expect(result.latency).toBeGreaterThanOrEqual(9);
    });
  });
});
