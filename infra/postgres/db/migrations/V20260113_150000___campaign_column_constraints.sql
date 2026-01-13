-- V20260113_150000___campaign_column_constraints.sql
-- Add length constraints to campaign columns
-- Required for Story 1.1: Create New Campaign - AC compliance

-- Add VARCHAR constraint to name column (max 100 chars)
-- Step 1: Truncate any existing data longer than 100 chars (safety)
UPDATE outreach.campaigns 
SET name = LEFT(name, 100) 
WHERE LENGTH(name) > 100;

-- Step 2: Alter column type to VARCHAR(100)
ALTER TABLE outreach.campaigns 
  ALTER COLUMN name TYPE VARCHAR(100);

-- Add NOT NULL constraint to value_prop and set max length
-- Step 1: Set default for any NULL values
UPDATE outreach.campaigns 
SET value_prop = 'Default value proposition' 
WHERE value_prop IS NULL;

-- Step 2: Alter column type to VARCHAR(150) and add NOT NULL
ALTER TABLE outreach.campaigns 
  ALTER COLUMN value_prop TYPE VARCHAR(150),
  ALTER COLUMN value_prop SET NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN outreach.campaigns.name IS 'Campaign name, max 100 characters';
COMMENT ON COLUMN outreach.campaigns.value_prop IS 'Value proposition, max 150 characters, required';
