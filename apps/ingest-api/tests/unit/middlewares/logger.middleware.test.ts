import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { EventEmitter } from 'events';

// Mock logger before importing middleware
vi.mock('../../../src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { loggerMiddleware } from '../../../src/middlewares/logger.middleware.js';
import { logger } from '../../../src/utils/logger.js';

describe('Logger Middleware', () => {
  let mockNext: NextFunction;
  let mockResponse: Response & EventEmitter;

  beforeEach(() => {
    vi.clearAllMocks();
    mockNext = vi.fn();

    // Create response that extends EventEmitter
    mockResponse = Object.assign(new EventEmitter(), {
      statusCode: 200,
      locals: {},
      writableFinished: true,
      setHeader: vi.fn(),
      getHeader: vi.fn(),
    }) as Response & EventEmitter;
  });

  const createMockRequest = (overrides: Partial<Request> = {}): Partial<Request> => ({
    method: 'GET',
    path: '/api/test',
    originalUrl: '/api/test',
    requestId: 'test-request-123',
    get: vi.fn((header: string) => {
      if (header === 'user-agent') return 'test-agent';
      if (header === 'content-length') return '100';
      return undefined;
    }),
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' },
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    } as any,
    ...overrides,
  });

  it('should call next immediately for excluded paths', () => {
    const req = createMockRequest({ path: '/health' }) as Request;

    loggerMiddleware(req, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    // Should not set up response listeners for excluded paths
    expect(mockResponse.listenerCount('finish')).toBe(0);
  });

  it('should skip /metrics path', () => {
    const req = createMockRequest({ path: '/metrics' }) as Request;

    loggerMiddleware(req, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockResponse.listenerCount('finish')).toBe(0);
  });

  it('should skip /favicon.ico path', () => {
    const req = createMockRequest({ path: '/favicon.ico' }) as Request;

    loggerMiddleware(req, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockResponse.listenerCount('finish')).toBe(0);
  });

  it('should log requests for non-excluded paths', () => {
    const req = createMockRequest() as Request;

    loggerMiddleware(req, mockResponse as Response, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockResponse.listenerCount('finish')).toBe(1);
    expect(mockResponse.listenerCount('close')).toBe(1);
  });

  it('should log successful request on response finish', () => {
    const req = createMockRequest() as Request;

    loggerMiddleware(req, mockResponse as Response, mockNext);
    mockResponse.emit('finish');

    expect(req.log!.info).toHaveBeenCalled();
  });

  it('should log warning for 4xx status codes', () => {
    const req = createMockRequest() as Request;
    mockResponse.statusCode = 400;

    loggerMiddleware(req, mockResponse as Response, mockNext);
    mockResponse.emit('finish');

    expect(req.log!.warn).toHaveBeenCalled();
  });

  it('should log error for 5xx status codes with error in res.locals', () => {
    const req = createMockRequest() as Request;
    mockResponse.statusCode = 500;
    mockResponse.locals.error = new Error('Internal server error');

    loggerMiddleware(req, mockResponse as Response, mockNext);
    mockResponse.emit('finish');

    expect(req.log!.error).toHaveBeenCalled();
  });

  it('should log warning for aborted requests', () => {
    const req = createMockRequest() as Request;
    mockResponse.writableFinished = false;

    loggerMiddleware(req, mockResponse as Response, mockNext);
    mockResponse.emit('close');

    expect(req.log!.warn).toHaveBeenCalled();
  });

  it('should use root logger if request logger not available', () => {
    const req = createMockRequest({ log: undefined }) as Request;

    loggerMiddleware(req, mockResponse as Response, mockNext);
    mockResponse.emit('finish');

    expect(logger.info).toHaveBeenCalled();
  });
});
