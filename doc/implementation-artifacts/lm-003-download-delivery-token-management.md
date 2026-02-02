# Story LM-003: Download Delivery & Token Management (API)

**Epic:** EPIC-LM-001 - Lead Magnet Delivery System  
**Status:** ready-for-dev  
**Priority:** MUST  
**Story Points:** 8  
**Sprint:** 2  
**Dependencies:** LM-001 ✅ (done), LM-002 ✅ (done)

---

## Story

**As a** confirmed subscriber  
**I want to** receive a download URL via API when I confirm my email  
**So that** the landing page can display my download and I can access my free guide

---

## Business Context

This story implements the **download delivery mechanism** for the Lead Magnet system. It's the final step in the double opt-in funnel.

### Architecture Decision (2026-02-02)

> **IMPORTANT:** L'API retourne du **JSON** (pas de redirect). La landing page externe gère l'UI (pages succès/erreur).

**User Flow:**
1. User receives confirmation email from LM-002
2. Clicks confirmation link → Landing page (externe) calls API
3. `GET /lead-magnet/confirm/{token}` → API validates token
4. API returns JSON with `downloadUrl` or error status
5. Landing page displays appropriate UI based on response
6. User downloads PDF via S3 signed URL

**API Contract:**
```typescript
// Success responses
{ success: true, status: "confirmed", downloadUrl: "https://s3...", message: "..." }
{ success: true, status: "already_confirmed", downloadUrl: "https://s3...", message: "..." }

// Error responses  
{ success: false, status: "expired", error: "TOKEN_EXPIRED", message: "..." }
{ success: false, status: "invalid", error: "TOKEN_INVALID", message: "..." }
{ success: false, status: "limit_reached", error: "USAGE_LIMIT", message: "..." }
```

---

## Acceptance Criteria

### S3 Integration

