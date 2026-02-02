# Story LM-001: Database Schema & Infrastructure Setup - Complete Context

**Document Created:** 2026-02-02  
**Source:** lead-magnet-delivery-system-epic.md  
**Purpose:** Comprehensive context extraction for implementation

---

## 1. Story LM-001 Complete Requirements

### User Story Statement

**As a** system administrator  
**I want** a robust database schema and AWS infrastructure configured  
**So that** we can securely store subscriber data and deliver files via S3

### Priority & Effort
- **Priority:** MUST
- **Estimate:** 8 story points
- **Sprint:** 1
- **Dependencies:** None (foundational story)

---

## 2. Complete Acceptance Criteria

### Database Requirements

#### AC1.1: PostgreSQL Database Tables
- [ ] **Three tables must be created:**
  1. `subscribers` - Email list and subscriber state tracking
  2. `consent_events` - RGPD audit log (immutable, append-only)
  3. `download_tokens` - Access control mechanism for downloads

#### AC1.2: UUID Primary Keys
- [ ] **All tables use UUID primary keys:**
  - Uses `gen_random_uuid()` for generation
  - Provides globally unique identifiers
  - Better for distributed systems and security

#### AC1.3: Foreign Key Cascade Deletion
- [ ] **Foreign keys configured with `ON DELETE CASCADE`:**
  - Purpose: RGPD compliance (Right to be Forgotten)
  - When a subscriber is deleted, all related records automatically delete
  - Applies to: `consent_events.subscriber_id` and `download_tokens.subscriber_id`

#### AC1.4: Database Indexes
- [ ] **Required indexes for performance:**
  1. `subscribers.email` - Unique index on LOWER(email) for case-insensitive lookups
  2. `subscribers.status` - For filtering by subscriber state
  3. `subscribers.created_at` - For time-based queries (DESC order)
  4. `consent_events.subscriber_id` - For audit log retrieval with occurred_at
  5. `download_tokens.subscriber_id` - For token lookup by subscriber
  6. `download_tokens.token_hash` - UNIQUE index for token validation
  7. `download_tokens.expires_at` - Partial index for active tokens only

#### AC1.5: Enum Constraints
- [ ] **Enforce valid values via CHECK constraints:**
  
  **subscribers.status:**
  - `pending` - Initial state after signup
  - `confirmed` - Email confirmed via double opt-in
  - `unsubscribed` - User opted out
  - `bounced` - Email delivery failed permanently
  
  **consent_events.event_type:**
  - `signup` - Initial email capture
  - `confirm` - Email confirmation action
  - `unsubscribe` - User opt-out action
  
  **download_tokens.purpose:**
  - `confirm_and_download` - Token for initial email confirmation
  - `download_only` - Token for subsequent downloads (future use)

### AWS Infrastructure Requirements

#### AC1.6: Amazon S3 Bucket Configuration
- [ ] **S3 bucket created with specifications:**
  - Bucket name: `lightandshutter-lead-magnets`
  - Region: `eu-west-3` (Paris)
  - **Private bucket** - No public access allowed
  - CORS enabled for download requests
  - Lead magnet PDF uploaded to: `/lead-magnets/guide-mariee-sereine.pdf`
  
- [ ] **CORS Configuration:**
  ```json
  {
    "CORSRules": [
      {
        "AllowedOrigins": ["https://lightandshutter.fr"],
        "AllowedMethods": ["GET", "HEAD"],
        "AllowedHeaders": ["*"],
        "MaxAgeSeconds": 3000
      }
    ]
  }
  ```

#### AC1.7: Amazon SES Configuration
- [ ] **Email service configuration:**
  - Domain verified: `lightandshutter.fr`
  - From email verified: `etienne.maillot@lightandshutter.fr`
  - **Moved out of SES sandbox** (can send to any email address)
  
- [ ] **DNS Records Added:**
  - **SPF Record:** TXT record for domain verification
  - **DKIM Records:** Three CNAME records for email authentication
  - **MX Record:** Mail exchange record (if receiving emails)
  
- [ ] **Deliverability Target:**
  - Delivery rate: >98%
  - Bounce rate: <2%
  - Complaint rate: <0.1%

#### AC1.8: IAM User with Minimal Permissions
- [ ] **IAM user created with least-privilege access:**
  
  **Required Permissions:**
  ```json
  {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": ["s3:GetObject"],
        "Resource": "arn:aws:s3:::lightandshutter-lead-magnets/lead-magnets/*"
      },
      {
        "Effect": "Allow",
        "Action": ["ses:SendEmail", "ses:SendRawEmail"],
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
  
- [ ] **Security Requirements:**
  - Access keys stored in environment variables (never in code)
  - Keys rotated every 90 days
  - No root account usage
  - MFA enabled on IAM user account

### Environment Configuration

#### AC1.9: Environment Variables Documentation
- [ ] **All variables documented in `.env.example`:**
  ```env
  # AWS Configuration
  AWS_REGION=eu-west-3
  AWS_ACCESS_KEY_ID=xxx
  AWS_SECRET_ACCESS_KEY=xxx
  
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

- [ ] **Environment-specific values:**
  - Development: `BASE_URL=http://localhost:3000`
  - Staging: `BASE_URL=https://staging.lightandshutter.fr`
  - Production: `BASE_URL=https://lightandshutter.fr`

---

## 3. Complete Technical Implementation

### Full SQL Migration Script

**File:** `server/database/migrations/001_lead_magnet_schema.sql`

