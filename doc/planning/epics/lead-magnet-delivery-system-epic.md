# Epic: Lead Magnet Delivery System with Double Opt-in & Analytics

**Epic ID:** EPIC-LM-001  
**Created:** 2026-02-02  
**Status:** Ready for Development  
**Business Value:** HIGH - Primary lead generation and email list building mechanism  
**Estimated Effort:** 21-34 story points (3-4 sprints)

---

## Executive Summary

Build a complete lead magnet delivery system that captures emails, implements RGPD-compliant double opt-in, delivers PDF downloads via Amazon S3 with signed URLs, and tracks complete funnel analytics from signup through download completion.

### Business Goals

1. **Generate qualified leads** through high-value lead magnet (Guide Mariée Sereine)
2. **Build RGPD-compliant email list** with provable consent
3. **Measure funnel performance** (signup → confirm → download rates)
4. **Protect content** with time-limited, signed download URLs
5. **Enable marketing automation** for nurture sequences

---

## User Stories Overview

| Story ID | Title | Priority | Estimate | Dependencies | Location |
|----------|-------|----------|----------|--------------|----------|
| LM-001 | Database Schema & Infrastructure Setup | MUST | 8 pts | None | infra |
| LM-002 | Email Capture & Double Opt-in Flow | MUST | 13 pts | LM-001 | ingest-api |
| LM-003 | Download Delivery & Token Management (API) | MUST | 8 pts | LM-001, LM-002 | ingest-api |
| LM-005 | Email Template Design & Copy | SHOULD | 5 pts | LM-002 | ingest-api |
| LM-006 | Rate Limiting & Abuse Prevention | COULD | 5 pts | LM-002, LM-003 | ingest-api |
| LM-007 | Dashboard Lead Magnet | SHOULD | 13 pts | LM-001, LM-002, LM-003 | ui-web |

**Total Estimate:** 52 story points

> **Note Architecture (2026-02-02):** 
> - Les APIs Lead Magnet sont exposées via **ingest-api** (Express) pour la landing page externe
> - L'API `/confirm/:token` retourne du **JSON** (pas de redirect) - la landing page gère l'UI
> - Le dashboard (LM-007) est dans **ui-web** (Nuxt) pour l'admin
> - LM-004 a été fusionné dans LM-007

---

## Technical Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ARCHITECTURE LEAD MAGNET                             │
├─────────────────────────────────────────┬───────────────────────────────────┤
│  REPO EXTERNE (hors scope)              │  CE REPO (ProspectFlow)           │
├─────────────────────────────────────────┼───────────────────────────────────┤
│                                         │                                   │
│  Landing Page B2C                       │  apps/ingest-api (Express)        │
│  (lightandshutter.fr)                   │  ├── POST /lead-magnet/signup     │
│         │                               │  │   → JSON: { success, message } │
│         │ HTTP                          │  │                                 │
│         └──────────────────────────────►│  └── GET /lead-magnet/confirm/:t  │
│                                         │      → JSON: { success, status,   │
│  Gère localement:                       │               downloadUrl?,       │
│  ├── Page succès                        │               error? }            │
│  ├── Page erreur (expiré)               │                                   │
│  └── Page erreur (invalide)             ├───────────────────────────────────┤
│                                         │  apps/ui-web (Nuxt Dashboard)     │
│                                         │  ├── /admin/lead-magnets          │
│                                         │  │   └── Analytics funnel         │
│                                         │  ├── /admin/subscribers           │
│                                         │  │   └── Liste + export           │
│                                         │  ├── /admin/nurture               │
│                                         │  │   └── Séquences emails         │
│                                         │  └── /admin/email-templates       │
│                                         │      └── Gestion templates        │
└─────────────────────────────────────────┴───────────────────────────────────┘
```

### User Journey Flow (API-centric)

```
1. Landing Page Form (EXTERNE)
   ↓
2. POST ingest-api/lead-magnet/signup
   ├─→ Insert subscriber (status=pending)
   ├─→ Log consent_event (signup)
   ├─→ Generate download_token (48h expiry)
   ├─→ Send confirmation email (Amazon SES)
   └─→ Return JSON: { success: true }
   ↓
3. User clicks email link → Landing page calls API
   ↓
4. GET ingest-api/lead-magnet/confirm/:token
   ├─→ Validate token (hash, expiry, use_count)
   ├─→ Update subscriber (status=confirmed)
   ├─→ Log consent_event (confirm)
   ├─→ Generate S3 signed URL (15 min)
   └─→ Return JSON: { success, downloadUrl }
   ↓
