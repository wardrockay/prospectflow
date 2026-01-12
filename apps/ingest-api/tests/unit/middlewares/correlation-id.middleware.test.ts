import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { correlationIdMiddleware } from '../../../src/middlewares/correlation-id.middleware.js';

// Mock logger
vi.mock('../../../src/utils/logger', () => ({
  logger: { child: vi.fn(() => ({ info: vi.fn(), debug: vi.fn() })) },
  createRequestLogger: vi.fn(() => ({ info: vi.fn(), debug: vi.fn() })),
}));

describe('Correlation ID Middleware', () => {
  let mockNext: NextFunction;

  beforeEach(() => {
    mockNext = vi.fn();
  });

  const createMockRequest = (headers: Record<string, string> = {}): Partial<Request> => ({
    headers,
    method: 'GET',
    path: '/test',
  });

  const createMockResponse = (): Partial<Response> => ({
    setHeader: vi.fn(),
  });

  it('should generate request ID when not provided', () => {
    const req = createMockRequest() as Request;
    const res = createMockResponse() as Response;

    correlationIdMiddleware(req, res, mockNext);

    expect(req.requestId).toBeDefined();
    expect(req.requestId).toMatch(/^[0-9a-f-]{36}$/); // UUID format
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', req.requestId);
    expect(mockNext).toHaveBeenCalled();
  });

  it('should extract x-request-id from headers', () => {
    const requestId = 'existing-request-id-123';
    const req = createMockRequest({ 'x-request-id': requestId }) as Request;
    const res = createMockResponse() as Response;

    correlationIdMiddleware(req, res, mockNext);

    expect(req.requestId).toBe(requestId);
  });

  it('should extract x-correlation-id from headers', () => {
    const correlationId = 'correlation-id-456';
    const req = createMockRequest({ 'x-correlation-id': correlationId }) as Request;
    const res = createMockResponse() as Response;

    correlationIdMiddleware(req, res, mockNext);

    expect(req.requestId).toBe(correlationId);
  });

  it('should extract x-trace-id from headers', () => {
    const traceId = 'trace-id-789';
    const req = createMockRequest({ 'x-trace-id': traceId }) as Request;
    const res = createMockResponse() as Response;

    correlationIdMiddleware(req, res, mockNext);

    expect(req.requestId).toBe(traceId);
  });

  it('should prefer x-request-id over other correlation headers', () => {
    const requestId = 'request-id-primary';
    const req = createMockRequest({
      'x-request-id': requestId,
      'x-correlation-id': 'correlation-id',
      'x-trace-id': 'trace-id',
    }) as Request;
    const res = createMockResponse() as Response;

    correlationIdMiddleware(req, res, mockNext);

    expect(req.requestId).toBe(requestId);
  });

  it('should attach request logger to request', () => {
    const req = createMockRequest() as Request;
    const res = createMockResponse() as Response;

    correlationIdMiddleware(req, res, mockNext);

    expect(req.log).toBeDefined();
  });

  it('should add request ID to response headers', () => {
    const req = createMockRequest() as Request;
    const res = createMockResponse() as Response;

    correlationIdMiddleware(req, res, mockNext);

    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', req.requestId);
  });

  it('should call next middleware', () => {
    const req = createMockRequest() as Request;
    const res = createMockResponse() as Response;

    correlationIdMiddleware(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
  });
});
