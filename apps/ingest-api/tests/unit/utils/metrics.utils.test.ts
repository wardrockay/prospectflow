import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  trackDatabaseQuery,
  updateConnectionPoolMetrics,
} from '../../../src/utils/metrics.utils.js';
import { dbQueryDuration, dbConnectionPool } from '../../../src/config/metrics.js';

// Mock logger
vi.mock('../../../src/utils/logger', () => ({
  createChildLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));

// Mock metrics
vi.mock('../../../src/config/metrics', () => ({
  dbQueryDuration: {
    observe: vi.fn(),
  },
  dbConnectionPool: {
    set: vi.fn(),
  },
}));

describe('Metrics Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('trackDatabaseQuery', () => {
    it('should track successful query duration', async () => {
      const mockQuery = vi.fn().mockResolvedValue({ rows: [] });

      const result = await trackDatabaseQuery('SELECT', 'iam', mockQuery);

      expect(mockQuery).toHaveBeenCalledOnce();
      expect(result).toEqual({ rows: [] });
      expect(dbQueryDuration.observe).toHaveBeenCalledWith(
        { operation: 'SELECT', schema: 'iam' },
        expect.any(Number),
      );
    });

    it('should track failed query duration', async () => {
      const mockQuery = vi.fn().mockRejectedValue(new Error('Query failed'));

      await expect(trackDatabaseQuery('INSERT', 'crm', mockQuery)).rejects.toThrow('Query failed');

      expect(dbQueryDuration.observe).toHaveBeenCalledWith(
        { operation: 'INSERT', schema: 'crm' },
        expect.any(Number),
      );
    });

    it('should measure duration in seconds', async () => {
      const mockQuery = vi
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve({ rows: [] }), 50)),
        );

      await trackDatabaseQuery('SELECT', 'iam', mockQuery);

      // Duration should be around 0.05 seconds (50ms)
      expect(dbQueryDuration.observe).toHaveBeenCalledWith(expect.any(Object), expect.any(Number));

      const duration = (dbQueryDuration.observe as any).mock.calls[0][1];
      expect(duration).toBeGreaterThanOrEqual(0.04);
      expect(duration).toBeLessThanOrEqual(0.1);
    });
  });

  describe('updateConnectionPoolMetrics', () => {
    it('should update active and idle connection gauges', () => {
      updateConnectionPoolMetrics(5, 10);

      expect(dbConnectionPool.set).toHaveBeenCalledWith({ state: 'active' }, 5);
      expect(dbConnectionPool.set).toHaveBeenCalledWith({ state: 'idle' }, 10);
    });

    it('should handle zero connections', () => {
      updateConnectionPoolMetrics(0, 0);

      expect(dbConnectionPool.set).toHaveBeenCalledWith({ state: 'active' }, 0);
      expect(dbConnectionPool.set).toHaveBeenCalledWith({ state: 'idle' }, 0);
    });
  });
});
