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
    it('should return 200 with detailed health information', async () => {
      // Act
      const response = await request(app).get('/api/v1/health');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body.data).toHaveProperty('status', 'healthy');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data.database).toHaveProperty('connected');
      expect(response.body.data.database).toHaveProperty('latency');
      expect(response.body.data.database.connected).toBe(true);
    });

    it('should include valid ISO timestamp', async () => {
      // Act
      const response = await request(app).get('/api/v1/health');

      // Assert
      const timestamp = response.body.data.timestamp;
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
      expect(new Date(timestamp).toString()).not.toBe('Invalid Date');
    });

    it('should measure database latency', async () => {
      // Act
      const response = await request(app).get('/api/v1/health');

      // Assert
      expect(response.body.data.database.latency).toBeGreaterThanOrEqual(0);
      expect(typeof response.body.data.database.latency).toBe('number');
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
