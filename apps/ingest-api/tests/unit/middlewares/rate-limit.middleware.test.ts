import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { leadMagnetIpRateLimit } from '../../../src/middlewares/rate-limit.middleware.js';

// Mock Express objects
function createMockRequest(overrides?: Partial<Request>): Request {
  return {
    headers: {},
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' },
    get: vi.fn((header: string) => {
      if (header === 'user-agent') return 'Test User Agent';
      return undefined;
    }),
    ...overrides,
  } as unknown as Request;
}

function createMockResponse(): Response {
  const res: Partial<Response> = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
  };
  return res as Response;
}

describe('leadMagnetIpRateLimit middleware', () => {
  let mockNext: NextFunction;

  beforeEach(() => {
    mockNext = vi.fn();
    // Clear environment variables before each test
    delete process.env.LEAD_MAGNET_IP_RATE_LIMIT_MAX;
    delete process.env.LEAD_MAGNET_IP_RATE_LIMIT_WINDOW_MS;
  });

  it('should allow requests under the limit (AC6.1)', () => {
    const req = createMockRequest({ ip: '192.168.1.1' });
    const res = createMockResponse();

    // Make 10 requests (default limit)
    for (let i = 0; i < 10; i++) {
      leadMagnetIpRateLimit(req, res, mockNext);
    }

    // All 10 should pass
    expect(mockNext).toHaveBeenCalledTimes(10);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should block the 11th request and return 429 (AC6.1)', () => {
    const req = createMockRequest({ ip: '192.168.1.2' });
    const res = createMockResponse();

    // Make 10 requests to reach limit
    for (let i = 0; i < 10; i++) {
      leadMagnetIpRateLimit(req, res, mockNext);
    }

    // 11th request should be blocked
    const blockReq = createMockRequest({ ip: '192.168.1.2' });
    const blockRes = createMockResponse();
    leadMagnetIpRateLimit(blockReq, blockRes, mockNext);

    expect(blockRes.status).toHaveBeenCalledWith(429);
    expect(blockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'IP_RATE_LIMIT_EXCEEDED',
      }),
    );
    expect(blockRes.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(Number));
  });

  it('should extract IP from X-Forwarded-For header (AC6.2)', () => {
    const req = createMockRequest({
      headers: { 'x-forwarded-for': '203.0.113.5, 198.51.100.178' },
      ip: '192.168.1.1',
    });
    const res = createMockResponse();

    leadMagnetIpRateLimit(req, res, mockNext);

    // Should use first IP from X-Forwarded-For
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('should handle different IPs independently', () => {
    const mockNext1 = vi.fn();
    const mockNext2 = vi.fn();

    // IP 1: Make 10 requests
    for (let i = 0; i < 10; i++) {
      const req = createMockRequest({ ip: '192.168.1.100' });
      const res = createMockResponse();
      leadMagnetIpRateLimit(req, res, mockNext1);
    }

    // IP 2: Should still be allowed
    const req2 = createMockRequest({ ip: '192.168.1.200' });
    const res2 = createMockResponse();
    leadMagnetIpRateLimit(req2, res2, mockNext2);

    expect(mockNext1).toHaveBeenCalledTimes(10);
    expect(mockNext2).toHaveBeenCalledTimes(1);
    expect(res2.status).not.toHaveBeenCalled();
  });

  it('should return retry-after time in seconds (AC6.1)', () => {
    const req = createMockRequest({ ip: '192.168.1.50' });
    const res = createMockResponse();

    // Reach limit
    for (let i = 0; i < 10; i++) {
      leadMagnetIpRateLimit(req, res, mockNext);
    }

    // Block next request
    const blockReq = createMockRequest({ ip: '192.168.1.50' });
    const blockRes = createMockResponse();
    leadMagnetIpRateLimit(blockReq, blockRes, mockNext);

    expect(blockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        retryAfter: expect.any(Number),
        message: expect.stringContaining('minutes'),
      }),
    );
  });

  it('should fallback to req.ip if X-Forwarded-For is missing (AC6.2)', () => {
    const req = createMockRequest({
      ip: '192.168.1.99',
      headers: {},
    });
    const res = createMockResponse();

    leadMagnetIpRateLimit(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it('should handle array X-Forwarded-For header', () => {
    const req = createMockRequest({
      headers: { 'x-forwarded-for': ['203.0.113.5', '198.51.100.178'] },
    });
    const res = createMockResponse();

    leadMagnetIpRateLimit(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
  });
});
