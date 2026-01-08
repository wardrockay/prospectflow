# 🎯 ProspectFlow - Priority Action Plan

**Generated:** January 8, 2025  
**Purpose:** Prioritized roadmap to address critical issues and reach MVP

---

## 🚨 CRITICAL SECURITY FIXES (Sprint 1: Week 1-2)

### Priority 1.1: Implement Authentication (3 days)

**Status:** 🔴 BLOCKING

#### Tasks
- [ ] **Day 1: Setup JWT Authentication**
  ```typescript
  // apps/ingest-api/src/middlewares/auth.middleware.ts
  import jwt from 'jsonwebtoken';
  
  interface JWTPayload {
    user_id: string;
    organisation_id: string;
    email: string;
    role: string;
  }
  
  export const authenticateToken = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    try {
      const decoded = jwt.verify(token, env.jwtSecret) as JWTPayload;
      req.user = decoded;
      req.organisationId = decoded.organisation_id;
      next();
    } catch (error) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
  };
  ```

- [ ] **Day 2: Add Environment Variables**
  ```bash
  # apps/ingest-api/env/.env.dev
  JWT_SECRET=your-secret-key-min-32-chars
  JWT_EXPIRATION=24h
  ```
  
  ```typescript
  // apps/ingest-api/src/config/env.ts
  export const env = {
    // ... existing config
    jwtSecret: getEnvVar('JWT_SECRET'),
    jwtExpiration: getEnvVar('JWT_EXPIRATION', '24h'),
  };
  ```

- [ ] **Day 3: Apply Middleware to Routes**
  ```typescript
  // apps/ingest-api/src/routes/index.ts
  import { authenticateToken } from '../middlewares/auth.middleware.js';
  
  const router = Router();
  
  // Public routes (health checks, metrics)
  router.get('/health', healthController.check);
  
  // Protected routes (require authentication)
  router.use(authenticateToken);
  router.use('/ingest', ingestRouter);
  
  export default router;
  ```

**Acceptance Criteria:**
- ✅ All API endpoints require valid JWT
- ✅ JWT contains organisation_id
- ✅ Invalid tokens return 403
- ✅ Missing tokens return 401

---

### Priority 1.2: Enforce Multi-Tenancy (3 days)

**Status:** 🔴 BLOCKING

#### Tasks
- [ ] **Day 1: Add Tenant Context Middleware**
  ```typescript
  // apps/ingest-api/src/middlewares/tenant.middleware.ts
  export const validateTenantContext = (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.organisationId) {
      return res.status(400).json({ 
        error: 'Missing organisation context' 
      });
    }
    
    // Optionally validate against request body
    if (req.body.organisationId && 
        req.body.organisationId !== req.organisationId) {
      return res.status(403).json({ 
        error: 'Organisation ID mismatch' 
      });
    }
    
    next();
  };
  ```

- [ ] **Day 2: Update Repository to Filter by Organisation**
  ```typescript
  // apps/ingest-api/src/repositories/ingest.repository.ts
  async create(
    data: PharowItem[], 
    organisationId: string  // ← Add this parameter
  ): Promise<IngestEntity> {
    // ... existing code
    
    // Update company insert to include organisation_id
    const companyResult = await client.query(
      `INSERT INTO crm.companies (
        organisation_id,  -- ← Add this
        pharow_company_id, siren, ...
      ) VALUES ($1, $2, $3, ...)
      ON CONFLICT (organisation_id, pharow_company_id) 
      DO UPDATE SET ...`,
      [
        organisationId,  // ← Pass this first
        item.company.pharowCompanyId,
        // ... rest of values
      ]
    );
    
    // Similar updates for people and positions
  }
  ```

- [ ] **Day 3: Update Service and Controller**
  ```typescript
  // apps/ingest-api/src/services/ingest.service.ts
  async processIngest(
    ingestDto: IngestDto,
    organisationId: string
  ): Promise<IngestEntity> {
    const ingest = await ingestRepository.create(
      ingestDto.data,
      organisationId  // ← Pass through
    );
    return ingest;
  }
  
  // apps/ingest-api/src/controllers/ingest.controller.ts
  async create(req: Request, res: Response, next: NextFunction) {
    const validatedData = ingestSchema.parse(req.body);
    const result = await ingestService.processIngest(
      validatedData,
      req.organisationId  // ← Get from JWT
    );
    res.status(201).json({ success: true, data: result });
  }
  ```