5. Landing page displays download button with S3 URL
```

### Technology Stack

- **Landing Page:** Repo externe (hors scope) - consomme les APIs
- **API Backend:** Express (ingest-api) - expose les endpoints Lead Magnet
- **Dashboard:** Nuxt 3 (ui-web) - analytics et gestion
- **Database:** PostgreSQL with UUID primary keys
- **Email Service:** Amazon SES
- **File Storage:** Amazon S3 with signed URLs
- **Analytics:** Database queries via dashboard ui-web

### Database Schema

**Core Tables:**

1. **`subscribers`** - The email list (subscriber state)
   - Tracks: email, status, confirmation timestamp, source tracking
   
2. **`consent_events`** - RGPD compliance audit log (immutable)
   - Records: signup, confirm, unsubscribe events with full context
   
3. **`download_tokens`** - Access control mechanism
   - Manages: token expiration, usage limits, reusability

*(Full schema in Story LM-001)*

---

## Business Rules

### Email Capture Rules

1. **Duplicate Prevention:** Same email cannot be in `pending` state multiple times
2. **Re-request Handling:** If user requests again after token expiry:
   - Generate NEW token with fresh 48h window
   - Send new confirmation email
   - Previous token remains expired (not renewed)
3. **Email Normalization:** Store emails in lowercase, trim whitespace
4. **Validation:** Basic email format validation (frontend + backend)

### Double Opt-in Rules (RGPD Compliance)

1. **Initial State:** All new signups start with `status=pending`
2. **Consent Capture:** Record exact consent text, privacy policy version, IP, user agent
3. **Confirmation Required:** User MUST click email link to access download
4. **Proof Retention:** All `consent_events` are immutable (append-only)
5. **Right to be Forgotten:** Cascading delete removes all related data

### Token & Download Rules

1. **Token Lifespan:** 48 hours from generation
2. **Reusability:** Within 48h window, user can re-download (max_uses tracked)
3. **Token Security:** Store SHA-256 hash, never plain token
4. **S3 URL Expiry:** Signed URLs expire after 15 minutes (enough for download)
5. **Rate Limiting:** Max 3 token generation requests per email per 7 days

### Download Completion Tracking

1. **Track on S3 Request:** Increment `use_count` when token is validated
2. **First Download:** Record `used_at` timestamp on first use
3. **Multiple Uses:** Allow re-downloads within 48h (track count)

---

## User Personas & Journeys

### Primary Persona: Sophie - The Organized Bride

**Profile:**
- Age: 28-32
- Planning wedding in 6-12 months
- Wants professional photography
- Researching photographers online
- Values organization and checklists

**Journey:**

1. **Discovery:** Finds blog post about wedding photo timelines
2. **Interest:** Sees lead magnet CTA "Download Free Guide"
3. **Action:** Fills email form, clicks submit
4. **Validation:** Sees "Check your email" message
5. **Confirmation:** Opens email within 2 hours, clicks confirm link
6. **Success:** Downloads PDF, saves to wedding planning folder
7. **Engagement:** Receives nurture email sequence (future phase)

**Pain Points:**
- Worried about spam if she gives email
- Might check email on phone but want to download on laptop later
- Could lose email in busy inbox

**How We Address:**
- Clear privacy statement on form
- 48h window allows flexibility
- Re-request option if email lost

---

## Success Metrics (KPIs)

### Primary Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Email Capture Rate | 15-25% | Form submissions / Landing page visitors |
| Confirmation Rate | 40-60% | Confirmed / Total signups |
| Download Completion Rate | 80-95% | Downloaded / Confirmed |
| Time to Confirm | < 2 hours (median) | confirmed_at - created_at |
| Overall Conversion | 30-50% | Downloaded / Total signups |

### Secondary Metrics

- Email delivery rate (target: >98%)
- Bounce rate (target: <2%)
- Re-request rate (indicates lost emails)
- Token expiry without use (indicates friction)
- Average downloads per token

### Analytics Queries Needed

```sql
-- Funnel overview
SELECT 
  COUNT(*) as total_signups,
  COUNT(*) FILTER (WHERE status='confirmed') as confirmed,
  COUNT(*) FILTER (WHERE status='confirmed') * 100.0 / COUNT(*) as confirm_rate,
  (SELECT COUNT(*) FROM download_tokens WHERE used_at IS NOT NULL) as downloads
FROM subscribers;

-- Time-based performance
SELECT 
  DATE(created_at) as date,
  COUNT(*) as daily_signups,
  AVG(EXTRACT(EPOCH FROM (confirmed_at - created_at))/3600) as avg_hours_to_confirm
FROM subscribers
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Download completion
SELECT 
  COUNT(DISTINCT dt.subscriber_id) as unique_downloaders,
  SUM(dt.use_count) as total_downloads,
  AVG(dt.use_count) as avg_downloads_per_user
FROM download_tokens dt
WHERE dt.used_at IS NOT NULL;
```

---

## User Stories (Detailed)

---

## Story LM-001: Database Schema & Infrastructure Setup

**Priority:** MUST  
**Estimate:** 8 story points  
**Sprint:** 1

### User Story

**As a** system administrator  
**I want** a robust database schema and AWS infrastructure configured  
**So that** we can securely store subscriber data and deliver files via S3

### Acceptance Criteria

**Database:**

- [ ] **AC1.1:** PostgreSQL database has 3 tables created:
  - `subscribers` (email list and state)
  - `consent_events` (RGPD audit log)
  - `download_tokens` (access control)
- [ ] **AC1.2:** All tables use UUID primary keys
- [ ] **AC1.3:** Foreign keys have `ON DELETE CASCADE` for RGPD compliance
- [ ] **AC1.4:** Indexes created on:
  - `subscribers.email` (unique, lowercase)
  - `consent_events.subscriber_id`
  - `download_tokens.subscriber_id`
  - `download_tokens.token_hash` (unique)
- [ ] **AC1.5:** Enum constraints enforce valid values:
  - `subscribers.status`: `pending`, `confirmed`, `unsubscribed`, `bounced`
  - `consent_events.event_type`: `signup`, `confirm`, `unsubscribe`
  - `download_tokens.purpose`: `confirm_and_download`, `download_only`

**AWS Infrastructure:**

- [ ] **AC1.6:** Amazon S3 bucket created and configured:
  - Private bucket (no public access)
  - CORS enabled for download requests
  - Lead magnet PDF uploaded to `/lead-magnets/guide-mariee-sereine.pdf`
- [ ] **AC1.7:** Amazon SES configured and verified:
  - Domain verified: `lightandshutter.fr`
  - From email verified: `etienne.maillot@lightandshutter.fr`
  - Moved out of SES sandbox (can send to any email)
  - SPF and DKIM records added to DNS
- [ ] **AC1.8:** IAM user created with minimal permissions:
  - `s3:GetObject` on lead magnet bucket
  - `ses:SendEmail` permission
  - Access keys stored in environment variables

**Environment Configuration:**

- [ ] **AC1.9:** Environment variables documented in `.env.example`:
  ```
  AWS_REGION=eu-west-3
  AWS_ACCESS_KEY_ID=xxx
  AWS_SECRET_ACCESS_KEY=xxx
  S3_BUCKET_NAME=lightandshutter-lead-magnets
  S3_FILE_KEY=lead-magnets/guide-mariee-sereine.pdf
  SES_FROM_EMAIL=etienne.maillot@lightandshutter.fr
  DATABASE_URL=postgresql://...
  BASE_URL=https://lightandshutter.fr
  ```

### Technical Implementation

**Database Migration:**

```sql
-- File: server/database/migrations/001_lead_magnet_schema.sql

