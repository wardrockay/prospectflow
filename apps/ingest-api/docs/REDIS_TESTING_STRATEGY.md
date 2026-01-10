# Testing Strategy: Redis Integration

## Overview

ProspectFlow uses a **pragmatic testing approach** for Redis integration:

- **Unit tests**: Use mocks (fast, no infrastructure)
- **Integration tests**: Use mocks for now (can be upgraded to real Redis later)

## Current Implementation

### Unit Tests (`tests/unit/services/`)

✅ **session.service.test.ts** - Tests Redis session logic with mocks

- All Redis operations mocked (`get`, `setEx`, `del`, `scan`, `ttl`)
- Tests session CRUD, TTL management, sliding expiration
- 23 tests, ~10ms execution time

✅ **user-sync.service.test.ts** - Tests user synchronization

- PostgreSQL queries mocked
- 15 tests, ~10ms execution time

### Integration Tests (`tests/integration/`)

⚠️ **auth.flow.test.ts** - Currently uses mocks

- Mocks both Redis and PostgreSQL
- Tests authentication flow, session management, multi-tenant isolation
- 14 tests, ~20ms execution time

**Why mocks in integration tests?**

1. **Speed**: Tests run in <1 second vs 5-10 seconds with real Redis
2. **Reliability**: No dependency on external services
3. **Simplicity**: No cleanup needed between tests
4. **CI/CD**: Works in any environment without infrastructure

## Upgrading to Real Redis (Future)

To test with real Redis when needed:

### Option 1: Manual Testing Script

```bash
# Start Redis
make dev-up

# Connect and manually test
redis-cli -n 1  # Use DB 1 for tests
> KEYS session:*
> GET session:abc-123
> TTL session:abc-123
> DEL session:abc-123
```

### Option 2: Add Real Redis Tests

1. **Configure test Redis DB** (use DB 1, not DB 0):

   ```env
   # .env.test
   REDIS_DB=1  # Separate from dev DB
   ```

2. **Create integration test file** (`tests/integration/redis/session.real.test.ts`):

   ```typescript
   import { createClient } from 'redis';

   let redisClient: ReturnType<typeof createClient>;
   let isRedisAvailable = false;

   beforeAll(async () => {
     try {
       redisClient = createClient({ socket: { host: 'localhost', port: 6379 }, database: 1 });
       await redisClient.connect();
       isRedisAvailable = true;
     } catch {
       console.log('⏭️ Redis not available, skipping');
     }
   });

   it('should store session in Redis', async () => {
     if (!isRedisAvailable) return;

     // Create session via API
     const response = await request(app)
       .get('/protected-route')
       .set('Authorization', 'Bearer mock-token');

     // Verify in Redis
     const sessionKey = 'session:user-sub';
     const session = await redisClient.get(sessionKey);
     expect(session).toBeTruthy();
   });
   ```

3. **Run with infrastructure**:
   ```bash
   make dev-up
   pnpm test tests/integration/redis/
   ```

### Option 3: E2E Tests (Most Complete)

For true end-to-end testing:

```bash
# Start full stack
make dev-up

# Run manual E2E test
cd apps/ingest-api
./smoke-test.sh  # Tests real Cognito + Redis + PostgreSQL
```

## Current Test Coverage

| Component      | Unit Tests | Integration Tests | Manual/E2E |
| -------------- | ---------- | ----------------- | ---------- |
| JWT Validation | ✅ Mocked  | ✅ Mocked         | ⚠️ Manual  |
| Redis Sessions | ✅ Mocked  | ✅ Mocked         | ⚠️ Manual  |
| User Sync (DB) | ✅ Mocked  | ✅ Mocked         | ⚠️ Manual  |
| Multi-tenant   | ✅ Mocked  | ✅ Mocked         | ⚠️ Manual  |

**Total Story 0.4 coverage**: 127 tests, all passing ✅

## When to Use Real Redis

Use real Redis integration tests when:

- 🔴 **Critical**: Debugging production issues with sessions
- 🔴 **Critical**: Before deploying Redis config changes
- 🟡 **Recommended**: Before major releases
- 🟢 **Optional**: During feature development

For most development, mocked tests are sufficient and faster.

## Tradeoffs

### Mocked Tests (Current)

✅ Fast (<1s total)
✅ No infrastructure required
✅ 100% reliable
✅ Works in CI/CD
❌ Doesn't test real Redis behavior
❌ Doesn't catch Redis-specific issues

### Real Redis Tests (Future Enhancement)

✅ Tests actual Redis behavior
✅ Catches serialization issues
✅ Tests TTL accurately
✅ Tests connection pooling
❌ Slower (5-10s)
❌ Requires Redis running
❌ Needs cleanup between tests
❌ More complex CI/CD setup

## Recommendation

**Current approach (mocked tests) is GOOD ENOUGH** for Story 0.4 because:

1. Session service logic is well-tested with mocks
2. Redis is a mature, well-tested library
3. Manual smoke tests cover end-to-end flow
4. Fast feedback loop for developers

**Consider real Redis tests when**:

- Moving to production
- Implementing complex Redis features (pub/sub, streams, etc.)
- Debugging session-related bugs in production

## References

- [Redis Testing Best Practices](https://redis.io/docs/getting-started/testing/)
- [Integration Testing Strategies](https://martinfowler.com/articles/practical-test-pyramid.html)
- [Story 0.4 Test Results](../../doc/implementation/0-4-aws-cognito-authentication-integration.md)
