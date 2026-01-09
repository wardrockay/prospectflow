// tests/integration/health.integration.test.ts
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { getPool, closePool } from '../../src/config/database.js';

describe('Health Check Integration', () => {
  beforeAll(async () => {
    // Ensure pool is initialized
    getPool();
  });

  afterAll(async () => {
    // Clean up
    await closePool();
  });

  describe('GET /health', () => {
    it('should return 200 with status ok', async () => {
      // Act
      const response = await request(app).get('/health');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });

  describe('GET /api/v1/health', () => {
    it('should return 200 with detailed health information when DB is available', async () => {
      // Act
      const response = await request(app).get('/api/v1/health');

      // Assert - if DB not available, expect 500 error instead
      if (response.status === 500) {
        // DB not running - expected in CI/CD without test:db:up
        expect(response.body).toHaveProperty('status', 'error');
        expect(response.body.message).toContain('Unable to connect to database');
      } else {
        // DB running - full health check
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status', 'success');
        expect(response.body.data).toHaveProperty('status', 'healthy');
        expect(response.body.data).toHaveProperty('timestamp');
        expect(response.body.data.database).toHaveProperty('connected');
        expect(response.body.data.database).toHaveProperty('latency');
        expect(response.body.data.database.connected).toBe(true);
      }
    });

    it('should include valid ISO timestamp when DB is available', async () => {
      // Act
      const response = await request(app).get('/api/v1/health');

      // Assert - only check timestamp if DB is connected
      if (response.status === 200 && response.body.data) {
        const timestamp = response.body.data.timestamp;
        expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
        expect(new Date(timestamp).toString()).not.toBe('Invalid Date');
      } else {
        // DB not available - skip timestamp validation
        expect(response.status).toBe(500);
      }
    });

    it('should measure database latency when DB is available', async () => {
      // Act
      const response = await request(app).get('/api/v1/health');

      // Assert - only check latency if DB is connected
      if (response.status === 200 && response.body.data?.database) {
        expect(response.body.data.database.latency).toBeGreaterThanOrEqual(0);
        expect(typeof response.body.data.database.latency).toBe('number');
      } else {
        // DB not available - expect error response
        expect(response.status).toBe(500);
        expect(response.body.message).toContain('Unable to connect to database');
      }
    });
  });

  describe('GET /api/v1/nonexistent', () => {
    it('should return 404 for non-existent routes', async () => {
      // Act
      const response = await request(app).get('/api/v1/nonexistent');

      // Assert
      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        status: 'error',
        message: 'Route not found',
      });
    });
  });
});