**Acceptance Criteria:**
- ✅ All database inserts include organisation_id
- ✅ All queries filter by organisation_id
- ✅ Cross-tenant access returns 403
- ✅ Data isolation verified with tests

---

### Priority 1.3: Add Rate Limiting (1 day)

**Status:** 🔴 HIGH

#### Tasks
- [ ] **Install Dependencies**
  ```bash
  pnpm add express-rate-limit
  pnpm add -D @types/express-rate-limit
  ```

- [ ] **Configure Rate Limiter**
  ```typescript
  // apps/ingest-api/src/middlewares/rate-limit.middleware.ts
  import rateLimit from 'express-rate-limit';
  
  export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    message: 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
  });
  
  export const ingestLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // Limit ingest to 10 requests per minute
    message: 'Too many ingest requests, please slow down',
  });
  ```

- [ ] **Apply to Routes**
  ```typescript
  // apps/ingest-api/src/app.ts
  import { apiLimiter, ingestLimiter } from './middlewares/rate-limit.middleware.js';
  
  app.use('/api/', apiLimiter);
  app.use('/api/v1/ingest', ingestLimiter);
  ```

**Acceptance Criteria:**
- ✅ API requests limited to 100/15min per IP
- ✅ Ingest requests limited to 10/min
- ✅ Rate limit headers returned (X-RateLimit-*)
- ✅ 429 status returned when exceeded

---

### Priority 1.4: Secure Secrets Management (2 days)

**Status:** 🔴 HIGH

#### Tasks
- [ ] **Day 1: Create Secret Templates**
  ```bash
  # apps/ingest-api/env/.env.example
  # Database
  POSTGRES_HOST=localhost
  POSTGRES_PORT=5432
  POSTGRES_USER=prospectflow
  POSTGRES_PASSWORD=CHANGE_ME_IN_PRODUCTION
  POSTGRES_DB=prospectflow
  
  # JWT
  JWT_SECRET=GENERATE_RANDOM_32_CHAR_STRING
  JWT_EXPIRATION=24h
  
  # API
  PORT=3000
  NODE_ENV=development
  CORS_ORIGIN=http://localhost:3000
  LOG_LEVEL=debug
  ```

- [ ] **Day 2: Add Secret Validation**
  ```typescript
  // apps/ingest-api/src/config/env.ts
  function validateSecrets() {
    // Ensure JWT secret is strong enough
    if (env.jwtSecret.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters');
    }
    
    // Warn about default passwords in production
    if (env.node_env === 'production') {
      if (env.postgres.password === 'changeme') {
        throw new Error('Cannot use default password in production');
      }
    }
  }
  
  validateSecrets();
  ```

**Acceptance Criteria:**
- ✅ .env files in .gitignore
- ✅ .env.example documented
- ✅ Secret validation at startup
- ✅ No secrets in git history

---

## 🧪 TESTING & QUALITY (Sprint 2: Week 3-4)

### Priority 2.1: Integration Test Suite (5 days)

**Status:** 🟡 HIGH

#### Tasks
- [ ] **Day 1: Setup Test Database**
  ```typescript
  // apps/ingest-api/tests/setup.ts
  import { Pool } from 'pg';
  
  let testPool: Pool;
  
  export async function setupTestDatabase() {
    testPool = new Pool({
      host: 'localhost',
      port: 5432,
      user: 'prospectflow_test',
      password: 'test',
      database: 'prospectflow_test',
    });
    
    // Run migrations
    await runMigrations(testPool);
    
    // Create test organisation
    await testPool.query(`
      INSERT INTO iam.organisations (id, name)
      VALUES ('00000000-0000-0000-0000-000000000001', 'Test Org')
    `);
  }
  
  export async function teardownTestDatabase() {
    await testPool.query('TRUNCATE TABLE crm.companies CASCADE');
    await testPool.end();
  }
  ```

