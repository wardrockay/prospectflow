-- Migration: Add columns for prospect import functionality
-- Date: 2026-01-17
-- Story: 2-6-validation-report-and-user-actions
-- Description: Add campaign_id, company_name, contact_email, contact_name, website_url, status columns to public.crm_people

-- Add campaign_id column (links prospect to a campaign)
ALTER TABLE public.crm_people 
ADD COLUMN IF NOT EXISTS campaign_id UUID;

-- Add company information
ALTER TABLE public.crm_people 
ADD COLUMN IF NOT EXISTS company_name VARCHAR(200);

-- Add contact information
ALTER TABLE public.crm_people 
ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);

ALTER TABLE public.crm_people 
ADD COLUMN IF NOT EXISTS contact_name VARCHAR(100);

-- Add website URL
ALTER TABLE public.crm_people 
ADD COLUMN IF NOT EXISTS website_url VARCHAR(500);

-- Add status column (for prospect lifecycle tracking)
ALTER TABLE public.crm_people 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'New';

-- Add foreign key constraint for campaign_id (if campaigns table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'outreach' 
    AND table_name = 'campaigns'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_people_campaign' 
    AND table_schema = 'crm' 
    AND table_name = 'people'
  ) THEN
    -- Add foreign key constraint
    ALTER TABLE public.crm_people 
    ADD CONSTRAINT fk_people_campaign 
    FOREIGN KEY (organisation_id, campaign_id) 
    REFERENCES public.outreach_campaigns(organisation_id, id) 
    ON DELETE SET NULL;
    
    RAISE NOTICE '✓ Foreign key constraint fk_people_campaign created';
  ELSE
    RAISE WARNING '⚠ Campaigns table not found or constraint already exists - skipping foreign key';
  END IF;
END $$;

-- Verify column additions
DO $$
BEGIN
  RAISE NOTICE '✓ Prospect import columns added to public.crm_people:';
  RAISE NOTICE '  - campaign_id';
  RAISE NOTICE '  - company_name';
  RAISE NOTICE '  - contact_email';
  RAISE NOTICE '  - contact_name';
  RAISE NOTICE '  - website_url';
  RAISE NOTICE '  - status';
END $$;