-- 1) Subscribers table
CREATE TABLE subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','confirmed','unsubscribed','bounced')),
  source TEXT,
  tags JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  last_email_sent_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_subscribers_email_lower ON subscribers(LOWER(email));
CREATE INDEX idx_subscribers_status ON subscribers(status);
CREATE INDEX idx_subscribers_created_at ON subscribers(created_at DESC);

-- 2) Consent events table (RGPD audit log)
CREATE TABLE consent_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('signup','confirm','unsubscribe')),
  consent_text TEXT,
  privacy_policy_version TEXT,
  ip INET,
  user_agent TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_consent_events_subscriber ON consent_events(subscriber_id, occurred_at DESC);

-- 3) Download tokens table
CREATE TABLE download_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  purpose TEXT NOT NULL CHECK (purpose IN ('confirm_and_download','download_only')),
  expires_at TIMESTAMPTZ NOT NULL,
  max_uses INT NOT NULL DEFAULT 999,
  use_count INT NOT NULL DEFAULT 0,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_download_tokens_subscriber ON download_tokens(subscriber_id, created_at DESC);
CREATE INDEX idx_download_tokens_expires ON download_tokens(expires_at) WHERE use_count < max_uses;
```

### Testing Requirements

- [ ] Migration runs successfully on fresh database
- [ ] All constraints enforce valid data
- [ ] Cascading deletes work correctly
- [ ] Indexes improve query performance (use EXPLAIN)
- [ ] AWS S3 bucket accessible with IAM credentials
- [ ] Amazon SES can send test email successfully

### Definition of Done

- ✅ Database schema deployed to development environment
- ✅ AWS infrastructure configured and tested
- ✅ Environment variables documented
- ✅ All acceptance criteria pass
- ✅ Code reviewed and merged
- ✅ Migration script in version control

---

## Story LM-002: Email Capture & Double Opt-in Flow

**Priority:** MUST  
**Estimate:** 13 story points  
**Sprint:** 1-2  
**Dependencies:** LM-001

### User Story

**As a** prospective bride visiting the website  
**I want to** request the lead magnet and confirm my email address  
**So that** I receive my free guide and agree to future communications

### Acceptance Criteria

**Form Submission (Frontend):**

- [ ] **AC2.1:** Lead magnet form component displays:
  - Email input field (required)
  - Checkbox: "J'accepte de recevoir des emails de Light & Shutter" (required)
  - Link to privacy policy
  - Submit button: "Télécharger le Guide Gratuit"
- [ ] **AC2.2:** Client-side validation:
  - Email format validation
  - Consent checkbox must be checked
  - Clear error messages in French
- [ ] **AC2.3:** On successful submission:
  - Show success message: "Vérifiez votre email ! Un lien de confirmation vous a été envoyé."
  - Disable form to prevent double submission
  - Track event in Umami (optional)

**API Endpoint - Submit:**

- [ ] **AC2.4:** `POST /api/lead-magnet/submit` endpoint:
  - Accepts: `{ email, consentGiven, source? }`
  - Validates email format (backend)
  - Normalizes email to lowercase, trimmed
- [ ] **AC2.5:** Duplicate handling:
  - If email exists with `status=confirmed`: Return success (don't re-send)
  - If email exists with `status=pending` and token NOT expired: Return success (don't re-send)
  - If email exists with `status=pending` and token expired: Generate new token, send new email
  - If email new: Create new subscriber
- [ ] **AC2.6:** Database operations (atomic transaction):
  - Insert `subscribers` record (`status=pending`)
  - Insert `consent_events` record (`event_type=signup`) with:
    - `consent_text`: Exact checkbox text
    - `privacy_policy_version`: "2026-02-01"
    - `ip`: Request IP address
    - `user_agent`: Request user agent
  - Generate token with `crypto.randomBytes(32)` (URL-safe)
  - Hash token with SHA-256
  - Insert `download_tokens` record:
    - `token_hash`: SHA-256 hash
    - `purpose`: "confirm_and_download"
    - `expires_at`: NOW() + 48 hours
    - `max_uses`: 999 (reusable)
- [ ] **AC2.7:** Send confirmation email via Amazon SES:
  - To: Subscriber email
  - From: `etienne.maillot@lightandshutter.fr`
  - Subject: "Confirmez votre téléchargement - Guide Mariée Sereine"
  - Body: HTML template with confirmation link
  - Link format: `https://lightandshutter.fr/api/lead-magnet/confirm/{token}`
- [ ] **AC2.8:** Return success response: `{ success: true, message: "Email sent" }`

**Error Handling:**

- [ ] **AC2.9:** Handle rate limiting: Max 3 submissions per email per 7 days
- [ ] **AC2.10:** Handle SES failures gracefully (log error, notify admin)
- [ ] **AC2.11:** Handle database failures (rollback transaction)
- [ ] **AC2.12:** User-friendly error messages in French

### Technical Implementation

**Utils - Token Generation:**

```typescript
// server/utils/token.ts
import crypto from 'crypto';

export function generateToken(): { token: string; hash: string } {
  const token = crypto.randomBytes(32).toString('base64url');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, hash };
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
```

**Utils - Email Service:**

