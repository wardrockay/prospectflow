-- Migration: Add duplicate detection indexes for prospect import
-- Date: 2026-01-17
-- Story: 2-6-validation-report-and-user-actions
-- Description: Create indexes to detect duplicate prospects based on email and prevent duplicate imports

-- Create index for duplicate detection (case-insensitive email)
-- Used by: ImportProspectsService to check existing prospects before batch insert
CREATE INDEX IF NOT EXISTS idx_people_org_email 
ON public.crm_people (organisation_id, LOWER(contact_email))
WHERE contact_email IS NOT NULL;

-- Create compound index for duplicate detection with timestamp ordering
-- Used by: Query optimization for "find most recent prospect by email in org"
CREATE INDEX IF NOT EXISTS idx_people_org_email_created 
ON public.crm_people (organisation_id, LOWER(contact_email), created_at DESC)
WHERE contact_email IS NOT NULL;

-- Create index for campaign-based queries
-- Used by: Campaign management to find all prospects in a campaign
CREATE INDEX IF NOT EXISTS idx_people_campaign 
ON public.crm_people (organisation_id, campaign_id)
WHERE campaign_id IS NOT NULL;

-- Create index for status filtering
-- Used by: Prospect lifecycle queries (find all New/Contacted/Qualified prospects)
CREATE INDEX IF NOT EXISTS idx_people_status 
ON public.crm_people (organisation_id, status)
WHERE status IS NOT NULL;

-- Verify index creation
DO $$
BEGIN
  RAISE NOTICE '✓ Duplicate detection indexes created:';
  RAISE NOTICE '  - idx_people_org_email (for duplicate email check)';
  RAISE NOTICE '  - idx_people_org_email_created (for timestamp-ordered queries)';
  RAISE NOTICE '  - idx_people_campaign (for campaign filtering)';
  RAISE NOTICE '  - idx_people_status (for status filtering)';
END $$;
