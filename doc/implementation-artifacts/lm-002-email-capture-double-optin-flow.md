# Story LM-002: Email Capture & Double Opt-in Flow

**Epic:** EPIC-LM-001 - Lead Magnet Delivery System  
**Status:** ready-for-dev  
**Priority:** MUST  
**Story Points:** 13  
**Sprint:** 1  
**Dependencies:** LM-001 (Database Schema & Infrastructure Setup)

---

## Story

**As a** bride-to-be visiting Light & Shutter's landing page  
**I want** to enter my email to receive a free wedding planning guide  
**So that** I can access the PDF guide while confirming my interest in email updates

---

## Business Context

This story implements the **core lead capture mechanism** for the Lead Magnet Delivery System. It's the first user-facing feature that begins the double opt-in funnel:

**User Flow:**
1. Visitor lands on Light & Shutter landing page
2. Sees lead magnet offer ("Guide de la Mariée Sereine")
3. Enters email address in signup form
4. Receives confirmation email with magic link
5. Clicks link → Story LM-003 handles confirmation and download

**Business Value:**
- PRIMARY lead generation entry point for Light & Shutter
- RGPD-compliant email consent with audit trail
- Target metrics: 40-60% email-to-signup conversion, <2s form response

**Target Users:**
- Sophie persona: 28-32 years old, planning wedding in 6-12 months
- Values: Organization, planning tools, professional photography

**Scope Boundaries:**
- ✅ Email capture form (frontend component)
- ✅ API endpoint for signup
- ✅ Send confirmation email via AWS SES
- ✅ Create subscriber + consent event + token records
- ❌ Confirmation link handling (Story LM-003)
- ❌ Download delivery (Story LM-003)
- ❌ Analytics dashboard (Story LM-004)

---

## Acceptance Criteria

### Frontend Form

- [ ] **AC2.1:** Email signup form component created:
  - File: `apps/ui-web/components/LeadMagnet/EmailSignupForm.vue`
  - Fields: Email (required, validated), checkbox "J'accepte de recevoir des conseils par email" (required)
  - Submit button: "Recevoir le guide gratuit"
  - Inline validation: Email format, required fields
  - Loading state during API call
  - Success message: "Email de confirmation envoyé! Vérifiez votre boîte de réception."
  - Error message: Display server errors (duplicate, rate limit, etc.)

- [ ] **AC2.2:** Form disables submit button during processing and shows loading spinner

- [ ] **AC2.3:** Success state clears form and displays confirmation message with next step instructions

### API Endpoint

- [ ] **AC2.4:** API endpoint created: `POST /api/lead-magnet/signup`
  - File: `apps/ui-web/server/api/lead-magnet/signup.post.ts`
  - Request body: `{ email: string, consentGiven: boolean, source?: string }`
  - Validates: Email format, consent checkbox, rate limiting
  - Returns 201 with `{ success: true, message: "..." }` on success
  - Returns 400/429 with error message on failure

### Backend Logic

- [ ] **AC2.5:** Email normalization implemented:
  - Convert to lowercase
  - Trim whitespace
  - Validate RFC 5322 format

- [ ] **AC2.6:** Database transaction creates 3 records atomically:
  1. `lm_subscribers` record (status: 'pending', email, source)
  2. `lm_consent_events` record (event_type: 'signup', consent_text, ip, user_agent)
  3. `lm_download_tokens` record (token_hash, purpose: 'confirm_and_download', expires_at: NOW() + 48h)

- [ ] **AC2.7:** Token generation follows security requirements:
  - Generate 32-byte random token using `crypto.randomBytes(32)`
  - Encode as URL-safe base64 string
  - Store SHA-256 hash in database (NEVER store plain token)
  - Include token in confirmation email URL only

- [ ] **AC2.8:** Duplicate email handling (4 scenarios):
  - **Scenario A:** Email not in database → Create new subscriber (happy path)
  - **Scenario B:** Email exists, status='pending' → Regenerate token, resend confirmation email
  - **Scenario C:** Email exists, status='confirmed' → Return 400 with "Vous êtes déjà inscrit(e)"
  - **Scenario D:** Email exists, status='unsubscribed' → Return 400 with "Cette adresse a été désinscrite. Contactez-nous pour vous réinscrire."