- [ ] **AC3.1:** S3 utility function generates signed URLs:
  - Valid for 15 minutes (900 seconds)
  - Uses AWS SDK v3 (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`)
  - Content-Disposition forces download with filename: `guide-mariee-sereine.pdf`
  - Content-Type set to `application/pdf`
  - Uses environment variables for credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
  - Bucket: `lightandshutter-lead-magnets`, Key: `lead-magnets/guide-mariee-sereine.pdf`

- [ ] **AC3.2:** S3 signed URL generation is secure:
  - No hardcoded secrets in code
  - Proper error handling with structured logging
  - Returns Promise<string> with signed URL

### API Route - Token Confirmation

- [ ] **AC3.3:** API route created: `GET /lead-magnet/confirm/:token`
  - **Architecture:** Express route in `apps/ingest-api/src/routes/lead-magnet.routes.ts`
  - **Returns JSON** (NOT redirects)
  - Extracts token from URL parameter
  - Validates token through service layer
  - Handles all edge cases (expired, invalid, already used beyond limit)

- [ ] **AC3.4:** Download flow implementation:
  - Token validated: hash match, not expired, use_count check
  - Database transaction (BEGIN/COMMIT/ROLLBACK):
    1. Update `lm_subscribers.status` from 'pending' → 'confirmed' (first time only)
    2. Set `lm_subscribers.confirmed_at` to NOW() (first time only)
    3. Insert `lm_consent_events` record (event_type='confirm', ip, user_agent) (first time only)
    4. Update `lm_download_tokens`: increment `use_count`, set `used_at` on first download
  - Generate S3 signed URL after successful DB transaction
  - Return JSON response with downloadUrl

- [ ] **AC3.5:** Download tracking implementation:
  - First download: Set `used_at` timestamp to NOW()
  - Subsequent downloads: Increment `use_count` only
  - Track all downloads within 48h window
  - Atomic increment to prevent race conditions

### JSON Response Format

- [ ] **AC3.6:** Success response (first confirmation):
  ```json
  {
    "success": true,
    "status": "confirmed",
    "downloadUrl": "https://s3.eu-west-3.amazonaws.com/...",
    "message": "Email confirmé, téléchargement prêt"
  }
  ```

- [ ] **AC3.7:** Success response (re-download within 48h):
  ```json
  {
    "success": true,
    "status": "already_confirmed",
    "downloadUrl": "https://s3.eu-west-3.amazonaws.com/...",
    "message": "Nouveau lien de téléchargement généré"
  }
  ```

- [ ] **AC3.8:** Error response (token expired):
  ```json
  {
    "success": false,
    "status": "expired",
    "error": "TOKEN_EXPIRED",
    "message": "Ce lien a expiré après 48 heures"
  }
  ```

- [ ] **AC3.9:** Error response (token invalid):
  ```json
  {
    "success": false,
    "status": "invalid", 
    "error": "TOKEN_INVALID",
    "message": "Ce lien n'est pas valide"
  }
  ```

- [ ] **AC3.10:** Error response (usage limit - future-proof):
  ```json
  {
    "success": false,
    "status": "limit_reached",
    "error": "USAGE_LIMIT", 
    "message": "Limite de téléchargements atteinte"
  }
  ```

### Re-download Support

- [ ] **AC3.11:** User can re-download within 48h:
  - Same token link works multiple times
  - Token remains valid for 48h from creation (`expires_at` timestamp)
  - Each use increments `use_count` in database
  - New S3 signed URL generated each time (S3 URLs expire after 15min)

### Error Handling

- [ ] **AC3.12:** S3 errors handled gracefully:
  - Catch AWS SDK errors (network, permissions, missing file)
  - Log error with full context using Pino structured logging
  - Return 500 JSON error with user-friendly message

- [ ] **AC3.13:** Database errors handled gracefully:
  - Transaction ROLLBACK on any database error
  - Log error with full context
  - Return 500 JSON error with user-friendly message

- [ ] **AC3.14:** All errors logged with structured logging:
  - Use `createChildLogger('lead-magnet-confirm')` from project logging standards
  - Log context: `{ token_hash, subscriber_id, error_type, error_message }`
  - NEVER log plain tokens in logs (only token_hash)

---

## Developer Context & Implementation Guide

### 🚨 Critical Architecture Decisions

**1. Where to implement:**
- ✅ **Express routes** in `apps/ingest-api/src/routes/lead-magnet.routes.ts`
- ❌ **NOT in ui-web** (that's for dashboard only)
- **Reason:** This is B2C API consumed by external landing page

**2. Response format:**
- ✅ **JSON responses** for all cases
- ❌ **NOT redirects** - landing page handles UI
- **Reason:** Découplage API / Frontend, landing page contrôle l'UX

**3. Token security:**
- NEVER log plain tokens
- Always hash tokens before database lookup using SHA-256
- Use `hashToken()` utility from `src/utils/token.utils.ts`

---

### File Structure

```
apps/ingest-api/
├── src/
│   ├── routes/
│   │   └── lead-magnet.routes.ts    # UPDATE - Add GET /confirm/:token
│   ├── controllers/
│   │   └── lead-magnet.controller.ts # UPDATE - Add confirmToken()
│   ├── services/
│   │   └── lead-magnet.service.ts   # UPDATE - Add confirmToken()
│   └── utils/
│       ├── token.utils.ts           # EXISTS - hashToken()
│       └── s3.utils.ts              # NEW - getSignedDownloadUrl()
└── env/
    └── .env                         # UPDATE - Add AWS S3 credentials
```

---

### Dependencies Required

Vérifier dans `apps/ingest-api/package.json` (probablement déjà présent depuis LM-002):

```json
{
  "dependencies": {
    "@aws-sdk/client-s3": "^3.515.0",
    "@aws-sdk/s3-request-presigner": "^3.515.0"
  }
}
```

**Si manquant:**
```bash
cd apps/ingest-api && pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

---

### Code Implementation Patterns

#### Pattern 1: S3 Signed URL Utility

**File:** `apps/ingest-api/src/utils/s3.utils.ts`

```typescript
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createChildLogger } from './logger.js';

const logger = createChildLogger('s3-utils');

const s3Client = new S3Client({ 
  region: process.env.AWS_REGION || 'eu-west-3',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

/**
 * Generate a time-limited signed URL for lead magnet PDF download
 * @returns Promise<string> - Signed S3 URL valid for 15 minutes
 * @throws Error if S3 credentials missing or S3 request fails
 */
export async function getLeadMagnetDownloadUrl(): Promise<string> {
  const bucketName = process.env.S3_BUCKET_NAME;
  const fileKey = process.env.S3_FILE_KEY || 'lead-magnets/guide-mariee-sereine.pdf';

  if (!bucketName) {
    logger.error('S3_BUCKET_NAME environment variable not set');
    throw new Error('S3 configuration missing: S3_BUCKET_NAME not set');
  }

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: fileKey,
    ResponseContentDisposition: 'attachment; filename="guide-mariee-sereine.pdf"',
    ResponseContentType: 'application/pdf'
  });

  try {
    // Signed URL valid for 15 minutes (900 seconds)
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });
    logger.debug({ bucket: bucketName, key: fileKey }, 'Generated S3 signed URL');
    return signedUrl;
  } catch (error) {
    logger.error({ error, bucket: bucketName, key: fileKey }, 'Failed to generate S3 signed URL');
    throw error;
  }
}
```

---

#### Pattern 2: Controller Implementation

**File:** `apps/ingest-api/src/controllers/lead-magnet.controller.ts` (UPDATE)

```typescript
import { Request, Response } from 'express';
import * as leadMagnetService from '../services/lead-magnet.service.js';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('lead-magnet-controller');

// ... existing signup controller ...

/**
 * GET /lead-magnet/confirm/:token
 * Confirm email and return download URL
 */
export async function confirmToken(req: Request, res: Response): Promise<void> {
  const { token } = req.params;
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const userAgent = req.get('user-agent') || 'unknown';

  if (!token) {
    res.status(400).json({
      success: false,
      status: 'invalid',
      error: 'TOKEN_MISSING',
      message: 'Token requis'
    });
    return;
  }

  try {
    const result = await leadMagnetService.confirmToken(token, ip, userAgent);
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      // Map error status to HTTP status code
      const statusCode = result.error === 'TOKEN_INVALID' ? 404 
                       : result.error === 'TOKEN_EXPIRED' ? 410 
                       : result.error === 'USAGE_LIMIT' ? 429 
                       : 400;
      res.status(statusCode).json(result);
    }
  } catch (error) {
    logger.error({ error, tokenPrefix: token.substring(0, 8) }, 'Token confirmation failed');
    res.status(500).json({
      success: false,
      status: 'error',
      error: 'INTERNAL_ERROR',
      message: 'Erreur lors de la confirmation. Veuillez réessayer.'
    });
  }
}
```

---

#### Pattern 3: Service Implementation

**File:** `apps/ingest-api/src/services/lead-magnet.service.ts` (UPDATE)

```typescript
import { getDatabase } from '../utils/database.js';
import { hashToken } from '../utils/token.utils.js';
import { getLeadMagnetDownloadUrl } from '../utils/s3.utils.js';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('lead-magnet-service');

// ... existing signup service ...

interface ConfirmTokenResult {
  success: boolean;
  status: 'confirmed' | 'already_confirmed' | 'expired' | 'invalid' | 'limit_reached' | 'error';
  downloadUrl?: string;
  error?: string;
  message: string;
}

/**
 * Confirm token and generate download URL
 */
export async function confirmToken(
  plainToken: string, 
  ip: string, 
  userAgent: string
): Promise<ConfirmTokenResult> {
  const tokenHash = hashToken(plainToken);
  const db = getDatabase();

  // Step 1: Validate token
  const tokenResult = await db.query(
    `SELECT dt.id, dt.subscriber_id, dt.expires_at, dt.use_count, dt.max_uses, dt.used_at,
            s.email, s.status
     FROM lm_download_tokens dt
     JOIN lm_subscribers s ON s.id = dt.subscriber_id
     WHERE dt.token_hash = $1 AND dt.purpose = 'confirm_and_download'`,
    [tokenHash]
  );

  if (tokenResult.rows.length === 0) {
    logger.warn({ tokenHashPrefix: tokenHash.substring(0, 8) }, 'Invalid token attempted');
    return {
      success: false,
      status: 'invalid',
      error: 'TOKEN_INVALID',
      message: "Ce lien n'est pas valide"
    };
  }

  const tokenData = tokenResult.rows[0];

  // Step 2: Check expiration (48h from creation)
  if (new Date(tokenData.expires_at) < new Date()) {
    logger.info({ subscriberId: tokenData.subscriber_id }, 'Expired token used');
    return {
      success: false,
      status: 'expired',
      error: 'TOKEN_EXPIRED',
      message: 'Ce lien a expiré après 48 heures'
    };
  }

  // Step 3: Check usage limit (currently 999, effectively unlimited)
  if (tokenData.use_count >= tokenData.max_uses) {
    return {
      success: false,
      status: 'limit_reached',
      error: 'USAGE_LIMIT',
      message: 'Limite de téléchargements atteinte'
    };
  }

  // Step 4: Begin database transaction
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');

    const isFirstConfirmation = tokenData.status === 'pending';

    // Step 5: Update subscriber status if pending
    if (isFirstConfirmation) {
      await client.query(
        `UPDATE lm_subscribers 
         SET status = 'confirmed', confirmed_at = NOW()
         WHERE id = $1`,
        [tokenData.subscriber_id]
      );

      // Log consent confirmation event (RGPD audit trail)
      await client.query(
        `INSERT INTO lm_consent_events 
         (subscriber_id, event_type, ip, user_agent, occurred_at)
         VALUES ($1, 'confirm', $2, $3, NOW())`,
        [tokenData.subscriber_id, ip, userAgent]
      );
      
      logger.info({ subscriberId: tokenData.subscriber_id, email: tokenData.email }, 'Subscriber confirmed');
    }

    // Step 6: Update token usage
    const isFirstDownload = !tokenData.used_at;
    if (isFirstDownload) {
      await client.query(
        `UPDATE lm_download_tokens 
         SET use_count = use_count + 1, used_at = NOW() 
         WHERE id = $1`,
        [tokenData.id]
      );
    } else {
      await client.query(
        `UPDATE lm_download_tokens 
         SET use_count = use_count + 1 
         WHERE id = $1`,
        [tokenData.id]
      );
    }

    await client.query('COMMIT');

    // Step 7: Generate S3 signed URL (after successful DB transaction)
    const downloadUrl = await getLeadMagnetDownloadUrl();

    logger.info({ 
      subscriberId: tokenData.subscriber_id, 
      useCount: tokenData.use_count + 1,
      isFirstConfirmation 
    }, 'Download URL generated');

    return {
      success: true,
      status: isFirstConfirmation ? 'confirmed' : 'already_confirmed',
      downloadUrl,
      message: isFirstConfirmation 
        ? 'Email confirmé, téléchargement prêt'
        : 'Nouveau lien de téléchargement généré'
    };

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error({ error, subscriberId: tokenData.subscriber_id }, 'Transaction failed');
    throw error;
  } finally {
    client.release();
  }
}
```

---

#### Pattern 4: Route Registration

**File:** `apps/ingest-api/src/routes/lead-magnet.routes.ts` (UPDATE)

```typescript
import { Router } from 'express';
import * as leadMagnetController from '../controllers/lead-magnet.controller.js';

const router = Router();

/**
 * POST /api/lead-magnet/signup
 * Email capture and double opt-in flow
 */
router.post('/signup', leadMagnetController.signup);

/**
 * GET /api/lead-magnet/confirm/:token
 * Confirm email and return download URL (JSON response)
 */
router.get('/confirm/:token', leadMagnetController.confirmToken);

export default router;
```

---

### Environment Variables

Ajouter/vérifier dans `apps/ingest-api/env/.env`:

```bash
# AWS S3 Configuration (from LM-001 infrastructure setup)
AWS_REGION=eu-west-3
AWS_ACCESS_KEY_ID=AKIA...                    # From IAM user: lightandshutter-lead-magnet-service
AWS_SECRET_ACCESS_KEY=***                    # From IAM user
S3_BUCKET_NAME=lightandshutter-lead-magnets
S3_FILE_KEY=lead-magnets/guide-mariee-sereine.pdf
```

---

### Testing Requirements

**Unit Tests:**

```typescript
// apps/ingest-api/tests/unit/utils/s3.utils.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getLeadMagnetDownloadUrl } from '../../../src/utils/s3.utils.js';

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(),
  GetObjectCommand: vi.fn()
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(() => Promise.resolve('https://s3.eu-west-3.amazonaws.com/test-signed-url'))
}));

describe('getLeadMagnetDownloadUrl', () => {
  beforeEach(() => {
    process.env.S3_BUCKET_NAME = 'test-bucket';
    process.env.S3_FILE_KEY = 'test-key.pdf';
  });

  it('should generate signed URL with correct parameters', async () => {
    const url = await getLeadMagnetDownloadUrl();
    expect(url).toBe('https://s3.eu-west-3.amazonaws.com/test-signed-url');
  });

  it('should throw error if S3_BUCKET_NAME missing', async () => {
    delete process.env.S3_BUCKET_NAME;
    await expect(getLeadMagnetDownloadUrl()).rejects.toThrow('S3 configuration missing');
  });
});
```

**Integration Tests:**

```typescript
// apps/ingest-api/tests/integration/lead-magnet-confirm.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';
import { getDatabase } from '../../src/utils/database.js';
import { hashToken } from '../../src/utils/token.utils.js';

describe('GET /api/lead-magnet/confirm/:token', () => {
  let testSubscriberId: string;
  const testToken = 'test-token-plain-text';
  const tokenHash = hashToken(testToken);

  beforeEach(async () => {
    const db = getDatabase();
    
    // Create test subscriber
    const result = await db.query(
      `INSERT INTO lm_subscribers (email, status) 
       VALUES ('test@example.com', 'pending') 
       RETURNING id`
    );
    testSubscriberId = result.rows[0].id;

    // Create test token (valid for 48h)
    await db.query(
      `INSERT INTO lm_download_tokens 
       (subscriber_id, token_hash, purpose, expires_at, max_uses) 
       VALUES ($1, $2, 'confirm_and_download', NOW() + INTERVAL '48 hours', 999)`,
      [testSubscriberId, tokenHash]
    );
  });

  afterEach(async () => {
    const db = getDatabase();
    await db.query('DELETE FROM lm_subscribers WHERE id = $1', [testSubscriberId]);
  });

  it('should confirm subscriber and return download URL on first use', async () => {
    const response = await request(app)
      .get(`/api/lead-magnet/confirm/${testToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.status).toBe('confirmed');
    expect(response.body.downloadUrl).toContain('s3');
    expect(response.body.message).toBe('Email confirmé, téléchargement prêt');
  });

  it('should allow re-download within 48h window', async () => {
    // First confirmation
    await request(app).get(`/api/lead-magnet/confirm/${testToken}`);

    // Second call (re-download)
    const response = await request(app)
      .get(`/api/lead-magnet/confirm/${testToken}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.status).toBe('already_confirmed');
    expect(response.body.downloadUrl).toBeTruthy();
  });

  it('should return 410 for expired token', async () => {
    const db = getDatabase();
    await db.query(
      `UPDATE lm_download_tokens 
       SET expires_at = NOW() - INTERVAL '1 hour' 
       WHERE subscriber_id = $1`,
      [testSubscriberId]
    );

    const response = await request(app)
      .get(`/api/lead-magnet/confirm/${testToken}`)
      .expect(410);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('TOKEN_EXPIRED');
  });

  it('should return 404 for invalid token', async () => {
    const response = await request(app)
      .get('/api/lead-magnet/confirm/invalid-token-xyz')
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('TOKEN_INVALID');
  });
});
```

---

### Manual QA Checklist

- [ ] Call `/api/lead-magnet/confirm/{token}` with valid token → Returns JSON with downloadUrl
- [ ] Call same endpoint again (re-download) → Returns JSON with new downloadUrl
- [ ] Test expired token → Returns JSON with TOKEN_EXPIRED error
- [ ] Test invalid token → Returns JSON with TOKEN_INVALID error
- [ ] Verify S3 URL works and triggers PDF download
- [ ] Verify database records: subscriber status, consent event, token usage
- [ ] Check logs for structured logging (no plain tokens logged)

---

## Tasks / Subtasks

- [ ] **Task 1: S3 Integration** (AC3.1, AC3.2)
  - [ ] 1.1: Install AWS SDK packages (if not present)
  - [ ] 1.2: Create `src/utils/s3.utils.ts` with `getLeadMagnetDownloadUrl()`
  - [ ] 1.3: Configure S3Client with credentials from environment
  - [ ] 1.4: Implement GetObjectCommand with Content-Disposition
  - [ ] 1.5: Add error handling and logging
  - [ ] 1.6: Write unit tests for S3 utility

- [ ] **Task 2: Controller Implementation** (AC3.3)
  - [ ] 2.1: Add `confirmToken()` function to lead-magnet.controller.ts
  - [ ] 2.2: Extract token from URL params
  - [ ] 2.3: Map service results to HTTP status codes
  - [ ] 2.4: Return JSON responses for all cases

- [ ] **Task 3: Service Implementation** (AC3.4, AC3.5)
  - [ ] 3.1: Add `confirmToken()` function to lead-magnet.service.ts
  - [ ] 3.2: Implement token validation query
  - [ ] 3.3: Handle expired token case
  - [ ] 3.4: Handle invalid token case
  - [ ] 3.5: Implement database transaction for confirmation
  - [ ] 3.6: Update subscriber status (pending → confirmed)
  - [ ] 3.7: Insert consent event record
  - [ ] 3.8: Update token usage (increment use_count, set used_at)
  - [ ] 3.9: Generate S3 signed URL after transaction
  - [ ] 3.10: Return appropriate JSON response

- [ ] **Task 4: Route Registration** (AC3.3)
  - [ ] 4.1: Add `GET /confirm/:token` route to lead-magnet.routes.ts

- [ ] **Task 5: Testing** (AC3.12, AC3.13, AC3.14)
  - [ ] 5.1: Write unit tests for S3 utility
  - [ ] 5.2: Write integration tests for confirm endpoint
  - [ ] 5.3: Test all response scenarios (success, expired, invalid)
  - [ ] 5.4: Verify structured logging
  - [ ] 5.5: Manual QA with real tokens

- [ ] **Task 6: Environment & Documentation**
  - [ ] 6.1: Verify S3 env vars in ingest-api
  - [ ] 6.2: Update .env.example if needed
  - [ ] 6.3: Document API contract for landing page team

---

## Definition of Done

- ✅ All acceptance criteria validated (AC3.1 through AC3.14)
- ✅ S3 utility function tested with mocked AWS SDK
- ✅ API endpoint returns correct JSON for all cases
- ✅ Integration tests pass (token validation, database updates)
- ✅ Re-download within 48h window works
- ✅ Structured logging verified (no plain tokens in logs)
- ✅ Code reviewed by peer
- ✅ Merged to main branch

---

## Dev Agent Record

### Agent Model Used

_To be filled by dev agent_

### Debug Log References

_Links to debug logs if issues encountered_

### Completion Notes List

_Key implementation decisions and learnings_

### File List

**Created:**
- `apps/ingest-api/src/utils/s3.utils.ts`
- `apps/ingest-api/tests/unit/utils/s3.utils.test.ts`
- `apps/ingest-api/tests/integration/lead-magnet-confirm.test.ts`

**Modified:**
- `apps/ingest-api/src/routes/lead-magnet.routes.ts`
- `apps/ingest-api/src/controllers/lead-magnet.controller.ts`
- `apps/ingest-api/src/services/lead-magnet.service.ts`
- `apps/ingest-api/env/.env.example` (if S3 vars missing)

---

**🎯 Story ready for development! API returns JSON, landing page handles UI.**