```sql
-- ============================================================================
-- Lead Magnet Delivery System - Database Schema
-- Epic: EPIC-LM-001
-- Story: LM-001
-- Created: 2026-02-02
-- ============================================================================

-- Enable UUID generation (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- TABLE 1: subscribers
-- Purpose: Main email list with subscriber state tracking
-- ============================================================================

CREATE TABLE subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','confirmed','unsubscribed','bounced')),
  source TEXT,  -- e.g., 'lead_magnet_form', 'landing_page_a', 'blog_post_123'
  tags JSONB,   -- Flexible tagging: {"interests": ["wedding", "photo"], "campaign": "spring2026"}
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  last_email_sent_at TIMESTAMPTZ
);

-- Indexes for subscribers
CREATE UNIQUE INDEX idx_subscribers_email_lower ON subscribers(LOWER(email));
CREATE INDEX idx_subscribers_status ON subscribers(status);
CREATE INDEX idx_subscribers_created_at ON subscribers(created_at DESC);

-- Comments for documentation
COMMENT ON TABLE subscribers IS 'Email list with subscriber lifecycle tracking';
COMMENT ON COLUMN subscribers.email IS 'Email address - stored as-is but indexed case-insensitive';
COMMENT ON COLUMN subscribers.status IS 'Lifecycle: pending → confirmed | unsubscribed | bounced';
COMMENT ON COLUMN subscribers.source IS 'UTM source or form identifier for attribution';
COMMENT ON COLUMN subscribers.tags IS 'Flexible JSONB field for segmentation';

-- ============================================================================
-- TABLE 2: consent_events
-- Purpose: RGPD-compliant audit log (immutable, append-only)
-- ============================================================================

CREATE TABLE consent_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('signup','confirm','unsubscribe')),
  consent_text TEXT,                -- Exact consent checkbox text at time of signup
  privacy_policy_version TEXT,      -- e.g., '2026-02-01' for audit trail
  ip INET,                          -- IP address of the user
  user_agent TEXT,                  -- Browser user agent string
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for consent_events
CREATE INDEX idx_consent_events_subscriber ON consent_events(subscriber_id, occurred_at DESC);

-- Comments for documentation
COMMENT ON TABLE consent_events IS 'RGPD audit log - immutable record of all consent actions';
COMMENT ON COLUMN consent_events.consent_text IS 'Exact consent text shown to user (for legal proof)';
COMMENT ON COLUMN consent_events.privacy_policy_version IS 'Policy version at time of consent';
COMMENT ON COLUMN consent_events.ip IS 'User IP address for compliance and fraud detection';

-- ============================================================================
-- TABLE 3: download_tokens
-- Purpose: Access control for lead magnet downloads
-- ============================================================================

CREATE TABLE download_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,                    -- SHA-256 hash of the actual token
  purpose TEXT NOT NULL CHECK (purpose IN ('confirm_and_download','download_only')),
  expires_at TIMESTAMPTZ NOT NULL,                    -- 48 hours from creation
  max_uses INT NOT NULL DEFAULT 999,                  -- Allow re-downloads (effectively unlimited)
  use_count INT NOT NULL DEFAULT 0,                   -- Track actual usage
  used_at TIMESTAMPTZ,                                -- First use timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for download_tokens
CREATE INDEX idx_download_tokens_subscriber ON download_tokens(subscriber_id, created_at DESC);
CREATE INDEX idx_download_tokens_expires ON download_tokens(expires_at) 
  WHERE use_count < max_uses;  -- Partial index for active tokens only

-- Comments for documentation
COMMENT ON TABLE download_tokens IS 'Access tokens for lead magnet downloads with expiration';
COMMENT ON COLUMN download_tokens.token_hash IS 'SHA-256 hash of token - never store plain token';
COMMENT ON COLUMN download_tokens.purpose IS 'confirm_and_download for initial email, download_only for subsequent';
COMMENT ON COLUMN download_tokens.expires_at IS 'Token expires 48 hours after creation';
COMMENT ON COLUMN download_tokens.max_uses IS 'Set to 999 for reusable tokens within 48h window';
COMMENT ON COLUMN download_tokens.use_count IS 'Increment on each download for analytics';
COMMENT ON COLUMN download_tokens.used_at IS 'Timestamp of FIRST download (not updated on re-downloads)';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify table creation
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('subscribers', 'consent_events', 'download_tokens')
ORDER BY table_name;

-- Verify indexes
SELECT 
  tablename, 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename IN ('subscribers', 'consent_events', 'download_tokens')
ORDER BY tablename, indexname;

-- Verify foreign key constraints
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('consent_events', 'download_tokens')
ORDER BY tc.table_name;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
```

### Testing Verification Script

**File:** `server/database/migrations/001_lead_magnet_schema_test.sql`

```sql
-- ============================================================================
-- Test Script for Lead Magnet Schema
-- ============================================================================

BEGIN;

-- Test 1: Insert a subscriber
INSERT INTO subscribers (email, status, source)
VALUES ('test@example.com', 'pending', 'test_suite')
RETURNING id, email, status, created_at;

-- Test 2: Insert consent event (should work with valid subscriber_id)
WITH sub AS (
  SELECT id FROM subscribers WHERE email = 'test@example.com'
)
INSERT INTO consent_events (subscriber_id, event_type, consent_text, privacy_policy_version, ip)
SELECT id, 'signup', 'Test consent', '2026-02-01', '127.0.0.1'::inet
FROM sub
RETURNING id, subscriber_id, event_type;

-- Test 3: Insert download token
WITH sub AS (
  SELECT id FROM subscribers WHERE email = 'test@example.com'
)
INSERT INTO download_tokens (subscriber_id, token_hash, purpose, expires_at)
SELECT 
  id, 
  'test_hash_' || gen_random_uuid()::text,
  'confirm_and_download',
  NOW() + INTERVAL '48 hours'
FROM sub
RETURNING id, subscriber_id, expires_at;

-- Test 4: Verify cascade deletion
DELETE FROM subscribers WHERE email = 'test@example.com';

-- Verify all related records deleted
SELECT COUNT(*) AS remaining_consent_events FROM consent_events 
WHERE subscriber_id IN (SELECT id FROM subscribers WHERE email = 'test@example.com');

SELECT COUNT(*) AS remaining_tokens FROM download_tokens 
WHERE subscriber_id IN (SELECT id FROM subscribers WHERE email = 'test@example.com');

-- Test 5: Verify unique email constraint (case-insensitive)
INSERT INTO subscribers (email, status) VALUES ('Test@Example.COM', 'pending');
-- Should succeed (first insertion)

INSERT INTO subscribers (email, status) VALUES ('test@example.com', 'pending');
-- Should FAIL with unique constraint violation

ROLLBACK;  -- Rollback all test data

SELECT 'All tests completed - check results above' AS test_status;
```

---

## 4. Epic-Level Context

### Business Objectives

1. **Generate Qualified Leads**
   - Target audience: Engaged couples planning weddings
   - Lead magnet: "Guide de la Mariée Sereine" (wedding photography planning guide)
   - Quality over quantity: Focus on serious prospects

2. **Build RGPD-Compliant Email List**
   - Legal requirement for EU operations
   - Provable consent with audit trail
   - Right to be forgotten implementation
   - Transparent data practices

3. **Measure Funnel Performance**
   - Track conversion at each stage
   - Identify bottlenecks and friction points
   - Data-driven optimization decisions

4. **Protect Premium Content**
   - Time-limited access via signed URLs
   - Prevent unauthorized sharing
   - Track actual usage vs. requests

5. **Enable Marketing Automation**
   - Foundation for nurture sequences (future phase)
   - Segmentation by behavior and engagement
   - Personalized follow-up campaigns

### Complete Database Schema Design

#### Table 1: `subscribers` - The Email List

**Purpose:** Central table tracking subscriber lifecycle from initial capture through confirmation, engagement, and potential unsubscribe.

**Columns:**
- `id` (UUID, PK) - Unique subscriber identifier
- `email` (TEXT, NOT NULL) - Email address (stored as provided, indexed lowercase)
- `status` (TEXT, NOT NULL) - Lifecycle state: `pending`, `confirmed`, `unsubscribed`, `bounced`
- `source` (TEXT, nullable) - Attribution tracking (e.g., `landing_page_a`, `blog_post_123`)
- `tags` (JSONB, nullable) - Flexible segmentation data
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()) - Initial signup timestamp
- `confirmed_at` (TIMESTAMPTZ, nullable) - When email was confirmed
- `unsubscribed_at` (TIMESTAMPTZ, nullable) - When user opted out
- `last_email_sent_at` (TIMESTAMPTZ, nullable) - For send frequency management

**Indexes:**
1. `idx_subscribers_email_lower` - UNIQUE on LOWER(email) for case-insensitive lookups
2. `idx_subscribers_status` - For filtering by subscriber state
3. `idx_subscribers_created_at` - For time-based queries (DESC for recent-first)

**Constraints:**
- CHECK: `status IN ('pending','confirmed','unsubscribed','bounced')`
- UNIQUE: Email (case-insensitive via index)

**Business Rules:**
- Initial state is always `pending`
- Transition to `confirmed` only via email confirmation
- Once `confirmed`, can move to `unsubscribed` or `bounced`
- Email normalization: lowercase, trimmed before storage
- Duplicate prevention: Same email cannot be `pending` multiple times