- [ ] **Day 2-3: Write API Integration Tests**
  ```typescript
  // apps/ingest-api/tests/integration/ingest.test.ts
  import request from 'supertest';
  import { app } from '../../src/app';
  import { generateTestToken } from '../helpers/auth';
  
  describe('POST /api/v1/ingest', () => {
    const token = generateTestToken({
      organisation_id: TEST_ORG_ID,
      user_id: TEST_USER_ID,
    });
    
    it('should ingest valid Pharrow data', async () => {
      const response = await request(app)
        .post('/api/v1/ingest')
        .set('Authorization', `Bearer ${token}`)
        .send({
          data: [/* test data */]
        });
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.itemCount).toBe(1);
    });
    
    it('should reject requests without token', async () => {
      const response = await request(app)
        .post('/api/v1/ingest')
        .send({ data: [] });
      
      expect(response.status).toBe(401);
    });
    
    it('should reject cross-tenant access', async () => {
      // Create data in Org A
      // Try to access with token from Org B
      // Should fail
    });
  });
  ```

- [ ] **Day 4: Write Repository Tests**
  ```typescript
  // apps/ingest-api/tests/integration/repository.test.ts
  describe('IngestRepository', () => {
    it('should create company with organisation_id', async () => {
      const result = await ingestRepository.create(
        testData,
        TEST_ORG_ID
      );
      
      const company = await getCompanyById(result.companyId);
      expect(company.organisation_id).toBe(TEST_ORG_ID);
    });
    
    it('should handle duplicate emails gracefully', async () => {
      // Insert same email twice
      // Should update, not fail
    });
  });
  ```

- [ ] **Day 5: Add Test Coverage Reporting**
  ```typescript
  // vitest.config.ts
  export default defineConfig({
    test: {
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html', 'lcov'],
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  });
  ```

**Acceptance Criteria:**
- ✅ 80%+ code coverage
- ✅ All endpoints tested
- ✅ Auth scenarios covered
- ✅ Multi-tenant isolation verified
- ✅ Error cases tested

---

### Priority 2.2: Add Health Checks & Monitoring (2 days)

**Status:** 🟡 HIGH

#### Tasks
- [ ] **Day 1: Implement Health Checks**
  ```typescript
  // apps/ingest-api/src/controllers/health.controller.ts
  export class HealthController {
    async check(req: Request, res: Response) {
      const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        checks: {
          database: await checkDatabase(),
          redis: await checkRedis(),
          memory: checkMemory(),
        },
      };
      
      const isHealthy = Object.values(health.checks)
        .every(c => c.status === 'ok');
      
      res.status(isHealthy ? 200 : 503).json(health);
    }
    
    async ready(req: Request, res: Response) {
      // Kubernetes readiness probe
      const ready = await checkDatabaseConnection();
      res.status(ready ? 200 : 503).json({ ready });
    }
  }
  ```

- [ ] **Day 2: Add Prometheus Metrics**
  ```typescript
  // apps/ingest-api/src/metrics.ts
  import { register, Counter, Histogram } from 'prom-client';
  
  export const httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status'],
  });
  
  export const ingestRequestsTotal = new Counter({
    name: 'ingest_requests_total',
    help: 'Total number of ingest requests',
    labelNames: ['status', 'organisation_id'],
  });
  
  // Middleware
  export const metricsMiddleware = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;
      httpRequestDuration.labels(
        req.method,
        req.route?.path || 'unknown',
        res.statusCode
      ).observe(duration);
    });
    next();
  };
  
  // Endpoint
  app.get('/metrics', (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(register.metrics());
  });
  ```

**Acceptance Criteria:**
- ✅ /health endpoint returns system status
- ✅ /ready endpoint for K8s probes
- ✅ /metrics endpoint with Prometheus format
- ✅ Request duration tracked
- ✅ Error rates tracked

---

### Priority 2.3: API Documentation (2 days)

**Status:** 🟡 MEDIUM

#### Tasks
- [ ] **Day 1: Setup OpenAPI/Swagger**
  ```bash
  pnpm add swagger-jsdoc swagger-ui-express
  pnpm add -D @types/swagger-jsdoc @types/swagger-ui-express
  ```
  
  ```typescript
  // apps/ingest-api/src/swagger.ts
  import swaggerJsdoc from 'swagger-jsdoc';
  import swaggerUi from 'swagger-ui-express';
  
  const options = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'ProspectFlow Ingest API',
        version: '1.0.0',
        description: 'API for ingesting prospect data from Pharow',
      },
      servers: [
        { url: 'http://localhost:3000', description: 'Development' },
        { url: 'https://api.prospectflow.com', description: 'Production' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    apis: ['./src/routes/*.ts'],
  };
  
  export const swaggerSpec = swaggerJsdoc(options);
  
  // In app.ts
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  ```

