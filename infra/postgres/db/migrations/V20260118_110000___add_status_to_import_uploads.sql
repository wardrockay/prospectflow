-- Migration: Add status column to import_uploads table
-- Date: 2026-01-18
-- Feature: Track import workflow progress (uploaded → mapped → completed)

-- Add status column with default 'uploaded'
ALTER TABLE public.outreach_import_uploads 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'uploaded';

-- Add constraint to enforce valid status values
ALTER TABLE public.outreach_import_uploads
ADD CONSTRAINT chk_import_status 
CHECK (status IN (
    'uploaded',           -- CSV uploaded, mapping pending
    'mapped',            -- Column mapping confirmed
    'validating',        -- Data validation in progress
    'validation_failed', -- Validation errors found
    'importing',         -- Import in progress
    'completed',         -- Import successful
    'failed'            -- Import failed
));

-- Create index for faster status-based queries
CREATE INDEX idx_import_uploads_status 
    ON public.outreach_import_uploads(organisation_id, campaign_id, status);

-- Update existing records to 'uploaded' status
UPDATE public.outreach_import_uploads 
SET status = 'uploaded' 
WHERE status IS NULL;

-- Add comment
COMMENT ON COLUMN public.outreach_import_uploads.status IS 'Workflow status: uploaded → mapped → validating → importing → completed/failed';
