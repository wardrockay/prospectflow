-- V20260203_150000___grant_lm_permissions.sql
-- Purpose: Grant permissions on lm_* tables to prospectflow user
-- Context: Tables created by flyway user need explicit grants for app user
--
-- Note: This migration grants privileges to 'prospectflow' (app user)
--       and 'postgres' (admin user) on all lead magnet tables.

-- ============================================================================
-- GRANT PERMISSIONS ON EXISTING TABLES
-- ============================================================================

-- lm_subscribers (from V20260202_140000)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lm_subscribers TO prospectflow;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lm_subscribers TO postgres;

-- lm_consent_events (from V20260202_140000)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lm_consent_events TO prospectflow;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lm_consent_events TO postgres;

-- lm_download_tokens (from V20260202_140000)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lm_download_tokens TO prospectflow;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lm_download_tokens TO postgres;

-- lm_email_templates (from V20260203_140000)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lm_email_templates TO prospectflow;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lm_email_templates TO postgres;

-- lm_nurture_sequences (from V20260203_140000)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lm_nurture_sequences TO prospectflow;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lm_nurture_sequences TO postgres;

-- lm_nurture_emails (from V20260203_140000)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lm_nurture_emails TO prospectflow;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lm_nurture_emails TO postgres;

-- ============================================================================
-- GRANT PERMISSIONS ON SEQUENCES (for auto-increment if any)
-- ============================================================================

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO prospectflow;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- ============================================================================
-- SET DEFAULT PRIVILEGES FOR FUTURE TABLES
-- ============================================================================
-- Ensures any new tables created by flyway will automatically grant to app user

ALTER DEFAULT PRIVILEGES FOR ROLE flyway IN SCHEMA public 
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO prospectflow;

ALTER DEFAULT PRIVILEGES FOR ROLE flyway IN SCHEMA public 
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO postgres;

ALTER DEFAULT PRIVILEGES FOR ROLE flyway IN SCHEMA public 
GRANT USAGE, SELECT ON SEQUENCES TO prospectflow;

ALTER DEFAULT PRIVILEGES FOR ROLE flyway IN SCHEMA public 
GRANT USAGE, SELECT ON SEQUENCES TO postgres;
