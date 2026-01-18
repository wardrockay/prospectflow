-- Migration: Add updated_at column to import_uploads table
-- Date: 2026-01-18
-- Fix: The trigger was added but the column was missing

-- Add updated_at column to import_uploads table
ALTER TABLE outreach.import_uploads 
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Set initial value to uploaded_at for existing rows
UPDATE outreach.import_uploads 
SET updated_at = uploaded_at 
WHERE updated_at IS NULL;

-- Add NOT NULL constraint after setting initial values
ALTER TABLE outreach.import_uploads 
    ALTER COLUMN updated_at SET NOT NULL;

-- Add comment
COMMENT ON COLUMN outreach.import_uploads.updated_at IS 'Timestamp of last update, automatically maintained by trigger';
