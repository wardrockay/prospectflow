-- PostgreSQL Test Data
-- Purpose: Seed database with test data for development and testing
-- Date: 2026-01-17

BEGIN;

-- Clean existing test data (cascade to maintain referential integrity)
TRUNCATE TABLE crm.positions CASCADE;
TRUNCATE TABLE crm.people CASCADE;
TRUNCATE TABLE crm.companies CASCADE;
TRUNCATE TABLE iam.organisation_users CASCADE;
TRUNCATE TABLE iam.users CASCADE;
TRUNCATE TABLE iam.organisations CASCADE;

-- =====================================================
-- IAM Schema: Organisations
-- =====================================================

INSERT INTO iam.organisations (id, name, created_at, updated_at)
VALUES 
  ('a38904e7-922c-4662-9d46-f3cc9d853641', 'Acme Corporation', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

COMMIT;
