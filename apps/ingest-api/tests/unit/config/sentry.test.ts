import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as Sentry from '@sentry/node';

vi.mock('@sentry/node', async () => {
  const actual = await vi.importActual<typeof Sentry>('@sentry/node');
  return {
    ...actual,
    init: vi.fn(),
  };
});

describe('Sentry Configuration', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.SENTRY_DSN;
    delete process.env.SENTRY_ENVIRONMENT;
    delete process.env.SENTRY_TRACES_SAMPLE_RATE;
    delete process.env.SENTRY_RELEASE;
  });

  it('should not initialize without DSN', async () => {
    process.env.SENTRY_DSN = '';
    const { initSentry } = await import('../../../src/config/sentry.js');
    initSentry();
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it('should initialize with valid DSN', async () => {
    process.env.SENTRY_DSN = 'https://examplePublicKey@o0.ingest.sentry.io/0';
    process.env.SENTRY_ENVIRONMENT = 'development';
    process.env.SENTRY_TRACES_SAMPLE_RATE = '0.1';

    const { initSentry } = await import('../../../src/config/sentry.js');
    initSentry();
    expect(Sentry.init).toHaveBeenCalled();
  });
});
