import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  register,
  initMetrics,
  httpRequestDuration,
  httpRequestsTotal,
} from '../../../src/config/metrics.js';

// Mock logger
vi.mock('../../../src/utils/logger', () => ({
  createChildLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));

describe('Metrics Configuration', () => {
  beforeEach(() => {
    // Clear registry between tests
    register.clear();
  });

  describe('initMetrics', () => {
    it('should initialize metrics without errors', () => {
      expect(() => initMetrics()).not.toThrow();
    });

    it('should register Node.js default metrics', async () => {
      initMetrics();
      const metricsString = await register.metrics();

      // Should include Node.js metrics
      expect(metricsString).toContain('nodejs_');
    });
  });

  describe('httpRequestDuration', () => {
    it('should record request duration', () => {
      const labels = { method: 'GET', route: '/api/test', status_code: '200' };
      const duration = 0.123; // 123ms

      // Just verify it doesn't throw
      expect(() => httpRequestDuration.observe(labels, duration)).not.toThrow();
    });
  });

  describe('httpRequestsTotal', () => {
    it('should increment request counter', () => {
      const labels = { method: 'POST', route: '/api/campaigns', status_code: '201' };

      // Just verify it doesn't throw
      expect(() => httpRequestsTotal.inc(labels)).not.toThrow();
      expect(() => httpRequestsTotal.inc(labels)).not.toThrow();
    });
  });

  describe('metrics endpoint', () => {
    it('should return metrics in Prometheus format', async () => {
      initMetrics();

      // Record some metrics
      httpRequestsTotal.inc({ method: 'GET', route: '/test', status_code: '200' });

      const metricsString = await register.metrics();

      // Should be valid Prometheus format
      expect(metricsString).toContain('# HELP');
      expect(metricsString).toContain('# TYPE');
      // After recording a metric, it should appear
      expect(metricsString.length).toBeGreaterThan(100);
    });

    it('should include custom labels in metrics', async () => {
      initMetrics();

      const metricsString = await register.metrics();

      // Should include default labels
      expect(metricsString).toContain('service="ingest-api"');
    });
  });
});