### Email Delivery

- [ ] **AC2.9:** Confirmation email sent via AWS SES:
  - From: `etienne.maillot@lightandshutter.fr`
  - Subject: "Confirmez votre inscription - Guide de la Mariée Sereine"
  - HTML + plain text versions (both required)
  - Confirmation link format: `{{BASE_URL}}/lead-magnet/confirm?token={{plain_token}}`
  - Personalization: Use subscriber's email in message
  - Brand styling: Light & Shutter colors and logo

- [ ] **AC2.10:** Email content includes:
  - Greeting and brand introduction
  - Clear call-to-action button "Confirmer mon inscription"
  - Explanation: "Cliquez pour confirmer votre email et télécharger le guide"
  - Fallback text link if button doesn't render
  - Footer: Unsubscribe info, privacy policy link, company address

### Error Handling

- [ ] **AC2.11:** Error scenarios handled gracefully:
  - Invalid email format → 400 "Email invalide"
  - Consent not given → 400 "Vous devez accepter de recevoir des emails"
  - Rate limiting (>3 signups from same email in 7 days) → 429 "Trop de tentatives. Réessayez plus tard."
  - AWS SES failure → 500 "Erreur d'envoi d'email. Réessayez dans quelques instants."
  - Database errors → 500 with generic message (log full error to Sentry)

### Rate Limiting

- [ ] **AC2.12:** Rate limiting enforced:
  - Max 3 signup attempts per email per 7 days
  - Counted from `lm_consent_events` table (event_type='signup', last 7 days)
  - Return 429 status code when limit exceeded
  - Error message: "Vous avez déjà demandé ce guide récemment. Vérifiez votre boîte de réception ou contactez-nous."

---

## Technical Implementation Guide

### File Structure

```
apps/ui-web/
├── components/
│   └── LeadMagnet/
│       └── EmailSignupForm.vue          # NEW - Signup form component
├── server/
│   ├── api/
│   │   └── lead-magnet/
│   │       └── signup.post.ts            # NEW - API endpoint
│   └── utils/
│       ├── lead-magnet/
│       │   ├── token.ts                  # NEW - Token generation and hashing
│       │   ├── email.ts                  # NEW - SES email sending
│       │   └── subscriber.ts             # NEW - Database operations
│       └── db.ts                         # EXISTING - PostgreSQL connection
└── .env                                   # UPDATE - Add AWS credentials
```

### Dependencies Required

Add to `apps/ui-web/package.json`:
```json
{
  "dependencies": {
    "@aws-sdk/client-ses": "^3.515.0",  // SES email sending
    "zod": "^3.22.4"                     // Request validation
  }
}
```

### Environment Variables

Add to `apps/ui-web/.env`:
```bash
# AWS Lead Magnet Configuration (from LM-001)
AWS_REGION=eu-west-3
AWS_ACCESS_KEY_ID=AKIA...                    # From IAM user
AWS_SECRET_ACCESS_KEY=***                    # From IAM user
SES_FROM_EMAIL=etienne.maillot@lightandshutter.fr
BASE_URL=https://lightandshutter.fr          # For confirmation links

# Database connection (shared with B2B system)
DATABASE_URL=postgresql://user:password@host:5432/prospectflow
```

---

## Developer Implementation Context

### 🔒 Security Requirements (CRITICAL)

1. **Token Generation:**
   ```typescript
   // CORRECT: Cryptographically secure random bytes
   import crypto from 'crypto';
   const plainToken = crypto.randomBytes(32).toString('base64url');
   
   // WRONG: Math.random() is NOT cryptographically secure
   const badToken = Math.random().toString(36); // ❌ NEVER DO THIS
   ```

