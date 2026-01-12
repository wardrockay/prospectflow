import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('@sentry/node', () => {
  return {
    default: {},
    init: vi.fn(),
    Handlers: {
      requestHandler: () => (req: any, _res: any, next: any) => next(),
      tracingHandler: () => (_req: any, _res: any, next: any) => next(),
      errorHandler: () => (err: any, _req: any, _res: any, next: any) => next(err),
    },
    captureException: vi.fn(),
    setUser: vi.fn(),
    setTag: vi.fn(),
  } as any;
});

// Ensure env simulates Sentry configured
process.env.SENTRY_DSN = 'https://examplePublicKey@o0.ingest.sentry.io/0';
process.env.SENTRY_ENVIRONMENT = 'development';
process.env.SENTRY_TRACES_SAMPLE_RATE = '0.1';

// Lazy import app after mocking Sentry
const appPromise = import('../../src/app.js').then((m) => m.default);

describe('Sentry integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('captures thrown errors and tags requestId', async () => {
    const app = await appPromise;

    const res = await request(app)
      .get('/api/v1/test/error')
      .set('x-request-id', 'req-123')
      .expect(500);

    expect(res.body.status).toBe('error');

    const Sentry = await import('@sentry/node');
    expect((Sentry as any).captureException).toHaveBeenCalled();
    expect((Sentry as any).setTag).toHaveBeenCalledWith('requestId', 'req-123');
  });
});
