# Story 0.2: Express.js API Foundation with Layered Architecture

**Status:** ready-for-dev  
**Epic:** E0 - Foundation Infrastructure & Architecture  
**Story Points:** 5  
**Priority:** P0 (MVP Foundation)

---

## Story

As a **backend developer**,  
I want **a well-structured Express.js API with proper layering**,  
So that **the codebase is maintainable, testable, and follows best practices**.

---

## Acceptance Criteria

### AC1: Express Server Setup

**Given** Node.js 20.x and TypeScript 5.8.2 are configured  
**When** the server starts  
**Then** it should listen on the configured port  
**And** health check endpoint `/health` should return 200 OK  
**And** all endpoints should use JSON middleware

### AC2: Layered Architecture Implementation

**Given** the API receives a request  
**When** the request flows through the system  
**Then** it should follow this layer pattern:

- **Controller Layer**: Request validation (Zod schemas), response formatting
- **Service Layer**: Business logic, orchestration
- **Repository Layer**: Database operations, queries

**And** each layer should have clear responsibilities  
**And** no layer should skip or bypass another

### AC3: Zod Validation Middleware

**Given** an API endpoint receives a request  
**When** the request data is invalid  
**Then** Zod should validate the input  
**And** return 400 Bad Request with detailed validation errors  
**And** log the validation failure

### AC4: Error Handling Middleware

**Given** an error occurs anywhere in the application  
**When** the error is thrown or returned  
**Then** the global error handler should catch it  
**And** return appropriate HTTP status code (4xx for client errors, 5xx for server errors)  
**And** return user-friendly error message (not stack traces in production)  
**And** log the full error details with context

---

## Technical Requirements

### Technology Stack

- **Runtime:** Node.js 20.x
- **Language:** TypeScript 5.8.2
- **Framework:** Express.js 4.21.2
- **Validation:** Zod 3.24.3
- **Logging:** Pino 9.6.0 with pino-pretty 13.0.0
- **Testing:** Vitest 3.0.5
- **Database Client:** pg 8.13.3 (PostgreSQL driver)

### Project Structure

Based on the existing `/apps/ingest-api/src/` structure, ensure the following organization:

```
apps/ingest-api/src/
├── app.ts                    # Main application entry point
├── config/                   # Configuration management
│   ├── database.ts           # Database connection config
│   ├── environment.ts        # Environment variables
│   └── logger.ts             # Pino logger setup
├── controllers/              # Controller Layer (HTTP request handling)
│   ├── health.controller.ts  # Health check endpoints
│   └── base.controller.ts    # Base controller with common methods
├── services/                 # Service Layer (Business logic)
│   └── base.service.ts       # Base service class
├── repositories/             # Repository Layer (Database operations)
│   └── base.repository.ts    # Base repository with common queries
├── dto/                      # Data Transfer Objects
│   └── response.dto.ts       # Standard response format
├── schemas/                  # Zod validation schemas
│   └── health.schema.ts      # Health check schemas
├── middlewares/              # Express middlewares
│   ├── error.middleware.ts   # Global error handler
│   ├── validation.middleware.ts  # Zod validation middleware
│   ├── auth.middleware.ts    # JWT authentication (placeholder)
│   └── logger.middleware.ts  # Request logging
├── routes/                   # Route definitions
│   ├── index.ts              # Main router
│   └── health.routes.ts      # Health check routes
├── errors/                   # Custom error classes
│   ├── AppError.ts           # Base application error
│   ├── ValidationError.ts    # Validation-specific errors
│   └── DatabaseError.ts      # Database-specific errors
└── utils/                    # Utility functions
    └── async-handler.ts      # Async error wrapper
```

### Layered Architecture Pattern

#### 1. Controller Layer

**Responsibilities:**

- Parse HTTP requests
- Validate request data using Zod schemas
- Extract authentication context (organisation_id from JWT)
- Call appropriate service methods
- Format responses (success/error)
- Set appropriate HTTP status codes

**Example Pattern:**

