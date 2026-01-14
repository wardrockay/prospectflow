-- Migration: Create import_uploads table for CSV import tracking
-- Date: 2026-01-14
-- Story: 2-2-csv-parsing-and-column-validation

-- Create import_uploads table in outreach schema (campaigns are in outreach)
CREATE TABLE IF NOT EXISTS outreach.import_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL,
    campaign_id UUID NOT NULL,
    filename TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    file_buffer BYTEA NOT NULL,
    detected_columns TEXT[],
    column_mappings JSONB,
    row_count INTEGER,
    parse_errors JSONB,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key constraints
    CONSTRAINT fk_import_uploads_organisation 
        FOREIGN KEY (organisation_id) 
        REFERENCES iam.organisations(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_import_uploads_campaign 
        FOREIGN KEY (campaign_id) 
        REFERENCES outreach.campaigns(id) 
        ON DELETE CASCADE,
    
    -- Constraints
    CONSTRAINT chk_file_size_positive CHECK (file_size > 0),
    CONSTRAINT chk_row_count_non_negative CHECK (row_count IS NULL OR row_count >= 0)
);

-- Create index for faster lookups by organisation and campaign
CREATE INDEX idx_import_uploads_org_campaign 
    ON outreach.import_uploads(organisation_id, campaign_id);

-- Create index for faster lookups by upload date
CREATE INDEX idx_import_uploads_uploaded_at 
    ON outreach.import_uploads(uploaded_at DESC);

-- Add updated_at trigger for consistency with other tables
CREATE TRIGGER trg_outreach_import_uploads_updated_at
BEFORE UPDATE ON outreach.import_uploads
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Add comment
COMMENT ON TABLE outreach.import_uploads IS 'Tracks CSV file uploads for prospect imports, stores file buffer for processing';
COMMENT ON COLUMN outreach.import_uploads.file_buffer IS 'Binary content of uploaded CSV file';
COMMENT ON COLUMN outreach.import_uploads.detected_columns IS 'Array of column names detected from CSV header';
COMMENT ON COLUMN outreach.import_uploads.column_mappings IS 'JSON mapping of detected columns to standard fields';
COMMENT ON COLUMN outreach.import_uploads.parse_errors IS 'JSON array of parsing errors if any occurred';
