-- Migration: Add indexes for duplicate detection performance
-- Date: 2026-01-17
-- Story: 2-5-duplicate-detection-against-existing-prospects

-- Index for fast email lookup within organization (campaign-level duplicate check)
-- This index enables efficient lookup of prospects by normalized email within an organization
CREATE INDEX IF NOT EXISTS idx_people_org_email 
ON crm.people (organisation_id, LOWER(contact_email));

-- Index for 90-day organization duplicate check (includes created_at for time filtering)
-- This composite index supports the organization-level duplicate detection within 90-day window
CREATE INDEX IF NOT EXISTS idx_people_org_email_created 
ON crm.people (organisation_id, LOWER(contact_email), created_at DESC);

-- Verify index creation and report results
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'crm' 
    AND tablename = 'people' 
    AND indexname = 'idx_people_org_email'
  ) THEN
    RAISE NOTICE '✓ Index idx_people_org_email created successfully';
  ELSE
    RAISE WARNING '✗ Index idx_people_org_email creation failed';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'crm' 
    AND tablename = 'people' 
    AND indexname = 'idx_people_org_email_created'
  ) THEN
    RAISE NOTICE '✓ Index idx_people_org_email_created created successfully';
  ELSE
    RAISE WARNING '✗ Index idx_people_org_email_created creation failed';
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON INDEX crm.idx_people_org_email IS 
'Supports fast campaign-level duplicate detection by normalized email within organization';

COMMENT ON INDEX crm.idx_people_org_email_created IS 
'Supports organization-level duplicate detection with 90-day time window filtering';