2. **Token Storage:**
   ```typescript
   // CORRECT: Store SHA-256 hash only
   import crypto from 'crypto';
   const tokenHash = crypto.createHash('sha256').update(plainToken).digest('hex');
   // Store tokenHash in database
   
   // WRONG: Never store plain token
   await db.query('INSERT INTO lm_download_tokens (token) VALUES ($1)', [plainToken]); // ❌
   ```

3. **Token Logging:**
   ```typescript
   // CORRECT: Never log plain tokens
   logger.info({ tokenHash }, 'Token created');
   
   // WRONG: Logging plain token is a security breach
   logger.info({ token: plainToken }, 'Token created'); // ❌ NEVER LOG PLAIN TOKENS
   ```

### 📧 AWS SES Integration Patterns

**From Architecture:** Use AWS SDK v3 (modular imports for smaller bundle size)

```typescript
// File: apps/ui-web/server/utils/lead-magnet/email.ts
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const sesClient = new SESClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function sendConfirmationEmail(email: string, confirmationUrl: string) {
  const command = new SendEmailCommand({
    Source: process.env.SES_FROM_EMAIL,
    Destination: { ToAddresses: [email] },
    Message: {
      Subject: { Data: 'Confirmez votre inscription - Guide de la Mariée Sereine' },
      Body: {
        Html: { Data: getHtmlTemplate(confirmationUrl) },
        Text: { Data: getTextTemplate(confirmationUrl) },
      },
    },
  });
  
  return await sesClient.send(command);
}
```

### 🗄️ Database Transaction Pattern

**From Project Context:** Use parameterized queries, avoid string interpolation