```typescript
// controllers/health.controller.ts
import { Request, Response, NextFunction } from 'express';
import { HealthService } from '../services/health.service';
import { HealthCheckSchema } from '../schemas/health.schema';

export class HealthController {
  constructor(private healthService: HealthService) {}

  async check(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.healthService.check();
      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
```

**Key Guidelines:**

- Controllers should be thin - no business logic
- Always use try-catch and pass errors to `next()`
- Use Zod schemas for all input validation
- Return standardized response format
- Extract organisation_id from JWT and pass to service layer

#### 2. Service Layer

**Responsibilities:**

- Business logic and orchestration
- Coordinate multiple repository calls if needed
- Apply business rules and validations
- Log business-level events
- Transform data between DTOs and domain entities
- Transaction coordination (if multi-step operations)

**Example Pattern:**

```typescript
// services/health.service.ts
import { HealthRepository } from '../repositories/health.repository';
import { logger } from '../config/logger';

export class HealthService {
  constructor(private healthRepository: HealthRepository) {}

  async check() {
    logger.info('Performing health check');

    const dbStatus = await this.healthRepository.checkConnection();

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: dbStatus,
    };
  }
}
```

**Key Guidelines:**

- Services should not know about HTTP (no req/res)
- Accept plain data types (not Request objects)
- Always include logging for business events
- Use dependency injection for repositories
- Handle business-level errors (throw custom errors)

#### 3. Repository Layer

**Responsibilities:**

- Execute SQL queries
- Manage database connections
- Handle database transactions
- Map database results to entities
- Handle database-specific errors
- Implement connection pooling

**Example Pattern:**

```typescript
// repositories/health.repository.ts
import { Pool } from 'pg';
import { DatabaseError } from '../errors/DatabaseError';
import { logger } from '../config/logger';

export class HealthRepository {
  constructor(private pool: Pool) {}

  async checkConnection(): Promise<{ connected: boolean; latency: number }> {
    const start = Date.now();
    try {
      await this.pool.query('SELECT 1');
      const latency = Date.now() - start;
      return { connected: true, latency };
    } catch (error) {
      logger.error('Database connection check failed', error);
      throw new DatabaseError('Unable to connect to database');
    }
  }
}
```

**Key Guidelines:**

- All queries must include `organisation_id` for multi-tenant isolation
- Use parameterized queries to prevent SQL injection
- Always use connection pooling (never create new connections)
- Handle database errors and throw custom DatabaseError
- Log all queries in development (not in production)

### Middleware Configuration

#### 1. Global Error Handler

Must be the LAST middleware registered:

```typescript
// middlewares/error.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { logger } from '../config/logger';
import { ZodError } from 'zod';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  logger.error('Error occurred', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: err.errors,
    });
  }

  // Handle custom application errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }

  // Handle unknown errors
  res.status(500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
}
```

#### 2. Validation Middleware

```typescript
// middlewares/validation.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

export const validate = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: error.errors,
        });
      }
      next(error);
    }
  };
};
```

#### 3. Request Logger Middleware

```typescript
// middlewares/logger.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    });
  });

  next();
}
```

### App Configuration

```typescript
// app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { logger } from './config/logger';
import { errorHandler } from './middlewares/error.middleware';
import { requestLogger } from './middlewares/logger.middleware';
import routes from './routes';

const app = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  }),
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(requestLogger);

// Routes
app.use('/api/v1', routes);

// Health check (no auth required)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
  });
});

// Error handler (must be last)
app.use(errorHandler);

export default app;
```

### Custom Error Classes

```typescript
// errors/AppError.ts
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true,
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

// errors/ValidationError.ts
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

// errors/DatabaseError.ts
export class DatabaseError extends AppError {
  constructor(message: string) {
    super(message, 500);
  }
}
```

### Dependency Injection Pattern

Use constructor injection for better testability:

