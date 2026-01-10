/**
 * HTTP Errors for API responses
 * Custom error classes with status codes and error codes
 */

export class HttpError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(status: number, message: string, code?: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code || 'HTTP_ERROR';
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      ...(this.details && { details: this.details }),
    };
  }
}

export class BadRequestError extends HttpError {
  constructor(message = 'Bad Request', code = 'BAD_REQUEST', details?: Record<string, unknown>) {
    super(400, message, code, details);
    this.name = 'BadRequestError';
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = 'Unauthorized', code = 'UNAUTHORIZED', details?: Record<string, unknown>) {
    super(401, message, code, details);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = 'Forbidden', code = 'FORBIDDEN', details?: Record<string, unknown>) {
    super(403, message, code, details);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'Not Found', code = 'NOT_FOUND', details?: Record<string, unknown>) {
    super(404, message, code, details);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends HttpError {
  constructor(message = 'Conflict', code = 'CONFLICT', details?: Record<string, unknown>) {
    super(409, message, code, details);
    this.name = 'ConflictError';
  }
}

export class InternalServerError extends HttpError {
  constructor(
    message = 'Internal Server Error',
    code = 'INTERNAL_ERROR',
    details?: Record<string, unknown>,
  ) {
    super(500, message, code, details);
    this.name = 'InternalServerError';
  }
}

export class ServiceUnavailableError extends HttpError {
  constructor(
    message = 'Service Unavailable',
    code = 'SERVICE_UNAVAILABLE',
    details?: Record<string, unknown>,
  ) {
    super(503, message, code, details);
    this.name = 'ServiceUnavailableError';
  }
}