```typescript
// server/utils/email.ts
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const sesClient = new SESClient({ 
  region: process.env.AWS_REGION || 'eu-west-3' 
});

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
    </head>
    <body style="font-family: Lato, sans-serif; color: #213E60; background: #F4F2EF; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px;">
        <h1 style="color: #213E60; font-family: 'Cormorant Garamond', serif;">
          Confirmez votre téléchargement
        </h1>
        <p>Bonjour${subscriberName ? ' ' + subscriberName : ''},</p>
        <p>
          Merci de votre intérêt pour le <strong>Guide de la Mariée Sereine</strong> !
        </p>
        <p>
          Cliquez sur le bouton ci-dessous pour confirmer votre adresse email 
          et accéder immédiatement à votre guide gratuit :
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${confirmUrl}" 
             style="background: #FFCC2B; color: #213E60; padding: 15px 30px; 
                    text-decoration: none; border-radius: 5px; font-weight: bold;
                    display: inline-block;">
            Confirmer et Télécharger
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">
          Ce lien est valide pendant <strong>48 heures</strong>. 
          Vous pourrez télécharger le guide plusieurs fois durant cette période.
        </p>
        <hr style="border: none; border-top: 1px solid #E0E0E0; margin: 30px 0;">
        <p style="color: #999; font-size: 12px;">
          Light & Shutter Photography<br>
          <a href="https://lightandshutter.fr">lightandshutter.fr</a>
        </p>
      </div>
    </body>
    </html>
  `;

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
        Text: {
          Data: `Confirmez votre téléchargement\n\nCliquez sur ce lien: ${confirmUrl}\n\nCe lien expire dans 48h.`,
          Charset: 'UTF-8'
        }
      }
    }
  };

  await sesClient.send(new SendEmailCommand(params));
}
```

**API Route - Submit:**

```typescript
// server/api/lead-magnet/submit.post.ts
import { generateToken } from '~/server/utils/token';
import { sendConfirmationEmail } from '~/server/utils/email';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { email, consentGiven, source } = body;

  // Validation
  if (!email || !consentGiven) {
    throw createError({ statusCode: 400, message: 'Email et consentement requis' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const ip = getRequestIP(event);
  const userAgent = getRequestHeader(event, 'user-agent');

  // Database operations (use your DB client)
  const db = useDatabase(); // Your DB connection

  try {
    // Check for existing subscriber
    const existingSubscriber = await db.query(
      'SELECT id, status FROM subscribers WHERE LOWER(email) = $1',
      [normalizedEmail]
    );

    let subscriberId: string;

    if (existingSubscriber.rows.length > 0) {
      const subscriber = existingSubscriber.rows[0];
      subscriberId = subscriber.id;

      // If already confirmed, just return success
      if (subscriber.status === 'confirmed') {
        return { success: true, message: 'Déjà confirmé' };
      }

      // Check if token still valid
      const validToken = await db.query(
        `SELECT id FROM download_tokens 
         WHERE subscriber_id = $1 AND expires_at > NOW() AND purpose = 'confirm_and_download'
         LIMIT 1`,
        [subscriberId]
      );

      if (validToken.rows.length > 0) {
        return { success: true, message: 'Email déjà envoyé' };
      }
    } else {
      // Create new subscriber
      const newSubscriber = await db.query(
        `INSERT INTO subscribers (email, status, source, created_at)
         VALUES ($1, 'pending', $2, NOW())
         RETURNING id`,
        [normalizedEmail, source || 'lead_magnet_form']
      );
      subscriberId = newSubscriber.rows[0].id;

      // Log consent event
      await db.query(
        `INSERT INTO consent_events 
         (subscriber_id, event_type, consent_text, privacy_policy_version, ip, user_agent, occurred_at)
         VALUES ($1, 'signup', $2, $3, $4, $5, NOW())`,
        [
          subscriberId,
          "J'accepte de recevoir des emails de Light & Shutter",
          '2026-02-01',
          ip,
          userAgent
        ]
      );
    }

    // Generate token
    const { token, hash } = generateToken();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    // Store token
    await db.query(
      `INSERT INTO download_tokens 
       (subscriber_id, token_hash, purpose, expires_at, max_uses, created_at)
       VALUES ($1, $2, 'confirm_and_download', $3, 999, NOW())`,
      [subscriberId, hash, expiresAt]
    );

    // Send email
    await sendConfirmationEmail(normalizedEmail, token);

    return { success: true, message: 'Email envoyé' };

  } catch (error) {
    console.error('Lead magnet submission error:', error);
    throw createError({ 
      statusCode: 500, 
      message: 'Une erreur est survenue. Veuillez réessayer.' 
    });
  }
});
```

**Frontend Component:**

```vue
<!-- app/components/forms/LeadMagnetForm.vue -->
<template>
  <form @submit.prevent="handleSubmit" class="lead-magnet-form">
    <h3>Téléchargez le Guide Gratuit</h3>
    
    <div class="form-group">
      <label for="email">Votre email</label>
      <input
        id="email"
        v-model="formData.email"
        type="email"
        required
        placeholder="vous@example.com"
        :disabled="isSubmitting || isSuccess"
      />
      <span v-if="errors.email" class="error">{{ errors.email }}</span>
    </div>

    <div class="form-group checkbox">
      <label>
        <input
          v-model="formData.consentGiven"
          type="checkbox"
          required
          :disabled="isSubmitting || isSuccess"
        />
        J'accepte de recevoir des emails de Light & Shutter
      </label>
      <span v-if="errors.consent" class="error">{{ errors.consent }}</span>
    </div>

    <p class="privacy-note">
      Consultez notre <a href="/politique-de-confidentialite">politique de confidentialité</a>
    </p>

    <button 
      type="submit" 
      :disabled="isSubmitting || isSuccess"
      class="submit-button"
    >
      {{ buttonText }}
    </button>

    <div v-if="isSuccess" class="success-message">
      ✅ Vérifiez votre email ! Un lien de confirmation vous a été envoyé.
    </div>

    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>
  </form>
</template>

<script setup lang="ts">
const formData = ref({
  email: '',
  consentGiven: false
});

const isSubmitting = ref(false);
const isSuccess = ref(false);
const errorMessage = ref('');
const errors = ref({ email: '', consent: '' });

const buttonText = computed(() => {
  if (isSuccess.value) return '✓ Email envoyé';
  if (isSubmitting.value) return 'Envoi en cours...';
  return 'Télécharger le Guide Gratuit';
});

async function handleSubmit() {
  errors.value = { email: '', consent: '' };
  errorMessage.value = '';

  // Validation
  if (!formData.value.email) {
    errors.value.email = 'Email requis';
    return;
  }
  if (!formData.value.consentGiven) {
    errors.value.consent = 'Veuillez accepter de recevoir nos emails';
    return;
  }

  isSubmitting.value = true;

  try {
    const response = await $fetch('/api/lead-magnet/submit', {
      method: 'POST',
      body: {
        email: formData.value.email,
        consentGiven: formData.value.consentGiven,
        source: 'landing_page'
      }
    });

    if (response.success) {
      isSuccess.value = true;
      // Optional: Track with Umami
      // umami?.track('lead-magnet-signup');
    }
  } catch (error: any) {
    errorMessage.value = error.data?.message || 'Une erreur est survenue. Veuillez réessayer.';
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<style scoped>
.lead-magnet-form {
  background: white;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  max-width: 500px;
  margin: 0 auto;
}

h3 {
  color: #213E60;
  font-family: 'Cormorant Garamond', serif;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 8px;
  color: #213E60;
  font-weight: 500;
}

input[type="email"] {
  width: 100%;
  padding: 12px;
  border: 2px solid #E0E0E0;
  border-radius: 5px;
  font-size: 16px;
}

input[type="email"]:focus {
  outline: none;
  border-color: #94B6EF;
}

.checkbox label {
  display: flex;
  align-items: center;
  gap: 10px;
}

.submit-button {
  width: 100%;
  background: #FFCC2B;
  color: #213E60;
  padding: 15px;
  border: none;
  border-radius: 5px;
  font-weight: bold;
  font-size: 16px;
  cursor: pointer;
  transition: transform 0.2s;
}

.submit-button:hover:not(:disabled) {
  transform: translateY(-2px);
}

.submit-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.success-message {
  margin-top: 20px;
  padding: 15px;
  background: #E8F5E9;
  border-left: 4px solid #4CAF50;
  color: #2E7D32;
}

.error-message {
  margin-top: 20px;
  padding: 15px;
  background: #FFEBEE;
  border-left: 4px solid #F44336;
  color: #C62828;
}

.error {
  color: #F44336;
  font-size: 14px;
  margin-top: 5px;
  display: block;
}

.privacy-note {
  font-size: 14px;
  color: #666;
  margin-bottom: 20px;
}

.privacy-note a {
  color: #94B6EF;
  text-decoration: underline;
}
</style>
```

### Testing Requirements

- [ ] Unit tests for token generation and hashing
- [ ] Integration test: Submit email → Verify database records
- [ ] Integration test: Duplicate email handling
- [ ] Test expired token scenario
- [ ] Test email delivery (sandbox mode)
- [ ] Test rate limiting
- [ ] Frontend form validation tests

### Definition of Done

- ✅ All acceptance criteria validated
- ✅ Unit tests pass (>80% coverage)
- ✅ Integration tests pass
- ✅ Code reviewed
- ✅ Email templates tested across clients (Gmail, Outlook, Apple Mail)
- ✅ Manual QA completed
- ✅ Merged to main branch

---

## Story LM-003: Download Delivery & Token Management

**Priority:** MUST  
**Estimate:** 13 story points  
**Sprint:** 2  
**Dependencies:** LM-001, LM-002

### User Story

**As a** confirmed subscriber  
**I want to** download the lead magnet PDF via secure link  
**So that** I can access my free guide and save it for reference

### Acceptance Criteria

**S3 Integration:**

- [ ] **AC3.1:** S3 utility function generates signed URLs:
  - Valid for 15 minutes
  - Uses AWS SDK v3
  - Content-Disposition forces download
  - Includes filename: `guide-mariee-sereine.pdf`
- [ ] **AC3.2:** S3 signed URL generation is secure:
  - Uses IAM credentials from environment
  - No hardcoded secrets
  - Proper error handling

**Download Flow:**

- [ ] **AC3.3:** When user clicks confirmation link:
  - Token validated (hash match, not expired, use_count check)
  - Download count incremented atomically
  - S3 signed URL generated
  - User redirected to S3 URL (immediate download) OR success page with download button
- [ ] **AC3.4:** Download tracking:
  - First download: Set `used_at` timestamp
  - Subsequent downloads: Increment `use_count` only
  - Track within 48h window
- [ ] **AC3.5:** Success page displays:
  - Download button (prominent, amber-colored)
  - Message: "Votre guide est prêt !"
  - Alternative: "Le téléchargement ne démarre pas ? Cliquez ici"
  - Note: "Vous pouvez télécharger à nouveau dans les 48 prochaines heures"

**Re-download Support:**

- [ ] **AC3.6:** User can re-download within 48h:
  - Save original email with token link
  - Click same link again
  - Token still valid → Generate new S3 signed URL
  - Download works seamlessly
- [ ] **AC3.7:** After 48h expiry:
  - Token invalid → Show expired message
  - Provide form to request new download link
  - New request generates fresh token with new 48h window

**Error Handling:**

- [ ] **AC3.8:** Expired token:
  - Show page: "Ce lien a expiré"
  - Offer: "Demander un nouveau lien"
  - Form to re-enter email
- [ ] **AC3.9:** Invalid token:
  - Show page: "Ce lien est invalide"
  - Contact support option
- [ ] **AC3.10:** S3 errors:
  - Graceful fallback message
  - Log error for monitoring
  - Notify admin if recurring

### Technical Implementation

**Utils - S3 Service:**

```typescript
// server/utils/s3.ts
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({ 
  region: process.env.AWS_REGION || 'eu-west-3',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

export async function getLeadMagnetDownloadUrl(): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: process.env.S3_FILE_KEY || 'lead-magnets/guide-mariee-sereine.pdf',
    ResponseContentDisposition: 'attachment; filename="guide-mariee-sereine.pdf"',
    ResponseContentType: 'application/pdf'
  });

  // Signed URL valid for 15 minutes (900 seconds)
  return await getSignedUrl(s3Client, command, { expiresIn: 900 });
}
```

**API Route - Confirm & Download:**

```typescript
// server/api/lead-magnet/confirm/[token].get.ts
import { hashToken } from '~/server/utils/token';
import { getLeadMagnetDownloadUrl } from '~/server/utils/s3';

export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token');
  
  if (!token) {
    throw createError({ statusCode: 400, message: 'Token requis' });
  }

  const tokenHash = hashToken(token);
  const ip = getRequestIP(event);
  const userAgent = getRequestHeader(event, 'user-agent');
  const db = useDatabase();

  try {
    // Validate token
    const tokenRecord = await db.query(
      `SELECT dt.id, dt.subscriber_id, dt.expires_at, dt.use_count, dt.max_uses, dt.used_at,
              s.email, s.status
       FROM download_tokens dt
       JOIN subscribers s ON s.id = dt.subscriber_id
       WHERE dt.token_hash = $1 AND dt.purpose = 'confirm_and_download'`,
      [tokenHash]
    );

    if (tokenRecord.rows.length === 0) {
      return sendRedirect(event, '/lead-magnet/invalide', 302);
    }

    const tokenData = tokenRecord.rows[0];

    // Check expiration
    if (new Date(tokenData.expires_at) < new Date()) {
      return sendRedirect(event, '/lead-magnet/expire', 302);
    }

    // Check usage limit (optional - currently set to 999 for reusability)
    if (tokenData.use_count >= tokenData.max_uses) {
      return sendRedirect(event, '/lead-magnet/limite-atteinte', 302);
    }

    // Begin transaction
    await db.query('BEGIN');

    try {
      // Update subscriber status if first time
      if (tokenData.status === 'pending') {
        await db.query(
          `UPDATE subscribers 
           SET status = 'confirmed', confirmed_at = NOW()
           WHERE id = $1`,
          [tokenData.subscriber_id]
        );

        // Log consent confirmation event
        await db.query(
          `INSERT INTO consent_events 
           (subscriber_id, event_type, ip, user_agent, occurred_at)
           VALUES ($1, 'confirm', $2, $3, NOW())`,
          [tokenData.subscriber_id, ip, userAgent]
        );
      }

      // Update token usage
      const updateQuery = tokenData.used_at 
        ? `UPDATE download_tokens SET use_count = use_count + 1 WHERE id = $1`
        : `UPDATE download_tokens SET use_count = use_count + 1, used_at = NOW() WHERE id = $1`;
      
      await db.query(updateQuery, [tokenData.id]);

      await db.query('COMMIT');

      // Generate S3 signed URL
      const downloadUrl = await getLeadMagnetDownloadUrl();

      // Option 1: Direct redirect to S3 (immediate download)
      return sendRedirect(event, downloadUrl, 302);

      // Option 2: Redirect to success page with download link
      // return sendRedirect(event, `/lead-magnet/succes?url=${encodeURIComponent(downloadUrl)}`, 302);

    } catch (dbError) {
      await db.query('ROLLBACK');
      throw dbError;
    }

  } catch (error) {
    console.error('Confirmation error:', error);
    throw createError({ 
      statusCode: 500, 
      message: 'Erreur lors du téléchargement' 
    });
  }
});
```

**Frontend Success Page:**

```vue
<!-- app/pages/lead-magnet/succes.vue -->
<template>
  <div class="success-page">
    <div class="container">
      <h1>🎉 Votre guide est prêt !</h1>
      
      <p class="message">
        Merci d'avoir confirmé votre adresse email. 
        Votre téléchargement devrait démarrer automatiquement.
      </p>

      <a 
        :href="downloadUrl" 
        class="download-button"
        download="guide-mariee-sereine.pdf"
      >
        📥 Télécharger le Guide
      </a>

      <p class="note">
        Le téléchargement ne démarre pas ? 
        <a :href="downloadUrl" target="_blank">Cliquez ici</a>
      </p>

      <div class="info-box">
        <p>
          💡 <strong>Astuce :</strong> Vous pouvez télécharger ce guide 
          à nouveau dans les 48 prochaines heures en utilisant le même lien 
          dans votre email.
        </p>
      </div>

      <div class="next-steps">
        <h2>Et maintenant ?</h2>
        <ul>
          <li>Consultez votre guide et créez votre planning photo</li>
          <li>Découvrez notre <a href="/portfolio">portfolio</a></li>
          <li>Réservez une <a href="/contact">consultation gratuite</a></li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const downloadUrl = computed(() => route.query.url as string);

