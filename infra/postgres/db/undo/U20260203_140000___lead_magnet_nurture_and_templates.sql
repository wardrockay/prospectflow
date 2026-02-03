-- U20260203_140000___lead_magnet_nurture_and_templates.sql
-- Purpose: Rollback migration V20260203_140000
-- Drops tables: lm_email_templates, lm_nurture_sequences, lm_nurture_emails

-- Drop tables in reverse order (respecting foreign keys)
DROP TABLE IF EXISTS public.lm_nurture_emails CASCADE;
DROP TABLE IF EXISTS public.lm_nurture_sequences CASCADE;
DROP TABLE IF EXISTS public.lm_email_templates CASCADE;

-- Verification
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'lm_nurture_emails') THEN
    RAISE EXCEPTION 'Rollback failed: lm_nurture_emails still exists';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'lm_nurture_sequences') THEN
    RAISE EXCEPTION 'Rollback failed: lm_nurture_sequences still exists';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'lm_email_templates') THEN
    RAISE EXCEPTION 'Rollback failed: lm_email_templates still exists';
  END IF;
  
  RAISE NOTICE 'Rollback U20260203_140000 completed successfully';
END $$;