```typescript
// Example: routes/health.routes.ts
import { Router } from 'express';
import { Pool } from 'pg';
import { HealthController } from '../controllers/health.controller';
import { HealthService } from '../services/health.service';
import { HealthRepository } from '../repositories/health.repository';

export function createHealthRoutes(pool: Pool): Router {
  const router = Router();

  // Dependency injection chain
  const healthRepository = new HealthRepository(pool);
  const healthService = new HealthService(healthRepository);
  const healthController = new HealthController(healthService);

  router.get('/health', healthController.check.bind(healthController));

  return router;
}
```

### Logging Configuration

```typescript
// config/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      headers: req.headers,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
    err: pino.stdSerializers.err,
  },
});
```

### Environment Configuration

```typescript
// config/environment.ts
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  DATABASE_URL: z.string(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  ALLOWED_ORIGINS: z.string().optional(),
});

export const env = envSchema.parse(process.env);
```

---

## Testing Requirements

### Unit Testing with Vitest

**Coverage Target:** Minimum 70% code coverage

**Test Structure:**

```
apps/ingest-api/tests/
├── unit/
│   ├── controllers/
│   │   └── health.controller.test.ts
│   ├── services/
│   │   └── health.service.test.ts
│   └── repositories/
│       └── health.repository.test.ts
└── integration/
    └── health.integration.test.ts
```

**Example Unit Test:**

```typescript
// tests/unit/services/health.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HealthService } from '../../../src/services/health.service';
import { HealthRepository } from '../../../src/repositories/health.repository';

describe('HealthService', () => {
  let healthService: HealthService;
  let mockHealthRepository: HealthRepository;

  beforeEach(() => {
    mockHealthRepository = {
      checkConnection: vi.fn(),
    } as any;

    healthService = new HealthService(mockHealthRepository);
  });

  it('should return healthy status when database is connected', async () => {
    // Arrange
    vi.mocked(mockHealthRepository.checkConnection).mockResolvedValue({
      connected: true,
      latency: 5,
    });

    // Act
    const result = await healthService.check();

    // Assert
    expect(result.status).toBe('healthy');
    expect(result.database.connected).toBe(true);
    expect(mockHealthRepository.checkConnection).toHaveBeenCalledOnce();
  });

  it('should handle database connection errors', async () => {
    // Arrange
    vi.mocked(mockHealthRepository.checkConnection).mockRejectedValue(
      new Error('Connection failed'),
    );

    // Act & Assert
    await expect(healthService.check()).rejects.toThrow('Connection failed');
  });
});
```

**Test Commands:**

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test --coverage