// Auto-trigger download on mount
onMounted(() => {
  if (downloadUrl.value) {
    window.location.href = downloadUrl.value;
  }
});

usePageSeo({
  title: 'Téléchargement réussi',
  description: 'Téléchargez votre guide gratuit',
  index: false
});
</script>

<style scoped>
.success-page {
  background: #F4F2EF;
  min-height: 100vh;
  padding: 60px 20px;
}

.container {
  max-width: 600px;
  margin: 0 auto;
  background: white;
  padding: 40px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

h1 {
  color: #213E60;
  font-family: 'Cormorant Garamond', serif;
  font-size: 2.5rem;
  margin-bottom: 20px;
}

.download-button {
  display: inline-block;
  background: #FFCC2B;
  color: #213E60;
  padding: 15px 40px;
  border-radius: 5px;
  text-decoration: none;
  font-weight: bold;
  font-size: 1.2rem;
  margin: 30px 0;
  transition: transform 0.2s;
}

.download-button:hover {
  transform: translateY(-2px);
}

.info-box {
  background: #94B6EF20;
  border-left: 4px solid #94B6EF;
  padding: 15px;
  margin: 30px 0;
}

.next-steps {
  margin-top: 40px;
  padding-top: 30px;
  border-top: 1px solid #E0E0E0;
}

.next-steps ul {
  list-style: none;
  padding: 0;
}

.next-steps li {
  margin: 10px 0;
  padding-left: 25px;
  position: relative;
}

.next-steps li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: #FFCC2B;
  font-weight: bold;
}
</style>
```

**Error Pages:**

```vue
<!-- app/pages/lead-magnet/expire.vue -->
<template>
  <div class="error-page">
    <div class="container">
      <h1>⏰ Ce lien a expiré</h1>
      
      <p>
        Votre lien de téléchargement était valide pendant 48 heures 
        et a maintenant expiré pour des raisons de sécurité.
      </p>

      <p>Pas de souci ! Vous pouvez demander un nouveau lien :</p>

      <LeadMagnetForm />

      <div class="help">
        <p>Besoin d'aide ? <a href="/contact">Contactez-nous</a></p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
