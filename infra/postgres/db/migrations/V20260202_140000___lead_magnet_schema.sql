-- V20260202_140000___lead_magnet_schema.sql
-- Domain: B2C Lead Generation
-- Purpose: Create schema for lead magnet delivery system with double opt-in
--
-- Tables:
--   - lm_subscribers: Email list with subscriber state
--   - lm_consent_events: RGPD audit trail (append-only)
--   - lm_download_tokens: Token-based access control
--
-- Design Decisions:
--   - Uses 'public' schema with 'lm_' prefix (OVH managed PostgreSQL limitation)
--   - NO organisation_id (B2C system, not multi-tenant)
--   - ON DELETE CASCADE for RGPD right-to-be-forgotten compliance
--   - SHA-256 token hashing for security (no plain tokens stored)
--   - Immutable consent_events table (audit trail integrity)

-- ============================================================================
-- TABLE 1: lm_subscribers
-- ============================================================================
-- Purpose: The email list with subscriber lifecycle state
-- Status Flow: pending → confirmed → (optional) unsubscribed/bounced

CREATE TABLE IF NOT EXISTS public.lm_subscribers (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core Fields
  email TEXT NOT NULL,  -- Stored lowercase, trimmed
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'unsubscribed', 'bounced')),
  
  -- Metadata
  source TEXT,  -- e.g., 'landing_page', 'blog_post_A', 'instagram_bio'
  tags JSONB,   -- Flexible metadata: {"campaign": "spring_2026", "referrer": "..."}
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,        -- Set when status → confirmed
  unsubscribed_at TIMESTAMPTZ,     -- Set when status → unsubscribed
  last_email_sent_at TIMESTAMPTZ   -- For future rate limiting
);

-- Email must be unique (case-insensitive)
-- Index on LOWER(email) for efficient lookups
CREATE UNIQUE INDEX idx_lm_subscribers_email_lower 
  ON public.lm_subscribers(LOWER(email));

-- Index for filtering by status (e.g., active subscribers)
CREATE INDEX idx_lm_subscribers_status 
  ON public.lm_subscribers(status);

-- Index for date-range queries and analytics
CREATE INDEX idx_lm_subscribers_created_at 
  ON public.lm_subscribers(created_at DESC);

COMMENT ON TABLE public.lm_subscribers IS 'B2C email list with subscriber lifecycle state';
COMMENT ON COLUMN public.lm_subscribers.status IS 'pending: awaiting confirmation | confirmed: active subscriber | unsubscribed: user opted out | bounced: email invalid';
COMMENT ON COLUMN public.lm_subscribers.source IS 'Attribution tracking: where did this signup originate?';
COMMENT ON COLUMN public.lm_subscribers.tags IS 'Flexible JSONB metadata for future segmentation';

-- ============================================================================
-- TABLE 2: lm_consent_events
-- ============================================================================
-- Purpose: Immutable RGPD audit log proving consent was obtained
-- Event Types: signup (initial), confirm (verified), unsubscribe (revoked)