- [ ] **Day 2: Document Endpoints**
  ```typescript
  // apps/ingest-api/src/routes/ingest.route.ts
  /**
   * @swagger
   * /api/v1/ingest:
   *   post:
   *     summary: Ingest prospect data from Pharow
   *     tags: [Ingest]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - data
   *             properties:
   *               data:
   *                 type: array
   *                 items:
   *                   $ref: '#/components/schemas/PharowItem'
   *     responses:
   *       201:
   *         description: Successfully ingested data
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/IngestResponse'
   *       401:
   *         description: Unauthorized - Missing or invalid token
   *       400:
   *         description: Validation error
   */
  router.post('/', ingestController.create);
  ```

**Acceptance Criteria:**
- ✅ /api/docs Swagger UI available
- ✅ All endpoints documented
- ✅ Request/response schemas defined
- ✅ Authentication documented
- ✅ Example requests provided

---

## 🚀 MVP FEATURES (Sprint 3-4: Week 5-8)

### Priority 3.1: Campaign Management API (5 days)

**Status:** 🟢 PLANNED

#### Features
- Create/read/update/delete campaigns
- Manage workflow steps
- Configure prompts
- Set up A/B experiments

### Priority 3.2: Draft Worker Service (5 days)

**Status:** 🟢 PLANNED

#### Features
- Pull tasks from queue
- Generate email drafts using AI
- Store generated content
- Update task status

### Priority 3.3: Email Sending Service (5 days)

**Status:** 🟢 PLANNED

#### Features
- Gmail API integration
- Queue-based sending
- Retry logic
- Bounce handling

### Priority 3.4: Admin Dashboard (5 days)

**Status:** 🟢 PLANNED

#### Features
- Campaign creation UI
- Contact list management
- Analytics dashboard
- User management

---

## 📊 Progress Tracking

### Sprint 1 (Week 1-2): Security & Foundation
- [ ] Priority 1.1: Authentication (3 days)
- [ ] Priority 1.2: Multi-tenancy (3 days)
- [ ] Priority 1.3: Rate limiting (1 day)
- [ ] Priority 1.4: Secrets management (2 days)

**Total: 9 days**

### Sprint 2 (Week 3-4): Testing & Quality
- [ ] Priority 2.1: Integration tests (5 days)
- [ ] Priority 2.2: Health checks & monitoring (2 days)
- [ ] Priority 2.3: API documentation (2 days)

**Total: 9 days**

### Sprint 3-4 (Week 5-8): MVP Features
- [ ] Priority 3.1: Campaign API (5 days)
- [ ] Priority 3.2: Draft worker (5 days)
- [ ] Priority 3.3: Email sending (5 days)
- [ ] Priority 3.4: Admin dashboard (5 days)

**Total: 20 days**

---

## 🎯 Definition of Done

### Security Checklist
- [ ] All endpoints require authentication
- [ ] Multi-tenant isolation enforced at DB level
- [ ] Rate limiting prevents abuse
- [ ] Secrets managed securely
- [ ] HTTPS enforced in production
- [ ] CORS configured correctly

### Quality Checklist
- [ ] 80%+ test coverage
- [ ] All critical paths tested
- [ ] Health checks implemented
- [ ] Monitoring metrics exposed
- [ ] API fully documented
- [ ] Error handling comprehensive

### DevOps Checklist
- [ ] CI/CD pipeline configured
- [ ] Automated tests in pipeline
- [ ] Docker images building
- [ ] Environment configs separated
- [ ] Logging centralized
- [ ] Backups configured

---

## 📈 Success Metrics

| Metric | Current | Target (Sprint 1) | Target (Sprint 2) |
|--------|---------|-------------------|-------------------|
| Test Coverage | < 10% | 60% | 80% |
| Security Score | 30/100 | 70/100 | 85/100 |
| API Endpoints | 1 | 1 | 5 |
| Documentation | 5% | 50% | 100% |
| Response Time | ~100ms | < 200ms | < 200ms |

---

*Action plan generated by BMAD Analyst Agent - January 8, 2025*