usePageSeo({
  title: 'Lien expiré',
  description: 'Demandez un nouveau lien',
  index: false
});
</script>

<style scoped>
.error-page {
  background: #F4F2EF;
  min-height: 100vh;
  padding: 60px 20px;
}

.container {
  max-width: 600px;
  margin: 0 auto;
}

h1 {
  color: #213E60;
  font-family: 'Cormorant Garamond', serif;
  margin-bottom: 20px;
}
</style>
```

```vue
<!-- app/pages/lead-magnet/invalide.vue -->
<template>
  <div class="error-page">
    <div class="container">
      <h1>❌ Ce lien est invalide</h1>
      
      <p>
        Le lien que vous avez utilisé n'est pas valide ou a déjà été utilisé.
      </p>

      <p>Vous pouvez :</p>
      <ul>
        <li>Vérifier que vous avez copié le lien complet depuis votre email</li>
        <li>Demander un nouveau lien ci-dessous</li>
        <li><a href="/contact">Nous contacter</a> si le problème persiste</li>
      </ul>

      <LeadMagnetForm />
    </div>
  </div>
</template>

<script setup lang="ts">
usePageSeo({
  title: 'Lien invalide',
  description: 'Demandez un nouveau lien',
  index: false
});
</script>

<style scoped>
.error-page {
  background: #F4F2EF;
  min-height: 100vh;
  padding: 60px 20px;
}