#### Table 2: `consent_events` - RGPD Audit Log

**Purpose:** Immutable, append-only log of all consent-related actions for legal compliance and auditing.

**Columns:**
- `id` (UUID, PK) - Unique event identifier
- `subscriber_id` (UUID, FK → subscribers.id, CASCADE) - Links to subscriber
- `event_type` (TEXT, NOT NULL) - Action type: `signup`, `confirm`, `unsubscribe`
- `consent_text` (TEXT, nullable) - Exact consent text shown to user
- `privacy_policy_version` (TEXT, nullable) - Policy version at time of consent
- `ip` (INET, nullable) - User's IP address
- `user_agent` (TEXT, nullable) - Browser/device information
- `occurred_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()) - Event timestamp

**Indexes:**
1. `idx_consent_events_subscriber` - Compound index on (subscriber_id, occurred_at DESC)

**Constraints:**
- CHECK: `event_type IN ('signup','confirm','unsubscribe')`
- FOREIGN KEY: subscriber_id → subscribers.id ON DELETE CASCADE

**Business Rules:**
- **Never update or delete** - append-only table
- Each signup generates one `signup` event with full context
- Email confirmation generates one `confirm` event
- Unsubscribe action generates one `unsubscribe` event
- Capture exact consent text for legal proof
- Store IP and user agent for fraud detection and compliance

**RGPD Compliance:**
- Provides proof of consent for regulatory audits
- Shows exactly what user agreed to and when
- Tracks user agent and IP for fraud prevention
- Cascade deletion ensures Right to be Forgotten

#### Table 3: `download_tokens` - Access Control

**Purpose:** Manage time-limited, secure access to lead magnet downloads with usage tracking.

**Columns:**
- `id` (UUID, PK) - Unique token identifier
- `subscriber_id` (UUID, FK → subscribers.id, CASCADE) - Links to subscriber
- `token_hash` (TEXT, NOT NULL, UNIQUE) - SHA-256 hash of actual token
- `purpose` (TEXT, NOT NULL) - Token type: `confirm_and_download`, `download_only`
- `expires_at` (TIMESTAMPTZ, NOT NULL) - Token expiration (typically NOW() + 48 hours)
- `max_uses` (INT, NOT NULL, DEFAULT 999) - Maximum allowed uses (999 = effectively unlimited)
- `use_count` (INT, NOT NULL, DEFAULT 0) - Actual usage counter
- `used_at` (TIMESTAMPTZ, nullable) - Timestamp of FIRST download
- `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW()) - Token generation timestamp

**Indexes:**
1. `idx_download_tokens_subscriber` - Compound index on (subscriber_id, created_at DESC)
2. `idx_download_tokens_expires` - Partial index on expires_at WHERE use_count < max_uses

**Constraints:**
- CHECK: `purpose IN ('confirm_and_download','download_only')`
- UNIQUE: token_hash (prevents token collision)
- FOREIGN KEY: subscriber_id → subscribers.id ON DELETE CASCADE

**Business Rules:**
- **Security:** Store SHA-256 hash, never plain token
- **Lifespan:** 48 hours from creation (configurable)
- **Reusability:** Same token can be used multiple times within 48h window
- **First Use:** `used_at` timestamp set on first download, never updated
- **Usage Tracking:** `use_count` incremented on every download
- **Purpose Types:**
  - `confirm_and_download`: Initial confirmation email token
  - `download_only`: Future use for re-download requests

**Token Security Pattern:**
```typescript
// Generation
const token = crypto.randomBytes(32).toString('base64url');  // 43 chars, URL-safe
const hash = crypto.createHash('sha256').update(token).digest('hex');

// Storage
INSERT INTO download_tokens (token_hash, ...) VALUES (hash, ...);

// Validation
const providedHash = crypto.createHash('sha256').update(providedToken).digest('hex');
SELECT * FROM download_tokens WHERE token_hash = providedHash;
```

### AWS Infrastructure Requirements

#### Amazon S3 Configuration

**Bucket Specifications:**
- **Name:** `lightandshutter-lead-magnets`
- **Region:** `eu-west-3` (Paris, France) - RGPD compliance, low latency for EU users
- **Access:** Private (no public ACLs or policies)
- **Versioning:** Enabled (recommended for content updates)
- **Encryption:** AES-256 (S3 managed keys)

**Folder Structure:**
```
lightandshutter-lead-magnets/
├── lead-magnets/
│   ├── guide-mariee-sereine.pdf
│   ├── guide-mariee-sereine-v2.pdf (future versions)
│   └── checklist-photo-mariage.pdf (future lead magnets)
└── temp/ (optional, for dynamic PDF generation)
```

**File Requirements:**
- **File:** `guide-mariee-sereine.pdf`
- **Max Size:** 5 MB (for fast downloads on mobile)
- **Optimization:** Compressed, web-optimized PDF
- **Content-Type:** `application/pdf`
- **Content-Disposition:** `attachment; filename="guide-mariee-sereine.pdf"`

**CORS Configuration:**
```json
[
  {
    "AllowedOrigins": ["https://lightandshutter.fr", "https://www.lightandshutter.fr"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3000,
    "ExposeHeaders": ["ETag"]
  }
]
```

**Lifecycle Policy (Optional):**
```json
{
  "Rules": [
    {
      "Id": "DeleteOldVersions",
      "Status": "Enabled",
      "NoncurrentVersionExpiration": {
        "NoncurrentDays": 90
      }
    }
  ]
}
```

**Signed URL Pattern:**
```typescript
// Expires in 15 minutes (900 seconds)
const signedUrl = await getSignedUrl(s3Client, getObjectCommand, {
  expiresIn: 900
});
// Result: https://lightandshutter-lead-magnets.s3.eu-west-3.amazonaws.com/lead-magnets/guide-mariee-sereine.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=...&X-Amz-Expires=900...
```

#### Amazon SES Configuration

**Domain Verification:**
- **Domain:** `lightandshutter.fr`
- **Verification Method:** DNS TXT record
- **Status:** Must be "verified" before sending

**Email Identity:**
- **From Email:** `etienne.maillot@lightandshutter.fr`
- **From Name:** "Etienne Maillot - Light & Shutter"
- **Reply-To:** Same as From (or separate support email)

**DNS Records Required:**

1. **SPF Record (TXT):**
   ```
   Name: lightandshutter.fr
   Type: TXT
   Value: "v=spf1 include:amazonses.com ~all"
   ```

2. **DKIM Records (3x CNAME):**
   ```
   Name: [token1]._domainkey.lightandshutter.fr
   Type: CNAME
   Value: [token1].dkim.amazonses.com
   
   Name: [token2]._domainkey.lightandshutter.fr
   Type: CNAME
   Value: [token2].dkim.amazonses.com
   
   Name: [token3]._domainkey.lightandshutter.fr
   Type: CNAME
   Value: [token3].dkim.amazonses.com
   ```

3. **DMARC Record (Optional but Recommended):**
   ```
   Name: _dmarc.lightandshutter.fr
   Type: TXT
   Value: "v=DMARC1; p=quarantine; rua=mailto:dmarc@lightandshutter.fr"
   ```

**Sandbox vs. Production:**
- **Sandbox:** Can only send to verified emails (testing)
- **Production:** Can send to any email address
- **Request Production Access:** Via AWS Support case
  - Requires: Website URL, use case description, bounce handling plan

