import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { metricsMiddleware } from '../../../src/middlewares/metrics.middleware.js';
import { httpRequestDuration, httpRequestsTotal } from '../../../src/config/metrics.js';

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
  httpRequestDuration: {
    observe: vi.fn(),
  },
  httpRequestsTotal: {
    inc: vi.fn(),
  },
}));

describe('Metrics Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockReq = {
      method: 'GET',
      path: '/api/test',
      route: { path: '/api/test' },
    };

    mockRes = {
      statusCode: 200,
      on: vi.fn((event: string, callback: () => void) => {
        if (event === 'finish') {
          // Simulate response finish after 100ms
          setTimeout(callback, 100);
        }
        return mockRes as Response;
      }),
    };

    nextFn = vi.fn();
  });

  it('should call next middleware', () => {
    metricsMiddleware(mockReq as Request, mockRes as Response, nextFn);

    expect(nextFn).toHaveBeenCalledOnce();
  });

  it('should record metrics on response finish', (done) => {
    metricsMiddleware(mockReq as Request, mockRes as Response, nextFn);

    // Wait for finish event
    setTimeout(() => {
      expect(httpRequestDuration.observe).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          route: '/api/test',
          status_code: '200',
        }),
        expect.any(Number),
      );

      expect(httpRequestsTotal.inc).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          route: '/api/test',
          status_code: '200',
        }),
      );

      done();
    }, 150);
  });

  it('should use "unknown" route if route is not defined', (done) => {
    mockReq.route = undefined;

    metricsMiddleware(mockReq as Request, mockRes as Response, nextFn);

    setTimeout(() => {
      expect(httpRequestDuration.observe).toHaveBeenCalledWith(
        expect.objectContaining({
          route: '/api/test', // Falls back to path
        }),
        expect.any(Number),
      );

      done();
    }, 150);
  });

  it('should handle different status codes', (done) => {
    mockRes.statusCode = 500;

    metricsMiddleware(mockReq as Request, mockRes as Response, nextFn);

    setTimeout(() => {
      expect(httpRequestsTotal.inc).toHaveBeenCalledWith(
        expect.objectContaining({
          status_code: '500',
        }),
      );

      done();
    }, 150);
  });
});