```typescript
// File: apps/ui-web/server/utils/lead-magnet/subscriber.ts
import { Pool } from 'pg';

export async function createSubscriber(
  db: Pool,
  email: string,
  tokenHash: string,
  consentText: string,
  ipAddress: string,
  userAgent: string
) {
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');
    
    // Step 1: Insert subscriber
    const subscriberResult = await client.query(
      `INSERT INTO lm_subscribers (email, status, source, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id`,
      [email.toLowerCase().trim(), 'pending', 'landing_page']
    );
    const subscriberId = subscriberResult.rows[0].id;
    
    // Step 2: Insert consent event
    await client.query(
      `INSERT INTO lm_consent_events (subscriber_id, event_type, consent_text, ip, user_agent, occurred_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [subscriberId, 'signup', consentText, ipAddress, userAgent]
    );
    
    // Step 3: Insert download token
    await client.query(
      `INSERT INTO lm_download_tokens (subscriber_id, token_hash, purpose, expires_at, created_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '48 hours', NOW())`,
      [subscriberId, tokenHash, 'confirm_and_download']
    );
    
    await client.query('COMMIT');
    return subscriberId;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

### 🎨 Frontend Component Pattern

**From Architecture:** Nuxt 3 with Vue 3 Composition API, NuxtUI for form components

```vue
<!-- File: apps/ui-web/components/LeadMagnet/EmailSignupForm.vue -->
<script setup lang="ts">
const email = ref('');
const consentGiven = ref(false);
const loading = ref(false);
const success = ref(false);
const error = ref('');

async function handleSubmit() {
  loading.value = true;
  error.value = '';
  
  try {
    const response = await $fetch('/api/lead-magnet/signup', {
      method: 'POST',
      body: {
        email: email.value,
        consentGiven: consentGiven.value,
        source: 'landing_page'
      }
    });
    
    success.value = true;
    email.value = '';
    consentGiven.value = false;
  } catch (err: any) {
    error.value = err.data?.message || 'Une erreur est survenue';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="lead-magnet-form">
    <div v-if="success" class="success-message">
      <h3>Email de confirmation envoyé!</h3>
      <p>Vérifiez votre boîte de réception (et vos spams) pour confirmer votre inscription.</p>
    </div>
    
    <form v-else @submit.prevent="handleSubmit">
      <UInput 
        v-model="email"
        type="email"
        placeholder="votre.email@example.com"
        required
        :disabled="loading"
      />
      
      <UCheckbox 
        v-model="consentGiven"
        label="J'accepte de recevoir des conseils par email"
        required
        :disabled="loading"
      />
      
      <UButton 
        type="submit"
        :loading="loading"
        :disabled="!email || !consentGiven"
      >
        Recevoir le guide gratuit
      </UButton>
      
      <UAlert v-if="error" color="red">{{ error }}</UAlert>
    </form>
  </div>
</template>
```

### 🚨 Duplicate Email Logic

**Business Rules from Epic:**

```typescript
// File: apps/ui-web/server/api/lead-magnet/signup.post.ts

// Check if email already exists
const existingSubscriber = await db.query(
  'SELECT id, status FROM lm_subscribers WHERE LOWER(email) = LOWER($1)',
  [email]
);

if (existingSubscriber.rows.length > 0) {
  const subscriber = existingSubscriber.rows[0];
  
  if (subscriber.status === 'pending') {
    // SCENARIO B: Pending subscriber → Regenerate token and resend
    const newToken = generateToken();
    const newTokenHash = hashToken(newToken);
    
    await db.query(
      `INSERT INTO lm_download_tokens (subscriber_id, token_hash, purpose, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '48 hours')`,
      [subscriber.id, newTokenHash, 'confirm_and_download']
    );
    
    await sendConfirmationEmail(email, `${BASE_URL}/lead-magnet/confirm?token=${newToken}`);
    
    return { success: true, message: 'Email de confirmation renvoyé' };
  }
  
  if (subscriber.status === 'confirmed') {
    // SCENARIO C: Already confirmed
    throw createError({
      statusCode: 400,
      message: 'Vous êtes déjà inscrit(e). Vérifiez votre boîte de réception.'
    });
  }
  
  if (subscriber.status === 'unsubscribed') {
    // SCENARIO D: Unsubscribed
    throw createError({
      statusCode: 400,
      message: 'Cette adresse a été désinscrite. Contactez-nous pour vous réinscrire.'
    });
  }
}

// SCENARIO A: New email → Create subscriber (happy path)
```

### 📊 Rate Limiting Logic

```typescript
// Check signup attempts in last 7 days
const signupAttempts = await db.query(
  `SELECT COUNT(*) as count
   FROM lm_consent_events ce
   JOIN lm_subscribers s ON ce.subscriber_id = s.id
   WHERE LOWER(s.email) = LOWER($1)
     AND ce.event_type = 'signup'
     AND ce.occurred_at > NOW() - INTERVAL '7 days'`,
  [email]
);

if (parseInt(signupAttempts.rows[0].count) >= 3) {
  throw createError({
    statusCode: 429,
    message: 'Vous avez déjà demandé ce guide récemment. Vérifiez votre boîte de réception ou contactez-nous.'
  });
}
```

### 📝 Logging Standards

**From Project Context:** Use structured logging with Pino

```typescript
import { createChildLogger } from '~/server/utils/logger';

const logger = createChildLogger('LeadMagnetSignup');

// CORRECT: Context object first, message second
logger.info({ email: emailHash, subscriberId }, 'Subscriber created');
logger.error({ err: error, email: emailHash }, 'Signup failed');

// WRONG: Template strings are not parseable
logger.info(`Subscriber created: ${subscriberId}`); // ❌
```

**Security Note:** Never log full email addresses in production. Use hashed or truncated values for privacy.

---

## Email Template Requirements

### HTML Email Template

**Brand Guidelines:**
- Primary color: #2C5364 (dark teal)
- Accent color: #D4AF37 (gold)
- Font: 'Montserrat', sans-serif
- Logo: Light & Shutter logo at top
- Button: Gold background with white text, rounded corners
- Footer: Gray background, small text, links to privacy policy and unsubscribe

**Required Content:**
1. **Header:** Light & Shutter logo, centered
2. **Greeting:** "Bonjour," (or use first name if collected)
3. **Body:** 
   - "Merci de votre intérêt pour le Guide de la Mariée Sereine!"
   - "Cliquez sur le bouton ci-dessous pour confirmer votre email et télécharger le guide:"
4. **CTA Button:** "Confirmer mon inscription" (links to confirmation URL)
5. **Fallback Link:** Plain text URL below button
6. **Explanation:** "Ce lien expire dans 48 heures."
7. **Footer:** Company address, privacy policy link, unsubscribe instruction

### Plain Text Email Template

```
Bonjour,

Merci de votre intérêt pour le Guide de la Mariée Sereine!

Cliquez sur le lien ci-dessous pour confirmer votre email et télécharger le guide:

{{CONFIRMATION_URL}}

Ce lien expire dans 48 heures.

Si vous n'avez pas demandé ce guide, vous pouvez ignorer cet email.

---
Light & Shutter Photography
123 Rue Example, 75001 Paris
Politique de confidentialité: https://lightandshutter.fr/privacy
Pour vous désinscrire, répondez à cet email avec "UNSUBSCRIBE".
```

---

## Testing Requirements

### Unit Tests

Create file: `apps/ui-web/server/utils/lead-magnet/__tests__/token.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { generateToken, hashToken, verifyToken } from '../token';

describe('Token utilities', () => {
  it('generates unique tokens', () => {
    const token1 = generateToken();
    const token2 = generateToken();
    expect(token1).not.toBe(token2);
    expect(token1.length).toBeGreaterThan(40);
  });
  
  it('hashes token consistently', () => {
    const token = 'test-token-123';
    const hash1 = hashToken(token);
    const hash2 = hashToken(token);
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // SHA-256 produces 64-char hex string
  });
  
  it('verifies token against hash', () => {
    const token = generateToken();
    const hash = hashToken(token);
    expect(verifyToken(token, hash)).toBe(true);
    expect(verifyToken('wrong-token', hash)).toBe(false);
  });
});
```

### Integration Tests

Create file: `apps/ui-web/server/api/lead-magnet/__tests__/signup.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { setup, $fetch } from '@nuxt/test-utils';

describe('POST /api/lead-magnet/signup', () => {
  beforeEach(async () => {
    // Clean test database
    await db.query('DELETE FROM lm_subscribers WHERE email LIKE \'test%@example.com\'');
  });
  
  it('creates new subscriber with valid email', async () => {
    const response = await $fetch('/api/lead-magnet/signup', {
      method: 'POST',
      body: {
        email: 'test@example.com',
        consentGiven: true,
        source: 'test'
      }
    });
    
    expect(response.success).toBe(true);
    
    // Verify database records
    const subscriber = await db.query(
      'SELECT * FROM lm_subscribers WHERE email = $1',
      ['test@example.com']
    );
    expect(subscriber.rows.length).toBe(1);
    expect(subscriber.rows[0].status).toBe('pending');
  });
  
  it('returns 400 for duplicate confirmed email', async () => {
    // Create confirmed subscriber
    await db.query(
      `INSERT INTO lm_subscribers (email, status) VALUES ($1, $2)`,
      ['duplicate@example.com', 'confirmed']
    );
    
    // Attempt signup
    await expect(
      $fetch('/api/lead-magnet/signup', {
        method: 'POST',
        body: { email: 'duplicate@example.com', consentGiven: true }
      })
    ).rejects.toThrow('Vous êtes déjà inscrit(e)');
  });
  
  it('enforces rate limiting', async () => {
    const email = 'ratelimit@example.com';
    
    // Create 3 signup events in last 7 days
    const subscriberId = await createTestSubscriber(email);
    for (let i = 0; i < 3; i++) {
      await db.query(
        `INSERT INTO lm_consent_events (subscriber_id, event_type, occurred_at)
         VALUES ($1, 'signup', NOW() - INTERVAL '${i} days')`,
        [subscriberId]
      );
    }
    
    // 4th attempt should fail
    await expect(
      $fetch('/api/lead-magnet/signup', {
        method: 'POST',
        body: { email, consentGiven: true }
      })
    ).rejects.toThrow('Trop de tentatives');
  });
});
```

### Manual QA Checklist

- [ ] **Happy Path Test:**
  1. Open landing page
  2. Enter email: `test+signup@gmail.com`
  3. Check consent checkbox
  4. Click "Recevoir le guide gratuit"
  5. ✅ Success message appears
  6. ✅ Email received in inbox within 30 seconds
  7. ✅ Email contains confirmation button
  8. ✅ Database has 3 new records (subscriber, consent_event, token)

- [ ] **Duplicate Email Tests:**
  - Scenario B: Submit same email twice (pending) → Resend confirmation
  - Scenario C: Submit confirmed email → Error message "déjà inscrit"
  - Scenario D: Submit unsubscribed email → Error message "désinscrite"

- [ ] **Validation Tests:**
  - Invalid email format → Inline error message
  - Missing consent checkbox → Submit button disabled
  - Empty email → Required field error

- [ ] **Rate Limiting Test:**
  - Submit same email 3 times in quick succession → Works
  - Submit 4th time → 429 error "Trop de tentatives"

- [ ] **Email Rendering Test:**
  - Email displays correctly in Gmail web
  - Email displays correctly in Outlook
  - Plain text fallback works if HTML disabled
  - CTA button is clickable and styled correctly

- [ ] **Database Verification:**
  ```sql
  -- Check subscriber created
  SELECT * FROM lm_subscribers WHERE email = 'test+signup@gmail.com';
  -- status should be 'pending'
  
  -- Check consent event created
  SELECT * FROM lm_consent_events WHERE subscriber_id = '...';
  -- event_type should be 'signup', ip and user_agent should be populated
  
  -- Check token created
  SELECT * FROM lm_download_tokens WHERE subscriber_id = '...';
  -- expires_at should be 48 hours from now, use_count should be 0
  ```

---

## Critical Gotchas and Reminders

### 🚨 Database Transaction Atomicity
**Problem:** If email sends but database rollback happens, user never receives confirmation.  
**Solution:** Complete database transaction BEFORE sending email. If email fails, that's acceptable (user can retry signup).

### 🚨 Token Security
**Problem:** Logging plain tokens or storing in database exposes security breach.  
**Solution:** Only log token hashes. Never log full tokens, even in debug mode.

### 🚨 Email Normalization
**Problem:** `Test@Example.com` and `test@example.com` treated as different emails.  
**Solution:** Always use `LOWER(email)` in queries and store lowercase in database.

### 🚨 SES Sandbox Mode
**Problem:** If SES is still in sandbox, can only send to verified emails.  
**Solution:** Verify LM-001 completed AWS setup (SES must be in production mode).

### 🚨 CORS for API
**Problem:** Landing page on separate domain can't call API.  
**Solution:** Nuxt API routes automatically handle CORS. If separate Nuxt repo, configure `nuxt.config.ts` to allow CORS from landing page domain.

### 🚨 Token Expiration
**Problem:** User clicks link after 48 hours → Token expired error.  
**Solution:** Story LM-003 handles expired tokens. This story just sets expiration correctly.

### 🚨 SES FROM Email Restriction
**Problem:** IAM policy restricts `ses:FromAddress` to `etienne.maillot@lightandshutter.fr`.  
**Solution:** NEVER change FROM email or SES will reject with 403 error.

### 🚨 Consent Text Storage
**Problem:** RGPD audits require proof of exact consent text shown to user.  
**Solution:** Store exact checkbox label text in `lm_consent_events.consent_text` column.

### 🚨 IP Address Format
**Problem:** PostgreSQL INET type is strict about IP format.  
**Solution:** Validate IP before insert. Use Nuxt's `getRequestIP()` utility.

### 🚨 Error Messages in French
**Problem:** Business owner is French, target users are French.  
**Solution:** All user-facing error messages must be in French. English only in dev logs.

---

## Dependencies from Previous Stories

### From LM-001 (Database Schema & Infrastructure Setup)

**Database Tables (ALL REQUIRED):**
- ✅ `lm_subscribers` table exists with columns: id, email, status, source, tags, created_at, confirmed_at, unsubscribed_at, last_email_sent_at
- ✅ `lm_consent_events` table exists with columns: id, subscriber_id, event_type, consent_text, privacy_policy_version, ip, user_agent, occurred_at
- ✅ `lm_download_tokens` table exists with columns: id, subscriber_id, token_hash, purpose, expires_at, max_uses, use_count, used_at, created_at
- ✅ Foreign key constraints with ON DELETE CASCADE
- ✅ Indexes on email (LOWER(email)), status, created_at, token_hash

**AWS Infrastructure (ALL REQUIRED):**
- ✅ Amazon SES verified domain: `lightandshutter.fr`
- ✅ Amazon SES verified email: `etienne.maillot@lightandshutter.fr`
- ✅ SES moved out of sandbox (production mode)
- ✅ SPF and DKIM DNS records configured
- ✅ IAM user created: `lightandshutter-lead-magnet-service`
- ✅ IAM permissions: `ses:SendEmail`, `ses:SendRawEmail` with FROM email restriction

**Environment Variables (ALL REQUIRED):**
- ✅ `AWS_REGION=eu-west-3`
- ✅ `AWS_ACCESS_KEY_ID` (from IAM user)
- ✅ `AWS_SECRET_ACCESS_KEY` (from IAM user)
- ✅ `SES_FROM_EMAIL=etienne.maillot@lightandshutter.fr`
- ✅ `BASE_URL=https://lightandshutter.fr`
- ✅ `DATABASE_URL` (shared with B2B system)

**Verification Before Starting:**
```bash
# Check database migration
psql -d prospectflow -c "\dt lm_*"
# Should show 3 tables: lm_subscribers, lm_consent_events, lm_download_tokens

# Check AWS credentials
aws ses verify-domain-identity --domain lightandshutter.fr --region eu-west-3
# Should return "ALREADY_VERIFIED" or similar

# Check environment variables
echo $AWS_ACCESS_KEY_ID
echo $SES_FROM_EMAIL
# Should NOT be empty
```

---

## References

### Source Documents
- [Epic Definition](../planning/lead-magnet-delivery-system-epic.md#story-lm-002)
- [Architecture](../planning/lead-magnet-architecture.md)
- [Project Context](../project-context.md#logging-standards-mandatory)
- [LM-001 Story](./lm-001-database-schema-infrastructure-setup.md)

### External Documentation
- [AWS SDK v3 SES Client](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-ses/)
- [Nuxt 3 Server API Routes](https://nuxt.com/docs/guide/directory-structure/server#server-routes)
- [PostgreSQL Transaction Control](https://www.postgresql.org/docs/current/tutorial-transactions.html)
- [Node.js Crypto Module](https://nodejs.org/api/crypto.html)

### Related Stories
- **Next:** LM-003 (Download Delivery & Token Management) - Handles confirmation link click and PDF download
- **Later:** LM-004 (Analytics Dashboard & Reporting) - Displays funnel metrics

---

## Dev Agent Record

### Implementation Checklist

- [ ] Install dependencies (`@aws-sdk/client-ses`, `zod`)
- [ ] Create utility files (token.ts, email.ts, subscriber.ts)
- [ ] Create API endpoint (signup.post.ts)
- [ ] Create frontend component (EmailSignupForm.vue)
- [ ] Write unit tests (token.test.ts)
- [ ] Write integration tests (signup.test.ts)
- [ ] Manual QA testing (all scenarios)
- [ ] Database verification queries
- [ ] Email template testing (Gmail, Outlook)
- [ ] Rate limiting verification

### Agent Model Used

_To be filled by dev agent_

### Debug Log References

_To be filled by dev agent_

### Completion Notes List

_To be filled by dev agent_

### File List

_To be filled by dev agent upon completion_

---

**Story Status:** ✅ Ready for Development  
**Next Step:** Run `dev-story` agent to begin implementation  
**Estimated Time:** 2-3 days for experienced Nuxt + AWS developer  
**Complexity:** Medium-High (AWS integration, token security, transaction logic)