**Sending Limits:**
- **Initial:** 200 emails/day, 1 email/second
- **Increased:** Request via AWS Support (typically approved within 24 hours)
- **Target:** 1,000 emails/day (sufficient for initial launch)

**Bounce and Complaint Handling:**
- Set up SNS topics for bounce/complaint notifications
- Implement webhook to update subscriber status to `bounced`
- Maintain <5% bounce rate to avoid suspension

#### IAM Configuration

**IAM User:**
- **Name:** `lightandshutter-lead-magnet-app`
- **Access Type:** Programmatic access (access key + secret key)
- **MFA:** Required for console access (if enabled)

**Minimal IAM Policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3LeadMagnetReadOnly",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:GetObjectVersion"
      ],
      "Resource": "arn:aws:s3:::lightandshutter-lead-magnets/lead-magnets/*"
    },
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
    },
    {
      "Sid": "SESEmailReputation",
      "Effect": "Allow",
      "Action": [
        "ses:GetSendQuota",
        "ses:GetSendStatistics"
      ],
      "Resource": "*"
    }
  ]
}
```

**Security Best Practices:**
1. Never commit access keys to version control
2. Store keys in environment variables only
3. Rotate keys every 90 days
4. Use separate IAM users for dev/staging/production
5. Enable CloudTrail logging for audit trail
6. Set up billing alerts for unexpected AWS costs

### RGPD Compliance Requirements

#### Legal Framework

**Regulation:** GDPR (General Data Protection Regulation) - EU Regulation 2016/679  
**Scope:** Applies to all processing of personal data of EU residents  
**Personal Data Collected:** Email addresses, IP addresses, user agents, consent timestamps

#### Compliance Pillars

**1. Lawful Basis for Processing**
- **Basis:** Consent (GDPR Article 6(1)(a))
- **Requirement:** Clear, affirmative action by user
- **Implementation:** Checkbox must be actively checked (not pre-checked)
- **Evidence:** Consent text and timestamp stored in `consent_events`

**2. Transparency**
- **Requirement:** Clear information about data usage before collection
- **Implementation:**
  - Privacy policy link on signup form
  - Clear consent text: "J'accepte de recevoir des emails de Light & Shutter"
  - Purpose stated: Lead magnet delivery and marketing communications

**3. Data Minimization**
- **Requirement:** Collect only data necessary for stated purpose
- **Implementation:**
  - Only required field: email address
  - Optional: name (future enhancement)
  - Technical data: IP, user agent (for fraud detection and compliance)

**4. Storage Limitation**
- **Requirement:** Data kept only as long as necessary
- **Implementation:**
  - Active subscribers: Retained indefinitely while engaged
  - Unsubscribed: Consider deletion after 1-2 years
  - Bounced: Deletion after 30 days
  - Recommendation: Implement data retention policy

**5. Right to Access (GDPR Article 15)**
- **Requirement:** User can request copy of their data
- **Implementation:**
  ```sql
  -- Retrieve all data for a subscriber
  SELECT * FROM subscribers WHERE email = 'user@example.com';
  SELECT * FROM consent_events WHERE subscriber_id = (SELECT id FROM subscribers WHERE email = 'user@example.com');
  SELECT * FROM download_tokens WHERE subscriber_id = (SELECT id FROM subscribers WHERE email = 'user@example.com');
  ```

**6. Right to Erasure / Right to be Forgotten (GDPR Article 17)**
- **Requirement:** User can request complete deletion of their data
- **Implementation:**
  ```sql
  -- Delete subscriber and all related data (cascades to consent_events and download_tokens)
  DELETE FROM subscribers WHERE email = 'user@example.com';
  ```
- **Technical:** `ON DELETE CASCADE` ensures complete removal
- **Exceptions:** May retain anonymized data for analytics (no personal identifiers)

**7. Data Security (GDPR Article 32)**
- **Requirement:** Appropriate technical and organizational measures
- **Implementation:**
  - HTTPS only (TLS 1.2+)
  - Database access restricted by IP/VPN
  - Token hashing (SHA-256) for security
  - Access keys in environment variables, never in code
  - Regular security updates and patches

**8. Accountability (GDPR Article 24)**
- **Requirement:** Demonstrate compliance
- **Implementation:**
  - Immutable `consent_events` log
  - Record of privacy policy versions
  - Documentation of data processing activities
  - This epic documentation serves as processing record

#### Consent Requirements

**Valid Consent Must Be:**
1. **Freely Given** - No coercion or penalty for refusal
2. **Specific** - Purpose clearly stated
3. **Informed** - User knows what they're agreeing to
4. **Unambiguous** - Clear affirmative action required
5. **Withdrawable** - Easy unsubscribe process (future implementation)

**Our Implementation:**
```typescript
const consentData = {
  email: 'user@example.com',
  consentGiven: true,  // User actively checked checkbox
  consentText: "J'accepte de recevoir des emails de Light & Shutter",
  privacyPolicyVersion: '2026-02-01',
  ip: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
  timestamp: '2026-02-02T14:30:00Z'
};
```

**Privacy Policy Must Include:**
- Data controller identity (Light & Shutter)
- Contact information
- Purpose of processing
- Legal basis (consent)
- Data retention period
- User rights (access, erasure, portability)
- Right to withdraw consent
- Right to lodge complaint with supervisory authority

### Token Security Patterns

#### Token Generation

**Requirements:**
- **Entropy:** Minimum 128 bits (cryptographically secure)
- **Format:** URL-safe (no special characters that need encoding)
- **Uniqueness:** Collision probability negligible
- **Unpredictability:** Not guessable or brute-forceable

**Implementation:**
```typescript
import crypto from 'crypto';

// Generate 32 random bytes = 256 bits of entropy
const randomBytes = crypto.randomBytes(32);

// Convert to URL-safe base64 (43 characters, no padding)
const token = randomBytes.toString('base64url');

// Example output: "Xk7_TnPq2vB8fY4jD9eR1sW6mL3hN0pA5uK8iQ4tC7o"
```

**Why base64url?**
- URL-safe (no `+`, `/`, `=` that need escaping)
- Compact representation
- Standard format widely supported

#### Token Storage

**Security Principle:** Never store plaintext tokens in database (same as never storing plaintext passwords)

**Hashing Algorithm:** SHA-256
- **Output:** 64-character hexadecimal string
- **Collision Resistance:** 2^256 possible hashes
- **One-Way:** Cannot reverse hash to get original token

**Implementation:**
```typescript
// Generate token and hash
const token = crypto.randomBytes(32).toString('base64url');
const hash = crypto.createHash('sha256').update(token).digest('hex');

// Store hash in database
await db.query(
  'INSERT INTO download_tokens (token_hash, ...) VALUES ($1, ...)',
  [hash, ...]
);

// Return token to user (via email link)
const confirmUrl = `https://lightandshutter.fr/api/lead-magnet/confirm/${token}`;
```

**Validation:**
```typescript
// User provides token via URL parameter
const providedToken = req.params.token;

// Hash the provided token
const providedHash = crypto.createHash('sha256').update(providedToken).digest('hex');

// Look up in database
const result = await db.query(
  'SELECT * FROM download_tokens WHERE token_hash = $1',
  [providedHash]
);