.container {
  max-width: 600px;
  margin: 0 auto;
  background: white;
  padding: 40px;
  border-radius: 8px;
}

h1 {
  color: #213E60;
  font-family: 'Cormorant Garamond', serif;
  margin-bottom: 20px;
}

ul {
  margin: 20px 0;
  padding-left: 20px;
}

li {
  margin: 10px 0;
}
</style>
```

### Testing Requirements

- [ ] Unit test: S3 signed URL generation
- [ ] Integration test: Token validation flow
- [ ] Integration test: Download count increment
- [ ] Test re-download within 48h window
- [ ] Test expired token handling
- [ ] Test S3 error scenarios
- [ ] Manual test: Actual PDF download from S3

### Definition of Done

- ✅ All acceptance criteria validated
- ✅ S3 signed URLs work correctly
- ✅ Download tracking accurate
- ✅ Re-download within 48h works
- ✅ Error pages implemented
- ✅ Code reviewed and tested
- ✅ Merged to main branch

---

## Story LM-004: Analytics Dashboard & Reporting

**Priority:** SHOULD  
**Estimate:** 8 story points  
**Sprint:** 3  
**Dependencies:** LM-001, LM-002, LM-003

### User Story

**As a** business owner  
**I want to** view analytics about lead magnet performance  
**So that** I can measure ROI and optimize the funnel

### Acceptance Criteria

- [ ] **AC4.1:** Admin analytics page displays key metrics:
  - Total signups
  - Confirmation rate (confirmed / total)
  - Download completion rate (downloaded / confirmed)
  - Average time to confirm
  - Total downloads (including re-downloads)
- [ ] **AC4.2:** Funnel visualization shows:
  - Stage 1: Signups (100%)
  - Stage 2: Confirmed (% of signups)
  - Stage 3: Downloaded (% of confirmed)
- [ ] **AC4.3:** Date range filter (last 7 days, 30 days, all time)
- [ ] **AC4.4:** Export data to CSV
- [ ] **AC4.5:** Real-time stats (refresh without page reload)

**API Endpoint:**

```typescript
// server/api/lead-magnet/stats.get.ts
export default defineEventHandler(async (event) => {
  // TODO: Add authentication check
  
  const db = useDatabase();
  
  const stats = await db.query(`
    SELECT 
      COUNT(*) as total_signups,
      COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
      COUNT(*) FILTER (WHERE status = 'confirmed') * 100.0 / NULLIF(COUNT(*), 0) as confirmation_rate,
      (SELECT COUNT(DISTINCT subscriber_id) FROM download_tokens WHERE used_at IS NOT NULL) as unique_downloaders,
      (SELECT SUM(use_count) FROM download_tokens WHERE used_at IS NOT NULL) as total_downloads,
      AVG(EXTRACT(EPOCH FROM (confirmed_at - created_at)) / 3600) FILTER (WHERE confirmed_at IS NOT NULL) as avg_hours_to_confirm
    FROM subscribers
  `);
  
  return stats.rows[0];
});
```

### Testing Requirements

- [ ] API endpoint returns correct metrics
- [ ] Dashboard displays data accurately
- [ ] Date filters work correctly
- [ ] CSV export functionality works

### Definition of Done

- ✅ Analytics dashboard implemented
- ✅ Protected by authentication
- ✅ Data accurate and tested
- ✅ Merged to main branch

---

## Story LM-005: Email Template Design & Copy

**Priority:** SHOULD  
**Estimate:** 5 story points  
**Sprint:** 2-3  
**Dependencies:** LM-002

### User Story

**As a** subscriber  
**I want to** receive professional, branded emails  
**So that** I trust the source and take action

### Acceptance Criteria

- [ ] **AC5.1:** Confirmation email uses brand colors and typography
- [ ] **AC5.2:** Email is mobile-responsive
- [ ] **AC5.3:** Copy is clear, friendly, and professional (in French)
- [ ] **AC5.4:** CTA button is prominent and action-oriented
- [ ] **AC5.5:** Email tested across major clients (Gmail, Outlook, Apple Mail, mobile)
- [ ] **AC5.6:** Plain text fallback provided

### Definition of Done

- ✅ Email template designed and approved
- ✅ Copy reviewed by stakeholder
- ✅ Cross-client testing passed
- ✅ Implemented in codebase

---

## Story LM-006: Rate Limiting & Abuse Prevention

**Priority:** COULD  
**Estimate:** 5 story points  
**Sprint:** 3  
**Dependencies:** LM-002, LM-003

### User Story

**As a** system administrator  
**I want to** prevent abuse of the lead magnet system  
**So that** we avoid spam and maintain email deliverability

### Acceptance Criteria

- [ ] **AC6.1:** Rate limiting on submission: Max 3 requests per email per 7 days
- [ ] **AC6.2:** IP-based rate limiting: Max 10 submissions per IP per hour
- [ ] **AC6.3:** CAPTCHA integration (optional - hCaptcha or Cloudflare Turnstile)
- [ ] **AC6.4:** Disposable email detection and blocking (optional)
- [ ] **AC6.5:** Monitoring and alerting for suspicious activity

### Technical Implementation

```typescript
// server/utils/rateLimit.ts
export async function checkEmailRateLimit(email: string): Promise<boolean> {
  const db = useDatabase();
  
  const result = await db.query(
    `SELECT COUNT(*) as request_count
     FROM download_tokens dt
     JOIN subscribers s ON s.id = dt.subscriber_id
     WHERE LOWER(s.email) = LOWER($1)
     AND dt.created_at > NOW() - INTERVAL '7 days'`,
    [email]
  );
  
  const requestCount = parseInt(result.rows[0].request_count);
  return requestCount < 3; // Max 3 requests per 7 days
}

