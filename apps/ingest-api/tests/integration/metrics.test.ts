import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';

describe('Metrics Endpoint Integration', () => {
  describe('GET /metrics', () => {
    it('should return 200 and Prometheus metrics', async () => {
      const response = await request(app).get('/metrics');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/plain');
    });

    it('should return metrics in valid Prometheus format', async () => {
      const response = await request(app).get('/metrics');

      const body = response.text;

      // Should contain metric definitions
      expect(body).toContain('# HELP');
      expect(body).toContain('# TYPE');

      // Should contain HTTP metrics
      expect(body).toContain('http_requests_total');
      expect(body).toContain('http_request_duration_seconds');

      // Should contain Node.js metrics
      expect(body).toContain('nodejs_');
    });

    it('should include default labels', async () => {
      const response = await request(app).get('/metrics');

      const body = response.text;

      // Should include service and environment labels
      expect(body).toContain('service="ingest-api"');
    });

    it('should track the /metrics request itself', async () => {
      // Make first request
      await request(app).get('/metrics');

      // Make second request to see if first was tracked
      const response = await request(app).get('/metrics');
      const body = response.text;

      // Should include metrics for the /metrics endpoint itself
      expect(body).toContain('route="/metrics"');
    });

    it('should update metrics after making requests', async () => {
      // Make a request to health endpoint
      await request(app).get('/health');

      // Check metrics
      const response = await request(app).get('/metrics');
      const body = response.text;

      // Should include metrics for /health endpoint
      expect(body).toContain('route="/health"');
    });
  });

  describe('HTTP Metrics Collection', () => {
    it('should track different HTTP methods', async () => {
      // Make GET request
      await request(app).get('/health');

      const response = await request(app).get('/metrics');
      const body = response.text;

      expect(body).toContain('method="GET"');
    });

    it('should track different status codes', async () => {
      // Make successful request
      await request(app).get('/health');

      // Make request to non-existent route (404)
      await request(app).get('/nonexistent');

      const response = await request(app).get('/metrics');
      const body = response.text;

      expect(body).toContain('status_code="200"');
      expect(body).toContain('status_code="404"');
    });
  });
});