// If found and not expired, grant access
if (result.rows.length > 0 && new Date(result.rows[0].expires_at) > new Date()) {
  // Valid token
}
```

#### Token Expiration Strategy

**Primary Expiration:** 48-hour window
- **Rationale:**
  - User might not check email immediately
  - Allows time for user to find email if lost
  - Long enough for convenience, short enough for security

**Implementation:**
```sql
-- Set expiration when creating token
INSERT INTO download_tokens (expires_at, ...)
VALUES (NOW() + INTERVAL '48 hours', ...);

-- Check expiration when validating
SELECT * FROM download_tokens 
WHERE token_hash = $1 
  AND expires_at > NOW()
  AND use_count < max_uses;
```

**Expired Token Handling:**
1. User clicks expired link
2. System detects `expires_at < NOW()`
3. Redirect to `/lead-magnet/expire` page
4. Offer form to request new token
5. Generate fresh token with new 48-hour window
6. Old token remains expired (not renewed)

#### Reusability Pattern

**Business Requirement:** Allow re-downloads within 48-hour window

**Implementation:**
- `max_uses`: Set to 999 (effectively unlimited)
- `use_count`: Increment on each download
- `used_at`: Set on FIRST download only (never updated)

**Benefits:**
- User can download on multiple devices (phone, then laptop)
- User can re-download if file is lost
- Analytics: Track actual usage vs. access grants

**Usage Tracking:**
```sql
-- First download
UPDATE download_tokens 
SET use_count = 1, used_at = NOW() 
WHERE id = $1 AND used_at IS NULL;

-- Subsequent downloads
UPDATE download_tokens 
SET use_count = use_count + 1 
WHERE id = $1;
```

**Analytics Query:**
```sql
-- How many users re-download?
SELECT 
  COUNT(*) FILTER (WHERE use_count = 1) as single_download,
  COUNT(*) FILTER (WHERE use_count > 1) as multiple_downloads,
  AVG(use_count) as avg_downloads_per_user
FROM download_tokens
WHERE used_at IS NOT NULL;
```

#### Security Considerations

**Token Sharing Risk:**
- **Scenario:** User shares confirmation link with others
- **Mitigation:** Time-limited expiration (48h)
- **Acceptable:** For lead magnets, minor sharing is acceptable
- **Future:** For high-value content, consider one-time tokens

**Brute Force Protection:**
- **UUID Tokens:** 2^256 possible values (infeasible to brute force)
- **Rate Limiting:** Limit validation attempts per IP (future story LM-006)
- **Monitoring:** Alert on unusual patterns (many failed validations)

**Token Leakage Vectors:**
- **Email Forwarding:** User forwards confirmation email → token exposed
- **Email Provider:** Email stored on third-party servers
- **Mitigation:** Short expiration, monitoring

**Best Practices:**
1. Never log tokens (only hashes)
2. Use HTTPS only for token URLs
3. Clear token from URL after first use (JavaScript)
4. Consider adding rate limiting per token (max 10 validations/hour)

### Environment Configuration

**Development Environment:**
```env
# Development Configuration
NODE_ENV=development
BASE_URL=http://localhost:3000

# AWS (use sandbox SES for testing)
AWS_REGION=eu-west-3
AWS_ACCESS_KEY_ID=your_dev_key
AWS_SECRET_ACCESS_KEY=your_dev_secret
S3_BUCKET_NAME=lightandshutter-lead-magnets-dev
S3_FILE_KEY=lead-magnets/guide-mariee-sereine.pdf
SES_FROM_EMAIL=etienne.maillot@lightandshutter.fr

# Database (local)
DATABASE_URL=postgresql://postgres:password@localhost:5432/lightandshutter_dev
```

**Staging Environment:**
```env
# Staging Configuration
NODE_ENV=staging
BASE_URL=https://staging.lightandshutter.fr

# AWS (use production services with staging data)
AWS_REGION=eu-west-3
AWS_ACCESS_KEY_ID=your_staging_key
AWS_SECRET_ACCESS_KEY=your_staging_secret
S3_BUCKET_NAME=lightandshutter-lead-magnets-staging
S3_FILE_KEY=lead-magnets/guide-mariee-sereine.pdf
SES_FROM_EMAIL=etienne.maillot@lightandshutter.fr

# Database (staging instance)
DATABASE_URL=postgresql://user:password@staging-db.example.com:5432/lightandshutter_staging
```

**Production Environment:**
```env
# Production Configuration
NODE_ENV=production
BASE_URL=https://lightandshutter.fr

# AWS (production)
AWS_REGION=eu-west-3
AWS_ACCESS_KEY_ID=your_production_key
AWS_SECRET_ACCESS_KEY=your_production_secret
S3_BUCKET_NAME=lightandshutter-lead-magnets
S3_FILE_KEY=lead-magnets/guide-mariee-sereine.pdf
SES_FROM_EMAIL=etienne.maillot@lightandshutter.fr

# Database (production instance with replicas)
DATABASE_URL=postgresql://user:password@prod-db.example.com:5432/lightandshutter
DATABASE_URL_REPLICA=postgresql://user:password@prod-db-replica.example.com:5432/lightandshutter

# Monitoring (Sentry, New Relic, etc.)
SENTRY_DSN=https://...
NEW_RELIC_LICENSE_KEY=...
```

---

## 5. Cross-Story Dependencies

### What LM-002 Needs from LM-001

**Database Tables:**
1. `subscribers` table - For inserting new email signups
2. `consent_events` table - For logging RGPD consent
3. `download_tokens` table - For generating confirmation tokens

**Specific Dependencies:**
- Token generation and hashing functions (will use columns defined in LM-001)
- Email uniqueness constraint (case-insensitive index)
- Status enum values (`pending`, `confirmed`)
- Foreign key relationships for cascading operations

**AWS Infrastructure:**
- SES fully configured for sending emails
- Email templates can reference S3-hosted images (optional)
- SES sandbox mode exited for production sends

**Critical Path:**
LM-001 MUST be complete before LM-002 can begin development, as LM-002 requires:
- Database schema deployed
- AWS credentials configured
- Environment variables documented

### What LM-003 Needs from LM-001

**Database Tables:**
1. `download_tokens` table - For validating and tracking token usage
2. `subscribers` table - For updating confirmation status
3. `consent_events` table - For logging confirmation events

**Specific Dependencies:**
- Token hash storage and lookup mechanism
- `expires_at` column for expiration checking
- `use_count` and `used_at` columns for usage tracking
- Status update pattern (`pending` → `confirmed`)

**AWS Infrastructure:**
- S3 bucket configured with proper permissions
- IAM credentials for generating signed URLs
- CORS configuration for cross-origin downloads

**Critical Path:**
LM-001 provides the foundation for:
- Secure token validation
- S3 file delivery mechanism
- Usage analytics tracking

### What LM-004 Needs from LM-001

**Database Tables:**
All three tables for analytics queries:
1. `subscribers` - Funnel top (signups)
2. `consent_events` - Time-to-confirm analysis
3. `download_tokens` - Download completion tracking

**Specific Dependencies:**
- Indexes for query performance (especially on timestamps)
- `created_at`, `confirmed_at`, `used_at` timestamps
- Status values for filtering and aggregation

**Analytics Queries Enabled by LM-001:**
```sql
-- Funnel conversion
SELECT 
  COUNT(*) as signups,
  COUNT(*) FILTER (WHERE status='confirmed') as confirmed,
  COUNT(DISTINCT dt.subscriber_id) FILTER (WHERE dt.used_at IS NOT NULL) as downloaded
