-- V20260113_140000___add_campaign_fields.sql
-- Add value_prop and template_id to campaigns table
-- Required for Story 1.1: Create New Campaign

-- Add value_prop column (nullable for now to allow safe migration)
ALTER TABLE outreach.campaigns
  ADD COLUMN value_prop VARCHAR(150) NULL;

-- Add template_id column (nullable - templates are optional)
ALTER TABLE outreach.campaigns
  ADD COLUMN template_id UUID NULL;

-- Note: Existing campaigns have NULL value_prop
-- In future migration, we can make value_prop NOT NULL after backfilling