export async function checkIpRateLimit(ip: string): Promise<boolean> {
  const db = useDatabase();
  
  const result = await db.query(
    `SELECT COUNT(*) as request_count
     FROM consent_events
     WHERE ip = $1
     AND event_type = 'signup'
     AND occurred_at > NOW() - INTERVAL '1 hour'`,
    [ip]
  );
  
  const requestCount = parseInt(result.rows[0].request_count);
  return requestCount < 10; // Max 10 per hour per IP
}
```

### Definition of Done

- ✅ Rate limiting implemented and tested
- ✅ Abuse prevention measures active
- ✅ Monitoring configured

---

## Out of Scope (Future Phases)

### Phase 2 Features:
- Email nurture sequence (drip campaign)
- Segmentation by source/tags
- A/B testing different lead magnets
- Integration with CRM (HubSpot, Mailchimp)
- Unsubscribe management page
- Advanced analytics (cohort analysis, attribution)

### Phase 3 Features:
- Multiple lead magnets with selection
- Dynamic lead magnet generation (personalized PDFs)
- Social proof (download counter)
- Exit-intent popup integration
- Progressive profiling (capture more data over time)

---

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Amazon SES email delivery failures | HIGH | LOW | Implement retry logic, monitor bounce rates, use verified domain |
| Token abuse (sharing links) | MEDIUM | MEDIUM | Time-limited tokens, usage tracking, consider one-time tokens for high-value content |
| Database performance at scale | LOW | LOW | Proper indexes in place, query optimization, consider read replicas if needed |
| RGPD compliance issues | HIGH | LOW | Legal review of consent text, implement right to be forgotten, maintain audit log |
| S3 costs unexpected | LOW | LOW | Monitor download counts, set budget alerts, optimize PDF file size |

---

## Dependencies & Prerequisites

### External Services:
- ✅ Amazon Web Services account
- ✅ SES moved out of sandbox
- ✅ Domain verification (SPF, DKIM)
- ✅ S3 bucket configured

### Technical Prerequisites:
- ✅ PostgreSQL database available
- ✅ Nuxt 3 application running
- ✅ Environment variables management
- ✅ SSL certificate for HTTPS

### Content Prerequisites:
- ✅ Lead magnet PDF finalized and designed
- ✅ Email copy written and approved
- ✅ Privacy policy updated
- ✅ Landing page copy ready

---

## Launch Checklist

### Pre-Launch:
- [ ] All acceptance criteria met across all stories
- [ ] Code reviewed and merged
- [ ] Database migrations run on production
- [ ] AWS services configured and tested
- [ ] Email deliverability tested (send to personal emails)
- [ ] Analytics tracking verified
- [ ] Error monitoring configured (Sentry or similar)
- [ ] Load testing completed
- [ ] Security audit completed
- [ ] RGPD compliance review

### Launch Day:
- [ ] Deploy to production
- [ ] Smoke tests pass
- [ ] Monitor error logs
- [ ] Monitor email delivery rates
- [ ] Track first signups
- [ ] Validate full user journey end-to-end

### Post-Launch (Week 1):
- [ ] Monitor key metrics daily
- [ ] Review bounce and complaint rates
- [ ] Optimize based on user feedback
- [ ] Fix any bugs discovered
- [ ] Document lessons learned

---

## Success Criteria (Epic Complete)

This epic is considered DONE when:

✅ Lead magnet form captures emails successfully  
✅ Double opt-in flow works end-to-end  
✅ Confirmation emails deliver within 60 seconds  
✅ Download links work reliably  
✅ Re-download within 48h window functions correctly  
✅ Analytics dashboard shows accurate funnel metrics  
✅ RGPD compliance requirements met  
✅ System handles 100+ signups/day without issues  
✅ Zero critical bugs in production after 1 week  
✅ Confirmation rate >40% achieved  

---

## Installation & Setup Guide

### 1. Install Dependencies

```bash
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner @aws-sdk/client-ses
```

### 2. Environment Variables

Create/update `.env`:

```env
# AWS Configuration
AWS_REGION=eu-west-3
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# S3 Configuration
S3_BUCKET_NAME=lightandshutter-lead-magnets
S3_FILE_KEY=lead-magnets/guide-mariee-sereine.pdf

# SES Configuration
SES_FROM_EMAIL=etienne.maillot@lightandshutter.fr

# Application
BASE_URL=https://lightandshutter.fr

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/lightandshutter
```

### 3. Run Database Migration

```bash
psql -U your_user -d your_database -f server/database/migrations/001_lead_magnet_schema.sql
```

### 4. Upload PDF to S3

```bash
aws s3 cp guide-mariee-sereine.pdf s3://lightandshutter-lead-magnets/lead-magnets/guide-mariee-sereine.pdf
```

### 5. Test Email Sending

Create a test script to verify SES configuration:

```typescript
// test-email.ts
import { sendConfirmationEmail } from './server/utils/email';

sendConfirmationEmail('your-test-email@example.com', 'test-token-123')
  .then(() => console.log('Email sent successfully!'))
  .catch(error => console.error('Email error:', error));
```

---

**Epic Owner:** Tolliam  
**Technical Lead:** TBD  
**Stakeholders:** Marketing, Legal (RGPD), DevOps  

**Last Updated:** 2026-02-02  
**Status:** READY FOR SPRINT PLANNING