FROM subscribers s
LEFT JOIN download_tokens dt ON dt.subscriber_id = s.id;

-- Time-to-confirm distribution
SELECT 
  EXTRACT(EPOCH FROM (confirmed_at - created_at))/3600 as hours_to_confirm
FROM subscribers
WHERE confirmed_at IS NOT NULL
ORDER BY hours_to_confirm;

-- Download usage patterns
SELECT 
  use_count,
  COUNT(*) as num_users
FROM download_tokens
WHERE used_at IS NOT NULL
GROUP BY use_count
ORDER BY use_count;
```

### Database Patterns for Future Stories

**Pattern 1: Subscriber Lifecycle Tracking**
```sql
-- Query: Find subscribers at each stage
SELECT status, COUNT(*) 
FROM subscribers 
GROUP BY status;

-- Pattern used in: LM-002, LM-003, LM-004
```

**Pattern 2: Token Expiration Management**
```sql
-- Query: Find expired but unused tokens
SELECT s.email, dt.created_at, dt.expires_at
FROM download_tokens dt
JOIN subscribers s ON s.id = dt.subscriber_id
WHERE dt.expires_at < NOW()
  AND dt.use_count = 0;

-- Pattern used in: LM-003, LM-006
```

**Pattern 3: RGPD Audit Trail**
```sql
-- Query: Get full consent history for user
SELECT 
  s.email,
  ce.event_type,
  ce.consent_text,
  ce.occurred_at,
  ce.ip
FROM subscribers s
JOIN consent_events ce ON ce.subscriber_id = s.id
WHERE s.email = 'user@example.com'
ORDER BY ce.occurred_at;

-- Pattern used in: LM-002, RGPD data access requests
```

**Pattern 4: Cascading Deletion (RGPD Right to be Forgotten)**
```sql
-- Single delete removes all related data
DELETE FROM subscribers WHERE email = 'user@example.com';
-- Automatically deletes:
-- - All consent_events for this subscriber
-- - All download_tokens for this subscriber

-- Pattern used in: Future unsubscribe management, data deletion requests
```

---

## 6. Technical Specifications

### PostgreSQL Version and Features

**Minimum Version:** PostgreSQL 12+  
**Recommended:** PostgreSQL 14+ for best performance

**Features Used:**

**1. UUID Generation**
```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- Provides gen_random_uuid() function
-- Alternative: Use "uuid-ossp" extension with uuid_generate_v4()
```

**2. TIMESTAMPTZ (Timestamp with Time Zone)**
- Stores timestamps in UTC
- Displays in session timezone
- Best practice for multi-timezone applications
- Critical for accurate analytics

**3. JSONB Data Type**
```sql
tags JSONB
-- Binary JSON storage, faster queries than JSON
-- Supports indexing: CREATE INDEX idx_tags ON subscribers USING GIN (tags);
-- Query example: WHERE tags @> '{"interests": ["wedding"]}'
```

**4. INET Data Type**
```sql
ip INET
-- Native IP address storage (supports IPv4 and IPv6)
-- Efficient storage and comparison
-- Query example: WHERE ip << INET '192.168.1.0/24'
```

**5. CHECK Constraints**
```sql
CHECK (status IN ('pending','confirmed','unsubscribed','bounced'))
-- Ensures data integrity at database level
-- Better than application-level validation alone
```

**6. Partial Indexes**
```sql
CREATE INDEX idx_download_tokens_expires 
ON download_tokens(expires_at) 
WHERE use_count < max_uses;
-- Indexes only active tokens, reducing index size
-- Improves query performance for token validation
```

**7. Aggregate FILTER Clause**
```sql
COUNT(*) FILTER (WHERE status = 'confirmed')
-- PostgreSQL 9.4+ feature
-- More readable than CASE statements
-- Used extensively in analytics queries
```

**8. Foreign Key Cascade**
```sql
REFERENCES subscribers(id) ON DELETE CASCADE
-- Automatically deletes child records when parent is deleted
-- Essential for RGPD Right to be Forgotten
```

**Performance Considerations:**
- **Connection Pooling:** Use PgBouncer or similar (already in infrastructure)
- **Read Replicas:** Consider for analytics queries (future scaling)
- **Vacuum Strategy:** Auto-vacuum configured for append-heavy `consent_events`
- **Index Maintenance:** Regular `REINDEX` on high-churn tables

### AWS Region and Service Configurations

#### AWS Region: eu-west-3 (Paris)

**Selection Rationale:**
- **RGPD Compliance:** Data stored in EU jurisdiction
- **Latency:** Closest to primary user base (France)
- **Availability:** Full service availability (S3, SES, EC2, RDS)
- **Cost:** Competitive pricing for EU region

**Service Availability in eu-west-3:**
- ✅ S3 (Simple Storage Service)
- ✅ SES (Simple Email Service) - Available since 2019
- ✅ EC2 (Elastic Compute Cloud)
- ✅ RDS (Relational Database Service) - PostgreSQL
- ✅ CloudWatch (Monitoring and Logging)
- ✅ IAM (Identity and Access Management) - Global service

**Alternative Regions (if needed):**
- `eu-west-1` (Ireland) - Larger availability zone, more services
- `eu-central-1` (Frankfurt) - Central European location

#### S3 Service Configuration

**Storage Class:** STANDARD
- **Use Case:** Frequently accessed objects (lead magnet PDF)
- **Durability:** 99.999999999% (11 nines)
- **Availability:** 99.99%
- **Cost:** ~€0.023 per GB/month

**Transfer Acceleration:** Not required
- **Reason:** Users are primarily in France/EU
- **Alternative:** CloudFront CDN (future optimization)

**Versioning:** Enabled
- **Purpose:** Maintain PDF version history
- **Lifecycle:** Delete old versions after 90 days

**Object Lock:** Not required
- **Reason:** No compliance need for immutable storage

**Monitoring:**
- CloudWatch metrics: GET requests, 4xx/5xx errors, bytes downloaded
- Budget alert: Notify if monthly costs exceed €10

#### SES Service Configuration

**Sending Method:** SMTP or API
- **Recommended:** AWS SDK (API) for better error handling
- **Alternative:** SMTP (port 587 with STARTTLS)

**Configuration Set:**
- **Name:** `lead-magnet-emails`
- **Purpose:** Track opens, clicks, bounces, complaints
- **SNS Topics:**
  - `ses-bounces` → Update subscriber status to `bounced`
  - `ses-complaints` → Update subscriber status to `unsubscribed`
  - `ses-deliveries` → Log successful deliveries (optional)

**Sending Quota:**
- **Initial:** 200 emails/day, 1 email/second
- **Request Increase:** Support case for 1,000/day after account review
- **Monitor:** CloudWatch metric `NumberOfMessagesSent`

**Reputation Monitoring:**
```typescript
// Check sending quota and reputation
import { SESClient, GetSendQuotaCommand, GetSendStatisticsCommand } from '@aws-sdk/client-ses';

const sesClient = new SESClient({ region: 'eu-west-3' });

// Get current quota
const quotaCommand = new GetSendQuotaCommand({});
const quota = await sesClient.send(quotaCommand);
console.log('Max24HourSend:', quota.Max24HourSend);
console.log('SentLast24Hours:', quota.SentLast24Hours);

