import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import * as Sentry from '@sentry/node';
import { sentryContextMiddleware } from '../../../src/middlewares/sentry.middleware.js';

vi.mock('@sentry/node', () => ({
  setUser: vi.fn(),
  setTag: vi.fn(),
}));

describe('Sentry Context Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      requestId: 'test-request-id',
    };
    res = {};
    next = vi.fn();
  });

  it('should set user context when req.user is present', () => {
    req.user = {
      sub: 'user-123',
      email: 'test@example.com',
      'custom:organisation_id': 'org-456',
    } as any;

    sentryContextMiddleware(req as Request, res as Response, next);

    expect(Sentry.setUser).toHaveBeenCalledWith({
      id: 'user-123',
      email: 'test@example.com',
    });
    expect(Sentry.setTag).toHaveBeenCalledWith('organisation_id', 'org-456');
    expect(next).toHaveBeenCalled();
  });

  it('should set requestId tag when present', () => {
    sentryContextMiddleware(req as Request, res as Response, next);

    expect(Sentry.setTag).toHaveBeenCalledWith('requestId', 'test-request-id');
    expect(next).toHaveBeenCalled();
  });

  it('should not set user context when req.user is undefined', () => {
    sentryContextMiddleware(req as Request, res as Response, next);

    expect(Sentry.setUser).not.toHaveBeenCalled();
    expect(Sentry.setTag).toHaveBeenCalledWith('requestId', 'test-request-id');
    expect(next).toHaveBeenCalled();
  });

  it('should handle missing organisation_id gracefully', () => {
    req.user = {
      sub: 'user-123',
      email: 'test@example.com',
    } as any;

    sentryContextMiddleware(req as Request, res as Response, next);

    expect(Sentry.setUser).toHaveBeenCalledWith({
      id: 'user-123',
      email: 'test@example.com',
    });
    expect(Sentry.setTag).toHaveBeenCalledWith('requestId', 'test-request-id');
    expect(Sentry.setTag).not.toHaveBeenCalledWith('organisation_id', expect.anything());
    expect(next).toHaveBeenCalled();
  });
});