CREATE TABLE IF NOT EXISTS public.lm_consent_events (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Key (cascading delete for right-to-be-forgotten)
  subscriber_id UUID NOT NULL REFERENCES public.lm_subscribers(id) ON DELETE CASCADE,
  
  -- Event Details
  event_type TEXT NOT NULL CHECK (event_type IN ('signup', 'confirm', 'unsubscribe')),
  consent_text TEXT,  -- Exact checkbox text shown to user (e.g., "J'accepte de recevoir des emails...")
  privacy_policy_version TEXT,  -- e.g., "2026-02-01" to track which policy they agreed to
  
  -- Request Context (RGPD requirement)
  ip INET,  -- IP address of the request (stored as PostgreSQL INET type)
  user_agent TEXT,  -- Browser/device information
  
  -- Timestamp
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying a subscriber's consent history
CREATE INDEX idx_lm_consent_events_subscriber 
  ON public.lm_consent_events(subscriber_id, occurred_at DESC);

COMMENT ON TABLE public.lm_consent_events IS 'Immutable RGPD audit trail proving consent was obtained';
COMMENT ON COLUMN public.lm_consent_events.event_type IS 'signup: initial request | confirm: email verified | unsubscribe: consent revoked';
COMMENT ON COLUMN public.lm_consent_events.consent_text IS 'Exact text of checkbox/consent statement shown to user';
COMMENT ON COLUMN public.lm_consent_events.privacy_policy_version IS 'Version identifier to track which policy user agreed to';
COMMENT ON COLUMN public.lm_consent_events.ip IS 'IP address for RGPD compliance (stored as INET type)';

-- ============================================================================
-- TABLE 3: lm_download_tokens
-- ============================================================================
-- Purpose: Token-based access control with expiration and usage tracking
-- Security: Stores SHA-256 hash only, never plain tokens

CREATE TABLE IF NOT EXISTS public.lm_download_tokens (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Key (cascading delete for right-to-be-forgotten)
  subscriber_id UUID NOT NULL REFERENCES public.lm_subscribers(id) ON DELETE CASCADE,
  
  -- Token Security
  token_hash TEXT NOT NULL UNIQUE,  -- SHA-256 hash of the token (hex string)
  
  -- Token Purpose
  purpose TEXT NOT NULL CHECK (purpose IN ('confirm_and_download', 'download_only')),
  
  -- Expiration & Usage Limits
  expires_at TIMESTAMPTZ NOT NULL,  -- Token becomes invalid after this time
  max_uses INT NOT NULL DEFAULT 999,  -- Max downloads allowed (999 = effectively unlimited)
  use_count INT NOT NULL DEFAULT 0,   -- Actual number of times token was used
  
  -- Usage Tracking
  used_at TIMESTAMPTZ,  -- First time token was used for download
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for looking up tokens by hash (validation)
CREATE UNIQUE INDEX idx_lm_download_tokens_hash 
  ON public.lm_download_tokens(token_hash);

-- Index for querying a subscriber's token history
CREATE INDEX idx_lm_download_tokens_subscriber 
  ON public.lm_download_tokens(subscriber_id, created_at DESC);

-- Partial index for efficient expired token cleanup
-- Only indexes tokens that haven't reached max_uses
CREATE INDEX idx_lm_download_tokens_expires 
  ON public.lm_download_tokens(expires_at) 
  WHERE use_count < max_uses;

COMMENT ON TABLE public.lm_download_tokens IS 'Token-based access control with expiration and usage tracking';
COMMENT ON COLUMN public.lm_download_tokens.token_hash IS 'SHA-256 hash of token (NEVER store plain tokens)';
COMMENT ON COLUMN public.lm_download_tokens.purpose IS 'confirm_and_download: confirms email + grants download | download_only: for future re-request feature';
COMMENT ON COLUMN public.lm_download_tokens.expires_at IS 'Token invalid after this timestamp (48 hours from generation)';
COMMENT ON COLUMN public.lm_download_tokens.max_uses IS 'Maximum downloads allowed (999 = reusable within 48h window)';
COMMENT ON COLUMN public.lm_download_tokens.use_count IS 'Actual number of times token was used (for analytics)';
COMMENT ON COLUMN public.lm_download_tokens.used_at IS 'First download timestamp (NULL until first use)';

-- ============================================================================
-- VERIFICATION QUERIES (for testing and validation)
-- ============================================================================

-- Verify all tables exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lm_subscribers') THEN
    RAISE EXCEPTION 'Table lm_subscribers not created';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lm_consent_events') THEN
    RAISE EXCEPTION 'Table lm_consent_events not created';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lm_download_tokens') THEN
    RAISE EXCEPTION 'Table lm_download_tokens not created';
  END IF;
  RAISE NOTICE 'All tables created successfully';
END $$;

-- Verify constraints
SELECT 
  tc.table_name, 
  tc.constraint_type,
  tc.constraint_name,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public' 
  AND tc.table_name IN ('lm_subscribers', 'lm_consent_events', 'lm_download_tokens')
ORDER BY tc.table_name, tc.constraint_type;

-- Verify indexes
SELECT 
  schemaname, 
  tablename, 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('lm_subscribers', 'lm_consent_events', 'lm_download_tokens')
ORDER BY tablename, indexname;