// Get bounce/complaint rates
const statsCommand = new GetSendStatisticsCommand({});
const stats = await sesClient.send(statsCommand);
// Monitor: Keep bounce rate < 5%, complaint rate < 0.1%
```

**Email Authentication:**
- **SPF:** Allows Amazon SES to send on behalf of domain
- **DKIM:** Proves email hasn't been tampered with
- **DMARC:** Instructs receivers how to handle failures
- **Result:** High deliverability (>98%) and inbox placement

#### Security Patterns

**AWS Credential Management:**
```typescript
// ✅ CORRECT: Credentials from environment
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

// ❌ WRONG: Hardcoded credentials
const s3Client = new S3Client({
  region: 'eu-west-3',
  credentials: {
    accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
    secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
  }
});
```

**Least Privilege Access:**
- IAM user has ONLY the permissions needed
- No wildcard (`*`) resources in policies
- Condition restrictions (e.g., specific FROM email for SES)

**Secure Communication:**
- All AWS SDK calls use TLS 1.2+ encryption
- S3 signed URLs use HTTPS only
- SES enforces TLS for email transmission

**Audit Trail:**
- Enable CloudTrail logging for all API calls
- Log retention: 90 days minimum
- Monitor for unusual access patterns

**Cost Management:**
- Budget alerts set at €10/month threshold
- Monitor daily: S3 GET requests, SES sends
- Optimize: Compress PDFs, cache-control headers

---

## 7. Testing Requirements

### Database Migration Testing

**Test 1: Fresh Database Installation**
```bash
# Create test database
createdb lightandshutter_test

# Run migration
psql -U postgres -d lightandshutter_test -f server/database/migrations/001_lead_magnet_schema.sql

# Verify table creation
psql -U postgres -d lightandshutter_test -c "\dt"
# Expected output: subscribers, consent_events, download_tokens
```

**Test 2: Constraint Validation**
```sql
-- Test status enum constraint
INSERT INTO subscribers (email, status) VALUES ('test@example.com', 'invalid_status');
-- Expected: ERROR: new row for relation "subscribers" violates check constraint

-- Test unique email constraint (case-insensitive)
INSERT INTO subscribers (email, status) VALUES ('Test@Example.COM', 'pending');
INSERT INTO subscribers (email, status) VALUES ('test@example.com', 'pending');
-- Expected: ERROR: duplicate key value violates unique constraint
```

**Test 3: Cascading Deletes**
```sql
BEGIN;
-- Insert subscriber
INSERT INTO subscribers (id, email, status) 
VALUES ('123e4567-e89b-12d3-a456-426614174000', 'cascade@test.com', 'confirmed');

-- Insert related consent event
INSERT INTO consent_events (subscriber_id, event_type) 
VALUES ('123e4567-e89b-12d3-a456-426614174000', 'signup');

-- Insert related token
INSERT INTO download_tokens (subscriber_id, token_hash, purpose, expires_at) 
VALUES ('123e4567-e89b-12d3-a456-426614174000', 'test_hash', 'confirm_and_download', NOW() + INTERVAL '48 hours');

-- Delete subscriber
DELETE FROM subscribers WHERE id = '123e4567-e89b-12d3-a456-426614174000';

-- Verify cascaded deletes
SELECT COUNT(*) FROM consent_events WHERE subscriber_id = '123e4567-e89b-12d3-a456-426614174000';
-- Expected: 0

SELECT COUNT(*) FROM download_tokens WHERE subscriber_id = '123e4567-e89b-12d3-a456-426614174000';
-- Expected: 0

ROLLBACK;
```

**Test 4: Index Performance**
```sql
-- Test email lookup performance
EXPLAIN ANALYZE 
SELECT * FROM subscribers WHERE LOWER(email) = 'test@example.com';
-- Expected: Index Scan using idx_subscribers_email_lower

-- Test token hash lookup performance
EXPLAIN ANALYZE 
SELECT * FROM download_tokens WHERE token_hash = 'abc123...';
-- Expected: Index Scan using download_tokens_token_hash_key

-- Test token expiration query
EXPLAIN ANALYZE 
SELECT * FROM download_tokens 
WHERE expires_at > NOW() AND use_count < max_uses;
-- Expected: Index Scan using idx_download_tokens_expires (partial index)
```

### AWS Infrastructure Testing

**Test 1: S3 Bucket Access**
```bash
# Upload test file
aws s3 cp test-file.pdf s3://lightandshutter-lead-magnets/lead-magnets/test-file.pdf --region eu-west-3

# Verify upload
aws s3 ls s3://lightandshutter-lead-magnets/lead-magnets/ --region eu-west-3

# Test download (should fail - private bucket)
curl https://lightandshutter-lead-magnets.s3.eu-west-3.amazonaws.com/lead-magnets/test-file.pdf
# Expected: Access Denied

# Clean up
aws s3 rm s3://lightandshutter-lead-magnets/lead-magnets/test-file.pdf --region eu-west-3
```

**Test 2: S3 Signed URL Generation**
```typescript
// Test script: test-s3-signed-url.ts
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({ region: 'eu-west-3' });

const command = new GetObjectCommand({
  Bucket: 'lightandshutter-lead-magnets',
  Key: 'lead-magnets/guide-mariee-sereine.pdf'
});

const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });
console.log('Signed URL:', signedUrl);

// Test URL in browser - should download PDF
// Wait 16 minutes - URL should expire
```

**Test 3: SES Email Delivery**
```typescript
// Test script: test-ses-email.ts
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const sesClient = new SESClient({ region: 'eu-west-3' });

const params = {
  Source: 'etienne.maillot@lightandshutter.fr',
  Destination: { ToAddresses: ['your-test-email@example.com'] },
  Message: {
    Subject: { Data: 'Test SES Configuration', Charset: 'UTF-8' },
    Body: {
      Text: { Data: 'This is a test email from Amazon SES.', Charset: 'UTF-8' },
      Html: { Data: '<p>This is a <strong>test email</strong> from Amazon SES.</p>', Charset: 'UTF-8' }
    }
  }
};

try {
  const result = await sesClient.send(new SendEmailCommand(params));
  console.log('Email sent successfully:', result.MessageId);
} catch (error) {
  console.error('Email sending failed:', error);
}
```

**Expected Results:**
- Email received within 60 seconds
- No bounces or errors
- Email displays correctly in Gmail, Outlook, Apple Mail

**Test 4: IAM Permissions**
```typescript
// Test minimal permissions - should succeed
await s3Client.send(new GetObjectCommand({ 
  Bucket: 'lightandshutter-lead-magnets', 
  Key: 'lead-magnets/guide-mariee-sereine.pdf' 
}));

// Test unauthorized action - should fail
await s3Client.send(new DeleteObjectCommand({ 
  Bucket: 'lightandshutter-lead-magnets', 
  Key: 'lead-magnets/guide-mariee-sereine.pdf' 
}));
// Expected: AccessDenied error
```

### Integration Testing

**Test 1: Full Signup Flow (Database)**
```sql
BEGIN;

-- Step 1: Insert subscriber
INSERT INTO subscribers (id, email, status, source, created_at)
VALUES ('test-123', 'integration@test.com', 'pending', 'test_suite', NOW())
RETURNING *;