# Run in watch mode
pnpm test --watch
```

---

## Architecture References

### Layered Architecture Pattern

From [ARCHITECTURE.md#Ingest API - Layered Architecture](../ARCHITECTURE.md#ingest-api---layered-architecture):

The application follows a strict 3-layer architecture:

1. **Controller Layer**: HTTP handling, validation, response formatting
2. **Service Layer**: Business logic orchestration
3. **Repository Layer**: Database operations

No layer should bypass another. All database queries must go through repositories, all business logic through services.

### Security Middleware

From [ARCHITECTURE.md#Security Architecture](../ARCHITECTURE.md#security-architecture):

- Use `helmet.js` for security headers
- Configure CORS with explicit allowed origins
- Rate limiting per endpoint (to be implemented in future story)
- JWT authentication middleware (placeholder for E0.4)

### Multi-Tenant Considerations

From [Story 0.1](0-1-multi-tenant-postgresql-database-setup.md):

- All database queries must include `organisation_id`
- Extract `organisation_id` from JWT token in controller
- Pass `organisation_id` to all service and repository methods
- Use composite foreign keys for referential integrity

---

## Definition of Done

- [ ] Express server running with TypeScript on configured port
- [ ] Controller/Service/Repository layers implemented with clear separation
- [ ] Base classes created for Controller, Service, and Repository
- [ ] Zod validation middleware working on sample endpoint
- [ ] Global error handler implemented and registered as last middleware
- [ ] Health check endpoint functional at `/health`
- [ ] Request logging middleware active (using Pino)
- [ ] Custom error classes created (AppError, ValidationError, DatabaseError)
- [ ] Environment configuration with Zod validation
- [ ] Unit tests for each layer with >70% coverage
- [ ] Integration test for health check endpoint
- [ ] Documentation updated with layer pattern examples
- [ ] Code passes TypeScript compilation with no errors
- [ ] All tests passing in CI pipeline

---

## Dependencies

**Depends On:**

- Story E0.1: Multi-tenant PostgreSQL Database Setup (database connection required)

**Blocks:**

- Story E0.3: RabbitMQ Message Queue Configuration (needs API structure)
- Story E0.4: Authentication & Authorization System (needs middleware structure)

---

## Dev Notes

### Previous Story Learnings (from E0.1)

The previous story (E0.1) established:

- PostgreSQL database with multi-schema architecture
- Multi-tenant isolation using `organisation_id` in composite keys
- Flyway migrations for schema versioning
- Connection pooling configured

**Key Takeaway:** All queries in this story must respect the multi-tenant architecture by including `organisation_id` in WHERE clauses.

### Critical Implementation Points

1. **Layer Separation is Sacred**: Never bypass layers. Controllers don't talk to repositories directly.

2. **Error Handling**: Use try-catch in controllers and pass to `next()`. Let the global error handler format responses.

3. **Dependency Injection**: Use constructor injection for all dependencies to enable testing.

4. **Async/Await**: All controller methods should be async and properly handle promises.

5. **Zod Validation**: Define schemas in separate files, apply via middleware, not in controllers.

6. **Logging**: Log at service layer for business events, not at controller layer for HTTP events (that's middleware's job).

### Testing Strategy

- **Unit Tests**: Mock dependencies, test each layer in isolation
- **Integration Tests**: Test full request-response cycle with real database (test DB)
- **Coverage**: Aim for >70% but focus on critical paths first

### Common Pitfalls to Avoid

❌ **Don't:**

- Put business logic in controllers
- Make HTTP calls from services
- Skip error handling in async functions
- Expose stack traces in production
- Forget to bind controller methods when using in routes

✅ **Do:**

- Keep controllers thin (just HTTP adapter)
- Use custom error classes with appropriate status codes
- Log errors with context (not just error message)
- Use Zod for all input validation
- Test each layer independently

---

## Dev Agent Record

### Completion Status

**Status:** ready-for-dev

### Agent Notes

This story establishes the foundational patterns for all API development in ProspectFlow. Every future API endpoint should follow the exact same layered architecture pattern demonstrated in this story.

**Critical Success Factors:**

1. Clear separation of concerns between layers
2. Comprehensive error handling
3. Testable code through dependency injection
4. Consistent logging patterns
5. Type safety throughout (TypeScript + Zod)

**Next Steps After Completion:**

1. Use this pattern as template for all future endpoints
2. Create developer documentation with examples
3. Set up linting rules to enforce layer separation
4. Consider creating code generator for new endpoints

---

## Implementation Checklist

### Core Structure

- [ ] Create base controller with common methods
- [ ] Create base service with logging
- [ ] Create base repository with pool management
- [ ] Set up dependency injection container (optional)

### Middleware

- [ ] Error handler middleware (global)
- [ ] Validation middleware (Zod)
- [ ] Logger middleware (request/response)
- [ ] CORS configuration
- [ ] Security headers (helmet)

### Configuration

- [ ] Environment variables with Zod validation
- [ ] Pino logger configuration
- [ ] Database connection pool setup

### Health Check Example

- [ ] Health controller
- [ ] Health service
- [ ] Health repository
- [ ] Health routes
- [ ] Health Zod schemas

### Error Handling

- [ ] AppError base class
- [ ] ValidationError class
- [ ] DatabaseError class
- [ ] Error handler tests

### Testing

- [ ] Vitest configuration
- [ ] Unit test examples for each layer
- [ ] Integration test for health check
- [ ] Test coverage report setup

### Documentation

- [ ] API structure documentation
- [ ] Layer pattern examples
- [ ] Error handling guide
- [ ] Testing guide
