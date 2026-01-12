import { describe, it, expect } from 'vitest';
import { ZodError } from 'zod';
import { AppError } from '../../../src/errors/AppError.js';
import { ValidationError } from '../../../src/errors/ValidationError.js';

// Test the beforeSend logic directly
function beforeSendLogic(event: any, hint: any) {
  const error = hint?.originalException as unknown;

  if (error instanceof ZodError) {
    return null;
  }
  if (error instanceof AppError && error.statusCode < 500) {
    return null;
  }
  return event;
}

// Test the beforeBreadcrumb logic directly
function beforeBreadcrumbLogic(breadcrumb: any) {
  if (breadcrumb.category === 'http') {
    if (breadcrumb.data && typeof breadcrumb.data === 'object') {
      if (breadcrumb.data.headers) {
        delete breadcrumb.data.headers.authorization;
        delete breadcrumb.data.headers.cookie;
      }
    }
  }
  return breadcrumb;
}

describe('Sentry beforeSend filtering logic', () => {
  it('should filter out ZodError (validation errors)', () => {
    const zodError = new ZodError([
      {
        code: 'invalid_type',
        expected: 'string',
        received: 'number',
        path: ['email'],
        message: 'Expected string, received number',
      },
    ]);

    const event = { exception: {} };
    const hint = { originalException: zodError };

    const result = beforeSendLogic(event, hint);
    expect(result).toBeNull();
  });

  it('should filter out ValidationError (extends AppError with 400)', () => {
    const validationError = new ValidationError('Invalid input');

    const event = { exception: {} };
    const hint = { originalException: validationError };

    const result = beforeSendLogic(event, hint);
    // ValidationError extends AppError with statusCode 400, so it gets filtered
    expect(result).toBeNull();
  });

  it('should filter out 4xx AppError (client errors)', () => {
    const appError = new AppError('Not found', 404);

    const event = { exception: {} };
    const hint = { originalException: appError };

    const result = beforeSendLogic(event, hint);
    expect(result).toBeNull();
  });

  it('should NOT filter out 5xx AppError (server errors)', () => {
    const appError = new AppError('Database connection failed', 500);

    const event = { exception: {} };
    const hint = { originalException: appError };

    const result = beforeSendLogic(event, hint);
    expect(result).toBe(event);
  });

  it('should NOT filter out standard Error', () => {
    const error = new Error('Unexpected error');

    const event = { exception: {} };
    const hint = { originalException: error };

    const result = beforeSendLogic(event, hint);
    expect(result).toBe(event);
  });

  it('should handle missing hint gracefully', () => {
    const event = { exception: {} };
    const hint = {};

    const result = beforeSendLogic(event, hint);
    expect(result).toBe(event);
  });
});

describe('Sentry beforeBreadcrumb scrubbing logic', () => {
  it('should remove authorization header from http breadcrumbs', () => {
    const breadcrumb = {
      category: 'http',
      data: {
        headers: {
          authorization: 'Bearer secret-token',
          'content-type': 'application/json',
        },
      },
    };

    const result = beforeBreadcrumbLogic(breadcrumb);
    expect(result.data.headers.authorization).toBeUndefined();
    expect(result.data.headers['content-type']).toBe('application/json');
  });

  it('should remove cookie header from http breadcrumbs', () => {
    const breadcrumb = {
      category: 'http',
      data: {
        headers: {
          cookie: 'session=abc123',
          'user-agent': 'test-agent',
        },
      },
    };

    const result = beforeBreadcrumbLogic(breadcrumb);
    expect(result.data.headers.cookie).toBeUndefined();
    expect(result.data.headers['user-agent']).toBe('test-agent');
  });

  it('should pass through non-http breadcrumbs unchanged', () => {
    const breadcrumb = {
      category: 'console',
      message: 'Debug message',
    };

    const result = beforeBreadcrumbLogic(breadcrumb);
    expect(result).toEqual(breadcrumb);
  });

  it('should handle breadcrumbs without data gracefully', () => {
    const breadcrumb = {
      category: 'http',
    };

    const result = beforeBreadcrumbLogic(breadcrumb);
    expect(result).toEqual(breadcrumb);
  });
});