-- Step 2: Insert consent event
INSERT INTO consent_events (subscriber_id, event_type, consent_text, privacy_policy_version, ip, occurred_at)
VALUES ('test-123', 'signup', 'Test consent', '2026-02-01', '127.0.0.1'::inet, NOW())
RETURNING *;

-- Step 3: Insert download token
INSERT INTO download_tokens (subscriber_id, token_hash, purpose, expires_at, created_at)
VALUES ('test-123', 'test_hash_123', 'confirm_and_download', NOW() + INTERVAL '48 hours', NOW())
RETURNING *;

-- Verify all records created
SELECT 
  s.email,
  s.status,
  ce.event_type,
  dt.token_hash
FROM subscribers s
JOIN consent_events ce ON ce.subscriber_id = s.id
JOIN download_tokens dt ON dt.subscriber_id = s.id
WHERE s.id = 'test-123';

ROLLBACK;
```

**Test 2: Token Validation Flow**
```sql
BEGIN;

-- Setup: Create subscriber and token
INSERT INTO subscribers (id, email, status) VALUES ('test-456', 'token@test.com', 'pending');
INSERT INTO download_tokens (id, subscriber_id, token_hash, purpose, expires_at, use_count, created_at)
VALUES ('token-1', 'test-456', 'valid_hash', 'confirm_and_download', NOW() + INTERVAL '48 hours', 0, NOW());

-- Simulate first download
UPDATE subscribers SET status = 'confirmed', confirmed_at = NOW() WHERE id = 'test-456';
UPDATE download_tokens SET use_count = 1, used_at = NOW() WHERE id = 'token-1';

-- Simulate second download (within 48h)
UPDATE download_tokens SET use_count = use_count + 1 WHERE id = 'token-1';

-- Verify state
SELECT 
  s.status,
  s.confirmed_at,
  dt.use_count,
  dt.used_at
FROM subscribers s
JOIN download_tokens dt ON dt.subscriber_id = s.id
WHERE s.id = 'test-456';
-- Expected: status='confirmed', use_count=2, used_at set only on first download

ROLLBACK;
```

### Performance Testing

**Test 1: Query Performance Under Load**
```sql
-- Insert 10,000 test subscribers
INSERT INTO subscribers (email, status, source, created_at)
SELECT 
  'user' || generate_series || '@test.com',
  CASE WHEN random() < 0.6 THEN 'confirmed' ELSE 'pending' END,
  'load_test',
  NOW() - (random() * INTERVAL '30 days')
FROM generate_series(1, 10000);

-- Test email lookup performance
EXPLAIN ANALYZE
SELECT * FROM subscribers WHERE LOWER(email) = 'user5000@test.com';
-- Expected: Execution time < 1ms with index

-- Test funnel query performance
EXPLAIN ANALYZE
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed
FROM subscribers;
-- Expected: Execution time < 50ms for 10k records

-- Clean up
DELETE FROM subscribers WHERE source = 'load_test';
```

### Manual QA Checklist

- [ ] Upload PDF to S3 bucket successfully
- [ ] Generate S3 signed URL and download PDF
- [ ] Send test email via SES to personal email
- [ ] Verify email received and displays correctly
- [ ] Run database migration on clean database
- [ ] Verify all tables and indexes created
- [ ] Test cascading deletion manually
- [ ] Check environment variables are documented
- [ ] Verify IAM permissions (can't delete S3 objects)
- [ ] Test database connection from application server
- [ ] Verify AWS credentials work from staging environment

---

## 8. Definition of Done Checklist

### Database Schema
- [ ] All three tables created: `subscribers`, `consent_events`, `download_tokens`
- [ ] All columns match specification exactly
- [ ] UUID primary keys on all tables
- [ ] All foreign keys configured with `ON DELETE CASCADE`
- [ ] All indexes created and tested
- [ ] All CHECK constraints enforce valid enum values
- [ ] Unique constraint on email (case-insensitive)
- [ ] Migration script runs successfully on fresh database
- [ ] Migration script is idempotent (can run multiple times safely)
- [ ] Test data can be inserted and queried successfully

### AWS Infrastructure
- [ ] S3 bucket created and configured as private
- [ ] CORS configuration added to S3 bucket
- [ ] Lead magnet PDF uploaded to S3
- [ ] S3 signed URL generation tested and working
- [ ] Amazon SES domain verified
- [ ] Amazon SES from email verified
- [ ] SES moved out of sandbox (production ready)
- [ ] SPF DNS record added and verified
- [ ] DKIM DNS records added and verified (all 3)
- [ ] DMARC DNS record added (optional but recommended)
- [ ] Test email sent successfully via SES
- [ ] Email received and displays correctly across clients

### IAM Security
- [ ] IAM user created with descriptive name
- [ ] IAM policy attached with minimal permissions
- [ ] Policy allows only required S3 actions
- [ ] Policy allows only required SES actions
- [ ] Policy restricts SES to specific FROM email
- [ ] Access keys generated
- [ ] Access keys stored securely (not in code)
- [ ] Attempted unauthorized action fails (verified)

### Environment Configuration
- [ ] `.env.example` file created/updated
- [ ] All required variables documented
- [ ] Variable descriptions provided
- [ ] Example values provided where appropriate
- [ ] Development environment values configured
- [ ] Staging environment values configured (if applicable)
- [ ] Production environment values configured (if applicable)
- [ ] Environment variables loaded correctly in application

### Code Quality
- [ ] Migration script follows SQL style guide
- [ ] SQL properly formatted and indented
- [ ] Comments added explaining business logic
- [ ] Table and column comments added for documentation
- [ ] No hardcoded values in SQL
- [ ] No SQL injection vulnerabilities

### Testing
- [ ] Migration tested on fresh database
- [ ] All constraints tested (valid and invalid data)
- [ ] Cascade deletion tested and working
- [ ] Index usage verified with EXPLAIN ANALYZE
- [ ] S3 access tested (upload, signed URL, download)
- [ ] SES email delivery tested
- [ ] IAM permissions tested (allowed and denied actions)
- [ ] Performance acceptable (queries < 100ms)

### Documentation
- [ ] Migration script documented with comments
- [ ] README updated with setup instructions
- [ ] Environment variable reference documented
- [ ] AWS resource names documented
- [ ] Known issues or limitations documented
- [ ] Rollback procedure documented (if needed)

### Deployment
- [ ] Migration script added to version control
- [ ] Migration script deployed to development environment
- [ ] Migration script deployed to staging environment (if applicable)
- [ ] Migration verified in staging environment
- [ ] AWS infrastructure created in production account
- [ ] Migration ready for production deployment
- [ ] Rollback tested (drop tables, recreate)

### Review and Approval
- [ ] Code review completed by peer
- [ ] Security review completed (credentials, permissions)
- [ ] All acceptance criteria validated
- [ ] Stakeholder approval obtained
- [ ] Ready for next story (LM-002) to begin

### Post-Deployment
- [ ] Database schema deployed successfully
- [ ] No errors in application logs
- [ ] AWS services operational
- [ ] Monitoring configured (CloudWatch alarms)
- [ ] Backup strategy confirmed
- [ ] Incident response plan documented

---

**Total Acceptance Criteria:** 9 (AC1.1 through AC1.9)  
**Total Definition of Done Items:** 80+  
**Estimated Completion:** When all items above are checked ✅

---

**Document Version:** 1.0  
**Last Updated:** 2026-02-02  
**Status:** Ready for Implementation  
**Next Action:** Begin database schema development

