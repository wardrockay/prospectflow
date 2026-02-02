# Story LM-002: Email Capture & Double Opt-in Flow - EXHAUSTIVE IMPLEMENTATION ANALYSIS

**Epic:** EPIC-LM-001 - Lead Magnet Delivery System  
**Status:** Ready for Implementation  
**Priority:** MUST (Critical Path)  
**Story Points:** 13  
**Sprint:** 1-2  
**Dependencies:** LM-001 (MUST be complete - database schema + AWS infrastructure)

**Document Created:** 2026-02-02  
**Purpose:** Complete requirements extraction for developer implementation  
**Sources:** lead-magnet-delivery-system-epic.md, LM-001-COMPLETE-CONTEXT.md, lead-magnet-architecture.md

---

## Table of Contents

1. [Story Requirements](#story-requirements)
2. [Technical Architecture Requirements](#technical-architecture-requirements)
3. [Database Schema Dependencies](#database-schema-dependencies)
4. [AWS Integration Requirements](#aws-integration-requirements)
5. [Security Requirements](#security-requirements)
6. [Code Patterns to Follow](#code-patterns-to-follow)
7. [Testing Requirements](#testing-requirements)
8. [Critical Constraints and Gotchas](#critical-constraints-and-gotchas)

---

## Story Requirements

### User Story Statement

**As a** prospective bride visiting the website  
**I want to** request the lead magnet and confirm my email address  
**So that** I receive my free guide and agree to future communications

### Business Context

This story implements the **first half** of the double opt-in flow:
1. User submits email via form on landing page
2. System captures email, generates secure token, sends confirmation email
3. User receives email with "Confirm and Download" link
4. *(Next story LM-003 handles the confirmation click and download)*

**Business Value:**
- Captures qualified leads from Light & Shutter's website
- Implements RGPD-compliant consent mechanism
- Starts nurture funnel for potential clients

**Target Metrics:**
- Email capture rate: 15-25% of landing page visitors
- Confirmation rate: 40-60% of captured emails
- Time to confirm: <2 hours median

### Priority & Scope

**Priority:** MUST - Cannot launch lead magnet without this story  
**Estimate:** 13 story points (larger story due to AWS integration complexity)  
**Sprint:** 1-2 (can span multiple sprints)  
**Dependencies:** 
- **LM-001 COMPLETE:** Database tables created, AWS SES configured, IAM credentials available
- No other dependencies

---

## Complete Acceptance Criteria

### Frontend Requirements

#### AC2.1: Lead Magnet Form Component

**Component Display Requirements:**
- ✅ Email input field (required, type="email")
- ✅ Consent checkbox with French text: "J'accepte de recevoir des emails de Light & Shutter" (required)
- ✅ Link to privacy policy: `/politique-de-confidentialite`
- ✅ Submit button with text: "Télécharger le Guide Gratuit"
- ✅ Styling matches Light & Shutter brand:
  - Font: Lato (body), Cormorant Garamond (headings)
  - Colors: #213E60 (navy), #FFCC2B (amber), #94B6EF (light blue), #F4F2EF (cream)
  - Amber submit button with navy text

**File Location:** `apps/ui-web/components/forms/LeadMagnetForm.vue`

#### AC2.2: Client-Side Validation

**Validation Rules:**
- ✅ Email format validation (HTML5 email pattern + custom regex)
- ✅ Email required (cannot be empty)
- ✅ Consent checkbox must be checked before submission
- ✅ Clear error messages in French:
  - "Email requis" (if email empty)
  - "Format d'email invalide" (if format wrong)
  - "Veuillez accepter de recevoir nos emails" (if checkbox unchecked)
- ✅ Display errors inline below each field with red text
- ✅ Disable form during submission (prevent double-submit)

#### AC2.3: Success State Handling

**On Successful Submission:**
- ✅ Show success message: "Vérifiez votre email ! Un lien de confirmation vous a été envoyé."
- ✅ Success message styled with green background, checkmark icon
- ✅ Disable form completely (prevent re-submission)
- ✅ Button text changes to "✓ Email envoyé"
- ✅ Optional: Track event in Umami analytics: `umami?.track('lead-magnet-signup')`

**Error State Handling:**
- ✅ Display API error messages in French
- ✅ Error message styled with red background
- ✅ Re-enable form for retry
- ✅ Generic fallback message: "Une erreur est survenue. Veuillez réessayer."

### Backend API Requirements

#### AC2.4: POST /api/lead-magnet/submit Endpoint

**Request Format:**
```typescript
POST /api/lead-magnet/submit
Content-Type: application/json

{
  "email": "sophie@example.com",
  "consentGiven": true,
  "source": "landing_page"  // optional
}
```

**Backend Processing:**
- ✅ Validate email format using regex
- ✅ Normalize email: `.toLowerCase().trim()`
- ✅ Extract IP address from request: `getRequestIP(event)`
- ✅ Extract user agent from headers: `getRequestHeader(event, 'user-agent')`
- ✅ Reject if `consentGiven !== true`

**Response Format (Success):**
```json
{
  "success": true,
  "message": "Email envoyé"
}
```

**Response Format (Error):**
```json
{
  "statusCode": 400,
  "message": "Email et consentement requis"
}
```

**File Location:** `apps/ui-web/server/api/lead-magnet/submit.post.ts`

#### AC2.5: Duplicate Email Handling Logic

**Critical Business Rules:**

1. **If email exists with status='confirmed':**
   - DO NOT create new subscriber
   - DO NOT send new email
   - Return success response immediately
   - Rationale: User already confirmed, avoid spam

2. **If email exists with status='pending' AND token is still valid (not expired):**
   - DO NOT create new token
   - DO NOT send new email
   - Return success response immediately
   - Rationale: Previous email still active, avoid duplicate emails within 48h window

3. **If email exists with status='pending' AND token is expired:**
   - DO NOT create new subscriber
   - GENERATE new token with fresh 48h expiry
   - SEND new confirmation email
   - Rationale: User needs a new chance to confirm

4. **If email is new (does not exist):**
   - CREATE new subscriber with status='pending'
   - GENERATE new token
   - SEND confirmation email

**Implementation Query Pattern:**
```sql
-- Check existing subscriber
SELECT id, status FROM lm_subscribers WHERE LOWER(email) = LOWER($1);

-- Check token validity
SELECT id FROM lm_download_tokens 
WHERE subscriber_id = $1 
  AND expires_at > NOW() 
  AND purpose = 'confirm_and_download'
LIMIT 1;
```

#### AC2.6: Database Operations (Atomic Transaction)

**CRITICAL: All operations MUST be in a single database transaction:**

**Step 1: Insert Subscriber Record**
```sql
INSERT INTO lm_subscribers (email, status, source, created_at)
VALUES ($1, 'pending', $2, NOW())
RETURNING id;
```

**Fields:**
- `email`: Normalized email (lowercase, trimmed)
- `status`: 'pending' (initial state)
- `source`: Optional attribution (e.g., 'landing_page', 'blog_post_A')
- `created_at`: NOW()

**Step 2: Insert Consent Event Record**
```sql
INSERT INTO lm_consent_events 
  (subscriber_id, event_type, consent_text, privacy_policy_version, ip, user_agent, occurred_at)
VALUES ($1, 'signup', $2, $3, $4, $5, NOW());
```

**Fields:**
- `subscriber_id`: UUID from Step 1
- `event_type`: 'signup'
- `consent_text`: Exact checkbox text (e.g., "J'accepte de recevoir des emails de Light & Shutter")
- `privacy_policy_version`: '2026-02-01' (current policy version)
- `ip`: Request IP address (INET type)
- `user_agent`: Browser user agent string
- `occurred_at`: NOW()

**Step 3: Generate Token**
```typescript
// Generate 32 random bytes (256 bits of entropy)
const token = crypto.randomBytes(32).toString('base64url');  // 43 chars, URL-safe

// Hash with SHA-256 (one-way hash)
const hash = crypto.createHash('sha256').update(token).digest('hex');  // 64 hex chars

// Calculate expiration: 48 hours from now
const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
```

**Step 4: Insert Download Token Record**
```sql
INSERT INTO lm_download_tokens 
  (subscriber_id, token_hash, purpose, expires_at, max_uses, created_at)
VALUES ($1, $2, 'confirm_and_download', $3, 999, NOW());
```

**Fields:**
- `subscriber_id`: UUID from Step 1
- `token_hash`: SHA-256 hash (NOT the plain token)
- `purpose`: 'confirm_and_download'
- `expires_at`: NOW() + 48 hours
- `max_uses`: 999 (effectively unlimited within 48h window)
- `created_at`: NOW()

**Transaction Handling:**
```typescript
try {
  await db.query('BEGIN');
  // ... all 4 steps above
  await db.query('COMMIT');
} catch (error) {
  await db.query('ROLLBACK');
  throw error;
}
```

#### AC2.7: Send Confirmation Email via Amazon SES

**Email Parameters:**
- **To:** Subscriber email
- **From:** `etienne.maillot@lightandshutter.fr`
- **From Name:** "Etienne Maillot - Light & Shutter"
- **Subject:** "Confirmez votre téléchargement - Guide Mariée Sereine"
- **Body:** HTML template + plain text fallback

**Confirmation Link Format:**
```
https://lightandshutter.fr/api/lead-magnet/confirm/{TOKEN}
```
- `{TOKEN}` is the **plain token** (not the hash)
- This URL is handled by Story LM-003

**HTML Email Template Requirements:**
- Responsive design (mobile-friendly)
- Brand colors and fonts
- Prominent CTA button (amber background, navy text)
- Text states: "Confirmez votre adresse email et accédez immédiatement à votre guide gratuit"
- Expiration notice: "Ce lien est valide pendant 48 heures"
- Footer: Light & Shutter branding, link to website

**Plain Text Fallback:**
```
Confirmez votre téléchargement

Cliquez sur ce lien: https://lightandshutter.fr/api/lead-magnet/confirm/{TOKEN}

Ce lien expire dans 48h.
```

**SES Integration:**
- Use AWS SDK v3: `@aws-sdk/client-ses`
- Use `SendEmailCommand` (not raw email)
- Set charset: UTF-8
- Handle errors gracefully (see AC2.10)

#### AC2.8: API Success Response

**Return Format:**
```json
{
  "success": true,
  "message": "Email envoyé"
}
```

**HTTP Status Code:** 200 OK

### Error Handling Requirements

#### AC2.9: Rate Limiting

**Rate Limit Rules:**
- **Per Email:** Maximum 3 token generation requests per 7 days
- **Implementation:**
  ```sql
  -- Count recent token requests for this email
  SELECT COUNT(*) as request_count
  FROM lm_download_tokens dt
  JOIN lm_subscribers s ON s.id = dt.subscriber_id
  WHERE LOWER(s.email) = LOWER($1)
    AND dt.created_at > NOW() - INTERVAL '7 days';
  ```
- **If Limit Exceeded:**
  - Return error: `{ statusCode: 429, message: "Trop de demandes. Veuillez réessayer plus tard." }`
  - HTTP Status: 429 Too Many Requests

**Optional (Future Story LM-006):**
- **Per IP:** Maximum 10 submissions per hour
- Use `lm_consent_events.ip` to count

#### AC2.10: SES Failure Handling

**Email Sending Errors:**
- **Catch SES errors gracefully**
- **Log error details to console/Sentry**
- **Return generic error to user:** "Une erreur est survenue lors de l'envoi de l'email"
- **Notify admin** (future enhancement: send alert to Slack/email)

**Example Error Handling:**
```typescript
try {
  await sesClient.send(new SendEmailCommand(params));
} catch (error) {
  console.error('SES email sending failed:', error);
  // Future: Send admin notification
  throw createError({ 
    statusCode: 500, 
    message: 'Une erreur est survenue lors de l\'envoi de l\'email' 
  });
}
```

**Common SES Errors:**
- `MessageRejected`: Email address invalid or blocked
- `MailFromDomainNotVerified`: SES not properly configured
- `Throttling`: Sending rate limit exceeded
- `AccountSendingPausedException`: SES account suspended

#### AC2.11: Database Failure Handling

**Transaction Rollback:**
- **Use database transactions** for atomicity
- **Rollback on any error** in the 4-step process
- **Prevent partial data** (e.g., subscriber created but no consent event)

**Example:**
```typescript
try {
  await db.query('BEGIN');
  // Step 1: Insert subscriber
  // Step 2: Insert consent event
  // Step 3: Generate token
  // Step 4: Insert token
  await db.query('COMMIT');
} catch (error) {
  await db.query('ROLLBACK');
  console.error('Database transaction failed:', error);
  throw createError({ 
    statusCode: 500, 
    message: 'Une erreur est survenue. Veuillez réessayer.' 
  });
}
```

#### AC2.12: User-Friendly Error Messages

**All error messages MUST be in French:**
- "Email et consentement requis" (400)
- "Format d'email invalide" (400)
- "Trop de demandes. Veuillez réessayer plus tard." (429)
- "Une erreur est survenue. Veuillez réessayer." (500)

**Never expose internal errors to users:**
- ❌ "PostgreSQL connection failed"
- ❌ "AWS AccessDenied exception"
- ✅ "Une erreur est survenue. Veuillez réessayer."

---

## Technical Architecture Requirements

### Nuxt 3 Server API Patterns

**ProspectFlow uses Nuxt 3 with server-side API routes.**

**Route Naming Convention:**
- POST endpoints: `*.post.ts`
- GET endpoints: `*.get.ts`
- Dynamic routes: `[param].ts`

**File Structure:**
```
apps/ui-web/server/
├── api/
│   └── lead-magnet/
│       ├── submit.post.ts          # This story (LM-002)
│       └── confirm/
│           └── [token].get.ts      # Next story (LM-003)
└── utils/
    ├── token.ts                     # Token generation/hashing
    ├── email.ts                     # SES email sending
    └── s3.ts                        # S3 signed URLs (LM-003)
```

**Nuxt Event Handler Pattern:**
```typescript
export default defineEventHandler(async (event) => {
  // Read request body
  const body = await readBody(event);
  
  // Get request metadata
  const ip = getRequestIP(event);
  const userAgent = getRequestHeader(event, 'user-agent');
  
  // Business logic here
  
  // Return response
  return { success: true, data: ... };
});
```

**Error Handling Pattern:**
```typescript
// Throw HTTP errors
throw createError({ 
  statusCode: 400, 
  message: 'Email et consentement requis' 
});

// Nuxt automatically converts to proper HTTP response
```

### Database Interaction Patterns

**Database Connection:**
ProspectFlow likely uses `pg` (node-postgres) or Prisma. Check existing code in `apps/ui-web/server/api/` for the pattern.

**Expected Pattern (based on epic examples):**
```typescript
// Likely a utility function or composable
const db = useDatabase();  // or import { pool } from '~/server/utils/db'

// Parameterized queries (ALWAYS use $1, $2 placeholders - prevents SQL injection)
const result = await db.query(
  'SELECT id, status FROM lm_subscribers WHERE LOWER(email) = $1',
  [normalizedEmail]
);

// Access results
if (result.rows.length > 0) {
  const subscriber = result.rows[0];
}
```

**Transaction Pattern:**
```typescript
await db.query('BEGIN');
try {
  await db.query('INSERT INTO lm_subscribers ...', [params]);
  await db.query('INSERT INTO lm_consent_events ...', [params]);
  await db.query('INSERT INTO lm_download_tokens ...', [params]);
  await db.query('COMMIT');
} catch (error) {
  await db.query('ROLLBACK');
  throw error;
}
```

### AWS SDK Usage and Configuration

**AWS SDK v3 Requirements:**

**Package Installation:**
```bash
pnpm add @aws-sdk/client-ses @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

**SES Client Initialization:**
```typescript
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const sesClient = new SESClient({ 
  region: process.env.AWS_REGION || 'eu-west-3',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});
```

**Send Email Pattern:**
```typescript
const params = {
  Source: process.env.SES_FROM_EMAIL!,  // etienne.maillot@lightandshutter.fr
  Destination: { 
    ToAddresses: [subscriberEmail] 
  },
  Message: {
    Subject: { 
      Data: 'Confirmez votre téléchargement - Guide Mariée Sereine',
      Charset: 'UTF-8'
    },
    Body: {
      Html: { 
        Data: htmlBody, 
        Charset: 'UTF-8' 
      },
      Text: { 
        Data: textBody, 
        Charset: 'UTF-8' 
      }
    }
  }
};

const result = await sesClient.send(new SendEmailCommand(params));
// result.MessageId contains SES message ID (useful for tracking)
```

**Environment Variables Used:**
- `AWS_REGION`: 'eu-west-3'
- `AWS_ACCESS_KEY_ID`: IAM access key
- `AWS_SECRET_ACCESS_KEY`: IAM secret key
- `SES_FROM_EMAIL`: 'etienne.maillot@lightandshutter.fr'
- `BASE_URL`: 'https://lightandshutter.fr' (for building confirmation URLs)

### Error Handling Patterns

**HTTP Error Pattern:**
```typescript
// 400 Bad Request
throw createError({ 
  statusCode: 400, 
  message: 'Email et consentement requis' 
});

// 429 Too Many Requests
throw createError({ 
  statusCode: 429, 
  message: 'Trop de demandes. Veuillez réessayer plus tard.' 
});

// 500 Internal Server Error
throw createError({ 
  statusCode: 500, 
  message: 'Une erreur est survenue. Veuillez réessayer.' 
});
```

**Logging Pattern:**
```typescript
try {
  // Business logic
} catch (error) {
  console.error('Lead magnet submission error:', error);
  // Future: Send to Sentry
  throw createError({ statusCode: 500, message: 'User-friendly message' });
}
```

### Email Sending Patterns via SES

**Complete Email Utility Function:**

**File:** `apps/ui-web/server/utils/email.ts`

```typescript
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const sesClient = new SESClient({ 
  region: process.env.AWS_REGION || 'eu-west-3',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

/**
 * Sends confirmation email to new subscriber
 * @param toEmail - Subscriber's email address
 * @param token - Plain token (NOT hash) for confirmation URL
 * @param subscriberName - Optional name for personalization
 * @throws Error if SES sending fails
 */
export async function sendConfirmationEmail(
  toEmail: string,
  token: string,
  subscriberName?: string
): Promise<void> {
  const confirmUrl = `${process.env.BASE_URL}/api/lead-magnet/confirm/${token}`;
  
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Confirmez votre téléchargement</title>
    </head>
    <body style="font-family: Lato, sans-serif; color: #213E60; background: #F4F2EF; padding: 20px; margin: 0;">
      <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <h1 style="color: #213E60; font-family: 'Cormorant Garamond', serif; font-size: 28px; margin-bottom: 20px;">
          Confirmez votre téléchargement
        </h1>
        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
          Bonjour${subscriberName ? ' ' + subscriberName : ''},
        </p>
        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
          Merci de votre intérêt pour le <strong>Guide de la Mariée Sereine</strong> !
        </p>
        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
          Cliquez sur le bouton ci-dessous pour confirmer votre adresse email 
          et accéder immédiatement à votre guide gratuit :
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${confirmUrl}" 
             style="background: #FFCC2B; color: #213E60; padding: 15px 30px; 
                    text-decoration: none; border-radius: 5px; font-weight: bold;
                    font-size: 18px; display: inline-block;">
            Confirmer et Télécharger
          </a>
        </div>
        <p style="color: #666; font-size: 14px; line-height: 1.6; margin-top: 30px;">
          Ce lien est valide pendant <strong>48 heures</strong>. 
          Vous pourrez télécharger le guide plusieurs fois durant cette période.
        </p>
        <hr style="border: none; border-top: 1px solid #E0E0E0; margin: 30px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">
          Light & Shutter Photography<br>
          <a href="https://lightandshutter.fr" style="color: #94B6EF;">lightandshutter.fr</a>
        </p>
      </div>
    </body>
    </html>
  `;

  const textBody = `
Confirmez votre téléchargement

Bonjour${subscriberName ? ' ' + subscriberName : ''},

Merci de votre intérêt pour le Guide de la Mariée Sereine !

Cliquez sur ce lien pour confirmer votre adresse email et accéder immédiatement à votre guide gratuit :

${confirmUrl}

Ce lien est valide pendant 48 heures. Vous pourrez télécharger le guide plusieurs fois durant cette période.

---
Light & Shutter Photography
https://lightandshutter.fr
  `.trim();

  const params = {
    Source: process.env.SES_FROM_EMAIL!,
    Destination: { ToAddresses: [toEmail] },
    Message: {
      Subject: { 
        Data: 'Confirmez votre téléchargement - Guide Mariée Sereine',
        Charset: 'UTF-8'
      },
      Body: {
        Html: { Data: htmlBody, Charset: 'UTF-8' },
        Text: { Data: textBody, Charset: 'UTF-8' }
      }
    }
  };

  await sesClient.send(new SendEmailCommand(params));
}
```

---

## Database Schema Dependencies

### What LM-001 Created That LM-002 Uses

**Story LM-002 REQUIRES these tables from LM-001:**

#### Table 1: lm_subscribers

**Purpose:** Store email and subscriber state

**Columns Used by LM-002:**
- `id` (UUID, PK) - Generated automatically, referenced by foreign keys
- `email` (TEXT, NOT NULL) - Subscriber email (stored lowercase, trimmed)
- `status` (TEXT, NOT NULL) - Must be 'pending' for new subscribers
- `source` (TEXT, nullable) - Optional attribution (e.g., 'landing_page')
- `tags` (JSONB, nullable) - Not used in LM-002, reserved for future
- `created_at` (TIMESTAMPTZ, NOT NULL) - Set to NOW() on insert

**Constraints Used:**
- CHECK: `status IN ('pending', 'confirmed', 'unsubscribed', 'bounced')`
- UNIQUE INDEX: `idx_lm_subscribers_email_lower ON LOWER(email)`

**LM-002 Operations:**
```sql
-- Check for existing subscriber
SELECT id, status FROM lm_subscribers WHERE LOWER(email) = $1;

-- Insert new subscriber
INSERT INTO lm_subscribers (email, status, source, created_at)
VALUES ($1, 'pending', $2, NOW())
RETURNING id;
```

#### Table 2: lm_consent_events

**Purpose:** RGPD audit trail (immutable log)

**Columns Used by LM-002:**
- `id` (UUID, PK) - Generated automatically
- `subscriber_id` (UUID, FK) - Links to lm_subscribers.id
- `event_type` (TEXT, NOT NULL) - Must be 'signup' for LM-002
- `consent_text` (TEXT, nullable) - Exact checkbox text shown to user
- `privacy_policy_version` (TEXT, nullable) - e.g., '2026-02-01'
- `ip` (INET, nullable) - User's IP address
- `user_agent` (TEXT, nullable) - Browser user agent
- `occurred_at` (TIMESTAMPTZ, NOT NULL) - Set to NOW() on insert

**Foreign Key:**
- `subscriber_id REFERENCES lm_subscribers(id) ON DELETE CASCADE`

**LM-002 Operations:**
```sql
INSERT INTO lm_consent_events 
  (subscriber_id, event_type, consent_text, privacy_policy_version, ip, user_agent, occurred_at)
VALUES ($1, 'signup', $2, $3, $4, $5, NOW());
```

#### Table 3: lm_download_tokens

**Purpose:** Token-based access control

**Columns Used by LM-002:**
- `id` (UUID, PK) - Generated automatically
- `subscriber_id` (UUID, FK) - Links to lm_subscribers.id
- `token_hash` (TEXT, NOT NULL, UNIQUE) - SHA-256 hash of token
- `purpose` (TEXT, NOT NULL) - Must be 'confirm_and_download' for LM-002
- `expires_at` (TIMESTAMPTZ, NOT NULL) - NOW() + 48 hours
- `max_uses` (INT, NOT NULL, DEFAULT 999) - Set to 999 for reusability
- `use_count` (INT, NOT NULL, DEFAULT 0) - Not modified in LM-002
- `used_at` (TIMESTAMPTZ, nullable) - Not modified in LM-002
- `created_at` (TIMESTAMPTZ, NOT NULL) - Set to NOW() on insert

**Foreign Key:**
- `subscriber_id REFERENCES lm_subscribers(id) ON DELETE CASCADE`

**Constraints:**
- CHECK: `purpose IN ('confirm_and_download', 'download_only')`
- UNIQUE INDEX: `lm_download_tokens_token_hash_key`

**LM-002 Operations:**
```sql
-- Check for unexpired token
SELECT id FROM lm_download_tokens 
WHERE subscriber_id = $1 
  AND expires_at > NOW() 
  AND purpose = 'confirm_and_download'
LIMIT 1;

-- Insert new token
INSERT INTO lm_download_tokens 
  (subscriber_id, token_hash, purpose, expires_at, max_uses, created_at)
VALUES ($1, $2, 'confirm_and_download', $3, 999, NOW());
```

### Database Query Patterns from Epic

**Pattern 1: Case-Insensitive Email Lookup**
```sql
-- Use LOWER() to leverage index
SELECT id, status FROM lm_subscribers WHERE LOWER(email) = LOWER($1);

-- This uses idx_lm_subscribers_email_lower index
```

**Pattern 2: Token Expiration Check**
```sql
-- Check if token is still valid
SELECT id FROM lm_download_tokens 
WHERE subscriber_id = $1 
  AND expires_at > NOW() 
  AND purpose = 'confirm_and_download'
LIMIT 1;

-- This uses idx_lm_download_tokens_expires partial index
```

**Pattern 3: RETURNING Clause**
```sql
-- Get generated ID from INSERT
INSERT INTO lm_subscribers (email, status, source, created_at)
VALUES ($1, 'pending', $2, NOW())
RETURNING id;

-- Result: { rows: [{ id: '123e4567-e89b-12d3-a456-426614174000' }] }
```

---

## AWS Integration Requirements

### SES Configuration (from LM-001)

**Prerequisites from LM-001:**
- ✅ Domain verified: `lightandshutter.fr`
- ✅ From email verified: `etienne.maillot@lightandshutter.fr`
- ✅ **SES moved out of sandbox** (production mode - can send to ANY email address)
- ✅ SPF DNS record: `v=spf1 include:amazonses.com ~all`
- ✅ DKIM DNS records: 3 CNAME records from SES verification
- ✅ IAM user created: `lightandshutter-lead-magnet-service`
- ✅ IAM permissions: `ses:SendEmail` and `ses:SendRawEmail`

**SES Region:** `eu-west-3` (Paris, France)

**Sending Limits (Initial):**
- 200 emails/day
- 1 email/second
- *Can request increase via AWS Support*

### IAM Policy for SES

**From LM-001 Documentation:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "SESEmailSending",
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "ses:FromAddress": "etienne.maillot@lightandshutter.fr"
        }
      }
    }
  ]
}
```

**Key Points:**
- IAM policy **restricts** FROM address to `etienne.maillot@lightandshutter.fr`
- Cannot send from any other email address
- Prevents abuse if credentials compromised

### Environment Variables (from LM-001)

**Required Variables:**
```bash
# AWS Configuration
AWS_REGION=eu-west-3
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=***

# SES Configuration
SES_FROM_EMAIL=etienne.maillot@lightandshutter.fr

# Application
BASE_URL=https://lightandshutter.fr

# Database (shared with B2B system)
DATABASE_URL=postgresql://user:password@host:5432/prospectflow
```

**Location:** `apps/ui-web/.env` (not committed to git)  
**Documentation:** `apps/ui-web/.env.example` (committed)

**Environment-Specific Values:**
- **Development:** `BASE_URL=http://localhost:3000`
- **Staging:** `BASE_URL=https://staging.lightandshutter.fr`
- **Production:** `BASE_URL=https://lightandshutter.fr`

### Email Content Requirements

**Subject Line:**
- French language
- Clear action: "Confirmez votre téléchargement"
- Brand name: "Guide Mariée Sereine"
- Full subject: "Confirmez votre téléchargement - Guide Mariée Sereine"

**Email Body Requirements:**
1. **Personalization:** Optional name field (not implemented in LM-002, reserved for future)
2. **Clear CTA:** "Confirmer et Télécharger" button in amber (#FFCC2B)
3. **Expiration Notice:** "Ce lien est valide pendant 48 heures"
4. **Re-download Info:** "Vous pourrez télécharger le guide plusieurs fois durant cette période"
5. **Branding:** Light & Shutter logo/name, website link
6. **Mobile-Responsive:** Scales to mobile screens

**Testing Across Email Clients:**
- Gmail (web + mobile)
- Outlook (web + desktop)
- Apple Mail (macOS + iOS)
- Yahoo Mail
- Protonmail

---

## Security Requirements

### Token Generation and Validation Logic

#### Token Generation (Cryptographically Secure)

**Algorithm:** `crypto.randomBytes(32)` - Node.js built-in
- **Entropy:** 256 bits (32 bytes × 8 bits/byte)
- **Output:** Base64url encoding (43 characters, URL-safe)
- **Format:** No `+`, `/`, `=` characters (safe for URLs without encoding)

**Example Output:** `Xk7_TnPq2vB8fY4jD9eR1sW6mL3hN0pA5uK8iQ4tC7o`

**Implementation:**
```typescript
import crypto from 'crypto';

function generateToken(): { token: string; hash: string } {
  // Generate 32 random bytes (256 bits of entropy)
  const token = crypto.randomBytes(32).toString('base64url');
  
  // Hash token with SHA-256
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  
  return { token, hash };
}
```

**Why 32 bytes?**
- 2^256 possible values = 1.16 × 10^77 combinations
- **Brute force infeasible:** Even at 1 trillion attempts/second, would take 3.67 × 10^60 years
- **Collision probability:** Negligible (SHA-256 collision resistance)

#### SHA-256 Hashing (One-Way Function)

**Purpose:** Store token securely (like password hashing)

**Algorithm:** SHA-256 (Secure Hash Algorithm 256-bit)
- **Input:** Plain token (43 characters)
- **Output:** 64 hexadecimal characters (256 bits)
- **Properties:**
  - **One-way:** Cannot reverse hash to get original token
  - **Deterministic:** Same input always produces same hash
  - **Collision-resistant:** Computationally infeasible to find two inputs with same hash

**Example:**
```
Plain token:  Xk7_TnPq2vB8fY4jD9eR1sW6mL3hN0pA5uK8iQ4tC7o
SHA-256 hash: 5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8
```

**Why Hash Tokens?**
- **Database breach protection:** If database compromised, attackers get hashes (useless)
- **Same as password security:** Never store plaintext secrets
- **RGPD compliance:** Minimizes risk if personal data leaked

**Implementation:**
```typescript
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
```

#### Token Expiration (Time-Limited Access)

**Expiration Window:** 48 hours from creation

**Rationale:**
- **Long enough:** User has time to check email, even if busy
- **Short enough:** Limits window for unauthorized access if token leaked
- **User-friendly:** Allows re-downloads within reasonable timeframe

**Implementation:**
```typescript
// Calculate expiration: NOW() + 48 hours
const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

// Store in database
INSERT INTO lm_download_tokens (expires_at, ...)
VALUES ($1, ...);
```

**Validation Pattern (Story LM-003):**
```sql
SELECT * FROM lm_download_tokens 
WHERE token_hash = $1 
  AND expires_at > NOW()  -- Check if token not expired
  AND use_count < max_uses;
```

#### Security Best Practices

**DO:**
- ✅ Generate tokens with `crypto.randomBytes()` (cryptographically secure)
- ✅ Store SHA-256 hash in database, never plain token
- ✅ Use HTTPS for all token URLs (prevent token interception)
- ✅ Set short expiration window (48 hours)
- ✅ Never log plain tokens (only log hashes or IDs)

**DON'T:**
- ❌ Use `Math.random()` for tokens (predictable, not secure)
- ❌ Store plain tokens in database
- ❌ Use HTTP for token URLs (allows eavesdropping)
- ❌ Set long expiration (weeks/months)
- ❌ Log plain tokens in console/files

### RGPD Compliance Requirements

#### Consent Capture Requirements

**Legal Basis:** GDPR Article 6(1)(a) - Consent

**Valid Consent Requirements:**
1. **Freely Given:** No coercion, penalties, or false choices
2. **Specific:** Purpose clearly stated ("recevoir des emails")
3. **Informed:** User knows what they're agreeing to
4. **Unambiguous:** Clear affirmative action (checkbox must be actively checked)
5. **Withdrawable:** Easy unsubscribe process (future implementation)

**Implementation:**
- ✅ Checkbox text: "J'accepte de recevoir des emails de Light & Shutter"
- ✅ Checkbox **not pre-checked** (must be actively checked by user)
- ✅ Link to privacy policy visible on form
- ✅ Reject submission if `consentGiven !== true`
- ✅ Store exact consent text in `lm_consent_events.consent_text`
- ✅ Store privacy policy version: '2026-02-01'

#### Data Collection Justification

**Personal Data Collected:**
1. **Email address** - Required for lead magnet delivery and marketing
2. **IP address** - RGPD audit requirement + fraud detection
3. **User agent** - Browser/device info for analytics and fraud detection
4. **Consent timestamp** - Legal requirement (proof of when consent given)

**Legal Basis for Each:**
- **Email:** Consent + Contract performance (deliver lead magnet)
- **IP/User Agent:** Legitimate interest (fraud prevention, consent verification)
- **Timestamps:** Legal obligation (RGPD compliance)

#### Right to be Forgotten Implementation

**Database Design:**
- ✅ Foreign keys with `ON DELETE CASCADE`
- ✅ Single DELETE operation removes all related data

**Implementation:**
```sql
-- Delete subscriber and ALL related data
DELETE FROM lm_subscribers WHERE email = 'user@example.com';

-- Automatically cascades to:
-- - lm_consent_events (all signup/confirm/unsubscribe events)
-- - lm_download_tokens (all tokens)
```

**Result:** Complete erasure of personal data (RGPD Article 17 compliance)

#### Audit Trail Requirements

**Immutable Log:**
- ✅ `lm_consent_events` table is **append-only**
- ✅ **Never UPDATE or DELETE** individual events
- ✅ Only deleted via CASCADE when subscriber deleted

**What to Log:**
- ✅ Event type: 'signup', 'confirm', 'unsubscribe'
- ✅ Exact consent text shown to user
- ✅ Privacy policy version at time of consent
- ✅ IP address of request
- ✅ User agent (browser/device)
- ✅ Timestamp (occurred_at)

**Purpose:**
- Legal proof of consent for regulatory audits
- Demonstrates compliance with RGPD requirements
- Track user consent lifecycle

---

## Code Patterns to Follow

### From Existing Codebase (ui-web)

Based on grep search results, ProspectFlow uses these patterns:

**1. Event Handler Pattern:**
```typescript
export default defineEventHandler(async (event) => {
  // Handler logic
});
```

**2. Read Request Body:**
```typescript
const body = await readBody(event);
// Or with error handling:
const body = await readBody(event).catch(() => ({}));
```

**3. Route Parameters:**
```typescript
// For routes like [id].ts
const id = getRouterParam(event, 'id');
```

### From LM-001 Implementation

**File Structure Pattern:**
```
apps/ui-web/server/
├── api/
│   └── lead-magnet/
│       └── submit.post.ts          # Create this file
└── utils/
    ├── token.ts                     # Create this file
    └── email.ts                     # Create this file
```

**Migration Pattern:**
- Location: `infra/postgres/db/migrations/`
- Naming: `V{YYYYMMDD}_{HHMMSS}___{description}.sql`
- Example: `V20260202_140000___lead_magnet_schema.sql`

### Token Utility Pattern

**File:** `apps/ui-web/server/utils/token.ts`

```typescript
import crypto from 'crypto';

/**
 * Generates a cryptographically secure token and its SHA-256 hash
 * @returns Object with plain token (for URL) and hash (for database)
 */
export function generateToken(): { token: string; hash: string } {
  // Generate 32 random bytes (256 bits of entropy)
  const token = crypto.randomBytes(32).toString('base64url');
  
  // Hash token with SHA-256 (one-way hash)
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  
  return { token, hash };
}

/**
 * Hashes a token with SHA-256 for validation
 * @param token - Plain token from URL
 * @returns SHA-256 hash (64 hex characters)
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
```

**Usage:**
```typescript
// Generate new token
const { token, hash } = generateToken();
// token: "Xk7_TnPq..." (send in email)
// hash: "5e884898..." (store in database)

// Validate token
const providedToken = 'Xk7_TnPq...';  // From URL
const providedHash = hashToken(providedToken);
// Query database WHERE token_hash = providedHash
```

### Email Utility Pattern

See [Email Sending Patterns via SES](#email-sending-patterns-via-ses) section above for complete implementation.

### Frontend Component Pattern (Vue 3 Composition API)

**File:** `apps/ui-web/components/forms/LeadMagnetForm.vue`

```vue
<template>
  <form @submit.prevent="handleSubmit" class="lead-magnet-form">
    <!-- Form fields -->
  </form>
</template>

<script setup lang="ts">
// Use Composition API
const formData = ref({
  email: '',
  consentGiven: false
});

const isSubmitting = ref(false);
const isSuccess = ref(false);
const errorMessage = ref('');

async function handleSubmit() {
  isSubmitting.value = true;
  try {
    const response = await $fetch('/api/lead-magnet/submit', {
      method: 'POST',
      body: formData.value
    });
    isSuccess.value = true;
  } catch (error: any) {
    errorMessage.value = error.data?.message || 'Erreur inconnue';
  } finally {
    isSubmitting.value = false;
  }
}
</script>
```

---

## Testing Requirements

### Unit Tests

**Test File:** `apps/ui-web/server/utils/token.test.ts`

**Tests to Write:**
1. ✅ `generateToken()` returns 43-character URL-safe token
2. ✅ `generateToken()` returns 64-character hex hash
3. ✅ `generateToken()` produces unique tokens on each call
4. ✅ `hashToken()` produces same hash for same input
5. ✅ `hashToken()` produces different hash for different input
6. ✅ Token is base64url (no `+`, `/`, `=` characters)

**Example:**
```typescript
import { describe, it, expect } from 'vitest';
import { generateToken, hashToken } from './token';

describe('Token Generation', () => {
  it('generates URL-safe token with 43 characters', () => {
    const { token } = generateToken();
    expect(token).toHaveLength(43);
    expect(token).not.toMatch(/[+/=]/);  // No non-URL-safe chars
  });

  it('generates SHA-256 hash with 64 hex characters', () => {
    const { hash } = generateToken();
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);  // Hex only
  });

  it('produces unique tokens on each call', () => {
    const token1 = generateToken();
    const token2 = generateToken();
    expect(token1.token).not.toBe(token2.token);
    expect(token1.hash).not.toBe(token2.hash);
  });

  it('hashes same token to same hash', () => {
    const testToken = 'test-token-123';
    const hash1 = hashToken(testToken);
    const hash2 = hashToken(testToken);
    expect(hash1).toBe(hash2);
  });
});
```

### Integration Tests

**Test File:** `apps/ui-web/tests/api/lead-magnet/submit.test.ts`

**Tests to Write:**
1. ✅ POST /api/lead-magnet/submit with valid data succeeds
2. ✅ Creates subscriber with status='pending'
3. ✅ Creates consent_event with event_type='signup'
4. ✅ Creates download_token with 48h expiration
5. ✅ Duplicate email with confirmed status returns success (no new email)
6. ✅ Duplicate email with pending status + valid token returns success
7. ✅ Duplicate email with pending status + expired token generates new token
8. ✅ Missing email returns 400 error
9. ✅ Missing consentGiven returns 400 error
10. ✅ Invalid email format returns 400 error
11. ✅ Rate limiting: 4th request within 7 days returns 429 error

**Example:**
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setup, $fetch } from '@nuxt/test-utils';

describe('POST /api/lead-magnet/submit', async () => {
  await setup({
    // Test setup
  });

  afterEach(async () => {
    // Clean up test data from database
    await db.query('DELETE FROM lm_subscribers WHERE email LIKE \'test%@example.com\'');
  });

  it('creates subscriber with valid data', async () => {
    const response = await $fetch('/api/lead-magnet/submit', {
      method: 'POST',
      body: {
        email: 'test@example.com',
        consentGiven: true,
        source: 'test_suite'
      }
    });

    expect(response).toMatchObject({ success: true });

    // Verify database records
    const subscriber = await db.query(
      'SELECT * FROM lm_subscribers WHERE email = $1',
      ['test@example.com']
    );
    expect(subscriber.rows).toHaveLength(1);
    expect(subscriber.rows[0].status).toBe('pending');
  });

  it('rejects submission without consent', async () => {
    await expect(
      $fetch('/api/lead-magnet/submit', {
        method: 'POST',
        body: {
          email: 'test@example.com',
          consentGiven: false
        }
      })
    ).rejects.toThrow('Email et consentement requis');
  });
});
```

### Manual QA Checklist

**Frontend Testing:**
- [ ] Form displays correctly on desktop (Chrome, Firefox, Safari)
- [ ] Form displays correctly on mobile (iOS Safari, Chrome Android)
- [ ] Email validation works (rejects invalid formats)
- [ ] Consent checkbox validation works (must be checked)
- [ ] Submit button disables during submission
- [ ] Success message displays after submission
- [ ] Error messages display in French
- [ ] Form prevents double submission

**Backend Testing:**
- [ ] API endpoint accepts valid requests
- [ ] API endpoint rejects invalid requests
- [ ] Database transaction creates all 3 records atomically
- [ ] Duplicate email handling works correctly
- [ ] Token generated is URL-safe (no special characters)
- [ ] Token hash is 64 hex characters
- [ ] Expiration calculated correctly (48 hours)

**Email Testing:**
- [ ] Confirmation email received within 60 seconds
- [ ] Email subject correct in French
- [ ] Email body displays correctly in Gmail
- [ ] Email body displays correctly in Outlook
- [ ] Email body displays correctly in Apple Mail
- [ ] Email body displays correctly on mobile
- [ ] CTA button is prominent and clickable
- [ ] Confirmation link format correct
- [ ] Plain text fallback readable

**End-to-End Testing:**
- [ ] Submit form → Email received → Database records created
- [ ] Submit duplicate email → No new email sent
- [ ] Submit after token expiry → New email sent
- [ ] Submit 4th time in 7 days → Rate limit error

---

## Critical Constraints and Gotchas

### 🚨 CRITICAL: Database Transaction Atomicity

**Problem:** If any step fails (subscriber insert, consent event, token insert, email send), you might have partial data.

**Solution: Use Database Transactions**
```typescript
await db.query('BEGIN');
try {
  // Step 1: Insert subscriber
  // Step 2: Insert consent event
  // Step 3: Insert token
  await db.query('COMMIT');
  
  // Step 4: Send email (AFTER transaction committed)
  await sendConfirmationEmail(...);
} catch (error) {
  await db.query('ROLLBACK');
  throw error;
}
```

**Why Email Send is Outside Transaction:**
- If email fails, we still have subscriber record
- User can request new token later
- Prevents database locks during slow SES API call

### 🚨 CRITICAL: Token Security

**Never Store Plain Tokens:**
```typescript
// ❌ WRONG
INSERT INTO lm_download_tokens (token) VALUES ('Xk7_TnPq...');

// ✅ CORRECT
const { token, hash } = generateToken();
INSERT INTO lm_download_tokens (token_hash) VALUES (hash);
// Send `token` in email, store `hash` in database
```

**Never Log Plain Tokens:**
```typescript
// ❌ WRONG
console.log('Generated token:', token);

// ✅ CORRECT
console.log('Token generated for subscriber:', subscriberId);
```

### 🚨 CRITICAL: Email Normalization

**Always Normalize Before Database Operations:**
```typescript
// ✅ CORRECT
const normalizedEmail = email.toLowerCase().trim();
// Use normalizedEmail for all database queries and comparisons

// ❌ WRONG
// Using email directly without normalization
```

**Why:**
- User might enter `Sophie@Example.COM`
- Database has `sophie@example.com`
- Without normalization, treated as different emails
- Unique index on `LOWER(email)` requires lowercase comparison

### 🚨 CRITICAL: SES Credentials

**Never Hardcode AWS Credentials:**
```typescript
// ❌ WRONG
const sesClient = new SESClient({
  region: 'eu-west-3',
  credentials: {
    accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
    secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
  }
});

// ✅ CORRECT
const sesClient = new SESClient({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});
```

### 🚨 CRITICAL: FROM Email Restriction

**IAM Policy Restricts FROM Address:**
```json
"Condition": {
  "StringEquals": {
    "ses:FromAddress": "etienne.maillot@lightandshutter.fr"
  }
}
```

**Must Use Exact Email:**
```typescript
// ✅ CORRECT
Source: 'etienne.maillot@lightandshutter.fr'

// ❌ WRONG - Will fail with AccessDenied
Source: 'noreply@lightandshutter.fr'
Source: 'contact@lightandshutter.fr'
```

### 🔔 Important: Rate Limiting Implementation

**Rate limiting is REQUIRED (AC2.9) but can be simplified:**
```sql
-- Count recent tokens for email
SELECT COUNT(*) as request_count
FROM lm_download_tokens dt
JOIN lm_subscribers s ON s.id = dt.subscriber_id
WHERE LOWER(s.email) = LOWER($1)
  AND dt.created_at > NOW() - INTERVAL '7 days';

-- If count >= 3, reject with 429 error
```

**Per-IP rate limiting is OPTIONAL (Story LM-006)**

### 🔔 Important: Environment Variables

**Development vs. Production:**
- Development: `BASE_URL=http://localhost:3000`
- Production: `BASE_URL=https://lightandshutter.fr`

**Impact on Confirmation Links:**
- Dev: `http://localhost:3000/api/lead-magnet/confirm/{token}`
- Prod: `https://lightandshutter.fr/api/lead-magnet/confirm/{token}`

**Make sure to test both!**

### 🔔 Important: RGPD Consent Text

**Use Exact Text:**
```typescript
const consentText = "J'accepte de recevoir des emails de Light & Shutter";
```

**Why Exact Text Matters:**
- Legal requirement for audit trail
- Proves what user agreed to
- Must match checkbox text exactly

### 🔔 Important: Privacy Policy Version

**Hardcoded for Now:**
```typescript
const privacyPolicyVersion = '2026-02-01';
```

**Future Enhancement:**
- Move to database or config file
- Update when privacy policy changes
- Track which version user agreed to

### 💡 Tip: Testing SES in Development

**Use SES Sandbox Mode for Testing:**
- Can only send to verified email addresses
- Add your personal email to SES verified identities
- Test full flow without affecting production quota

**Move to Production Mode for Launch:**
- Request production access via AWS Support
- Can send to any email address
- Required for real users

### 💡 Tip: Email Template Testing

**Test Across Multiple Clients:**
- Use services like Litmus or Email on Acid
- Send test emails to multiple accounts
- Check rendering on mobile devices
- Verify links work correctly

**Common Issues:**
- Outlook renders differently (use table layouts)
- Gmail blocks external CSS (use inline styles)
- Dark mode affects colors (test both modes)

### 💡 Tip: Database Query Performance

**Use EXPLAIN ANALYZE:**
```sql
EXPLAIN ANALYZE
SELECT id, status FROM lm_subscribers WHERE LOWER(email) = 'test@example.com';
```

**Expected Output:**
```
Index Scan using idx_lm_subscribers_email_lower
Execution Time: 0.125 ms
```

**If Not Using Index:**
- Check email normalization (LOWER() must be used)
- Verify index exists: `\d lm_subscribers` in psql
- Re-run migration if index missing

### 💡 Tip: Error Message Localization

**All error messages MUST be in French:**
```typescript
// ✅ CORRECT
throw createError({ 
  statusCode: 400, 
  message: 'Email et consentement requis' 
});

// ❌ WRONG
throw createError({ 
  statusCode: 400, 
  message: 'Email and consent required' 
});
```

**Common French Error Messages:**
- "Email requis" - Email required
- "Format d'email invalide" - Invalid email format
- "Veuillez accepter de recevoir nos emails" - Please accept to receive our emails
- "Trop de demandes" - Too many requests
- "Une erreur est survenue" - An error occurred
- "Veuillez réessayer" - Please try again

---

## Definition of Done Checklist

### Code Implementation
- [ ] `apps/ui-web/server/api/lead-magnet/submit.post.ts` created
- [ ] `apps/ui-web/server/utils/token.ts` created
- [ ] `apps/ui-web/server/utils/email.ts` created
- [ ] `apps/ui-web/components/forms/LeadMagnetForm.vue` created
- [ ] All acceptance criteria implemented (AC2.1 through AC2.12)
- [ ] Code follows Nuxt 3 patterns (defineEventHandler, etc.)
- [ ] Environment variables documented in `.env.example`

### Testing
- [ ] Unit tests for token generation pass
- [ ] Unit tests for token hashing pass
- [ ] Integration test: Submit valid email succeeds
- [ ] Integration test: Duplicate email handling works
- [ ] Integration test: Rate limiting works
- [ ] Integration test: Validation errors return 400
- [ ] Manual test: Email received within 60 seconds
- [ ] Manual test: Email displays correctly in Gmail, Outlook, Apple Mail
- [ ] Manual test: Form works on desktop and mobile
- [ ] Manual test: Database records created correctly

### Database
- [ ] LM-001 migration completed (prerequisite)
- [ ] All 3 tables exist: lm_subscribers, lm_consent_events, lm_download_tokens
- [ ] Database transactions work correctly
- [ ] Foreign keys cascade on delete
- [ ] Indexes improve query performance (EXPLAIN ANALYZE)

### AWS Integration
- [ ] SES credentials in environment variables
- [ ] SES email sending works (test email received)
- [ ] SES error handling implemented
- [ ] Confirmation link URL correct (uses BASE_URL)
- [ ] FROM email correct: etienne.maillot@lightandshutter.fr

### Security
- [ ] Tokens generated with crypto.randomBytes(32)
- [ ] Token hashes stored (never plain tokens)
- [ ] HTTPS used for all confirmation URLs
- [ ] AWS credentials never hardcoded
- [ ] SQL injection prevented (parameterized queries)

### RGPD Compliance
- [ ] Consent checkbox required (not pre-checked)
- [ ] Consent text stored in lm_consent_events
- [ ] Privacy policy version stored
- [ ] IP address stored
- [ ] User agent stored
- [ ] Timestamp stored (occurred_at)

### Code Quality
- [ ] TypeScript types used throughout
- [ ] Error handling implemented
- [ ] Logging added for debugging
- [ ] Comments explain complex logic
- [ ] Code reviewed by peer
- [ ] No console.log statements in production code
- [ ] No hardcoded values (use environment variables)

### Documentation
- [ ] Environment variables documented
- [ ] API endpoint documented
- [ ] Known issues documented
- [ ] Testing instructions provided

### Deployment
- [ ] Code merged to main branch
- [ ] Environment variables set in production
- [ ] Manual smoke test in staging environment
- [ ] No errors in application logs
- [ ] SES sending quota sufficient for expected traffic

### User Experience
- [ ] Form is intuitive and clear
- [ ] Error messages helpful and in French
- [ ] Success message reassuring
- [ ] Email is professional and branded
- [ ] Confirmation link works on first click

---

## Next Steps After LM-002

**After LM-002 is complete, proceed to:**
- **Story LM-003:** Download Delivery & Token Management
  - Implement GET /api/lead-magnet/confirm/[token]
  - Token validation (hash, expiration, use_count)
  - Update subscriber status to 'confirmed'
  - Generate S3 signed URL
  - Redirect to download or success page
  - Track download completion

**Dependencies:**
- LM-003 requires LM-002 to be 100% complete
- LM-003 uses the tokens generated by LM-002

---

## Quick Reference

### Key Files to Create
1. `apps/ui-web/server/api/lead-magnet/submit.post.ts` - API endpoint
2. `apps/ui-web/server/utils/token.ts` - Token generation
3. `apps/ui-web/server/utils/email.ts` - SES email sending
4. `apps/ui-web/components/forms/LeadMagnetForm.vue` - Form component

### Key Database Tables (from LM-001)
1. `lm_subscribers` - Email list with status
2. `lm_consent_events` - RGPD audit trail
3. `lm_download_tokens` - Token-based access control

### Key Environment Variables
```bash
AWS_REGION=eu-west-3
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=***
SES_FROM_EMAIL=etienne.maillot@lightandshutter.fr
BASE_URL=https://lightandshutter.fr
DATABASE_URL=postgresql://...
```

### Key Security Principles
- ✅ Generate tokens with crypto.randomBytes(32)
- ✅ Store SHA-256 hash, never plain token
- ✅ Use HTTPS for all token URLs
- ✅ Never log plain tokens
- ✅ Use environment variables for credentials

### Key Business Rules
- New signup: status='pending'
- Token lifespan: 48 hours
- Rate limit: 3 requests per email per 7 days
- Email normalization: lowercase, trimmed
- Duplicate handling: Check existing status and token expiration

---

**Document Version:** 1.0  
**Last Updated:** 2026-02-02  
**Status:** Ready for Implementation  
**Estimated Implementation Time:** 2-3 days (experienced developer)

**Questions or Issues?**
Refer to:
- Epic: `doc/planning/epics/lead-magnet-delivery-system-epic.md`
- LM-001 Context: `doc/planning/LM-001-COMPLETE-CONTEXT.md`
- Architecture: `doc/planning/lead-magnet-architecture.md`

---

**END OF ANALYSIS DOCUMENT**
