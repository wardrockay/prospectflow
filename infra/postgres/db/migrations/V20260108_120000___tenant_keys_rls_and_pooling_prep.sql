-- V20260108_120000___tenant_keys_rls_and_pooling_prep.sql
-- Domain: Multi-tenant hardening
-- Purpose:
--   1) Enforce composite primary keys (organisation_id, id) for tenant-scoped tables
--   2) Add DB-level tenant isolation via RLS that requires a session org context
--
-- Notes:
-- - This migration is designed to be safe to run once.
-- - RLS uses session variable: app.organisation_id

-- -------------------------
-- 1) Helper schema + functions
-- -------------------------

CREATE SCHEMA IF NOT EXISTS app;

CREATE OR REPLACE FUNCTION app.current_organisation_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v text;
BEGIN
  v := current_setting('app.organisation_id', true);

  IF v IS NULL OR btrim(v) = '' THEN
    RAISE EXCEPTION 'Missing organisation_id. Set it with: SET app.organisation_id = ''<uuid>'';' 
      USING ERRCODE = 'P0001';
  END IF;

  RETURN v::uuid;
END;
$$;

-- -------------------------
-- 2) Composite primary keys
-- -------------------------

-- CRM
ALTER TABLE crm.companies DROP CONSTRAINT IF EXISTS companies_pkey;
ALTER TABLE crm.companies ADD PRIMARY KEY (organisation_id, id);

ALTER TABLE crm.people DROP CONSTRAINT IF EXISTS people_pkey;
ALTER TABLE crm.people ADD PRIMARY KEY (organisation_id, id);

ALTER TABLE crm.positions DROP CONSTRAINT IF EXISTS positions_pkey;
ALTER TABLE crm.positions ADD PRIMARY KEY (organisation_id, id);

-- Outreach
ALTER TABLE outreach.campaigns DROP CONSTRAINT IF EXISTS campaigns_pkey;
ALTER TABLE outreach.campaigns ADD PRIMARY KEY (organisation_id, id);

ALTER TABLE outreach.workflow_steps DROP CONSTRAINT IF EXISTS workflow_steps_pkey;
ALTER TABLE outreach.workflow_steps ADD PRIMARY KEY (organisation_id, id);

ALTER TABLE outreach.prompts DROP CONSTRAINT IF EXISTS prompts_pkey;
ALTER TABLE outreach.prompts ADD PRIMARY KEY (organisation_id, id);

ALTER TABLE outreach.step_experiments DROP CONSTRAINT IF EXISTS step_experiments_pkey;
ALTER TABLE outreach.step_experiments ADD PRIMARY KEY (organisation_id, id);

ALTER TABLE outreach.step_experiment_variants DROP CONSTRAINT IF EXISTS step_experiment_variants_pkey;
ALTER TABLE outreach.step_experiment_variants ADD PRIMARY KEY (organisation_id, id);

ALTER TABLE outreach.campaign_enrollments DROP CONSTRAINT IF EXISTS campaign_enrollments_pkey;
ALTER TABLE outreach.campaign_enrollments ADD PRIMARY KEY (organisation_id, id);

ALTER TABLE outreach.enrollment_step_variant_assignments DROP CONSTRAINT IF EXISTS enrollment_step_variant_assignments_pkey;
ALTER TABLE outreach.enrollment_step_variant_assignments ADD PRIMARY KEY (organisation_id, enrollment_id, workflow_step_id);

ALTER TABLE outreach.tasks DROP CONSTRAINT IF EXISTS tasks_pkey;
ALTER TABLE outreach.tasks ADD PRIMARY KEY (organisation_id, id);

ALTER TABLE outreach.messages DROP CONSTRAINT IF EXISTS messages_pkey;
ALTER TABLE outreach.messages ADD PRIMARY KEY (organisation_id, id);

-- Tracking
ALTER TABLE tracking.pixels DROP CONSTRAINT IF EXISTS pixels_pkey;
ALTER TABLE tracking.pixels ADD PRIMARY KEY (organisation_id, id);

-- tracking.message_open_stats already uses (organisation_id, message_id)

-- -------------------------
-- 3) Row Level Security policies
-- -------------------------

-- Application role (non-superuser) used for RLS-enforced access.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'prospectflow_app') THEN
    CREATE ROLE prospectflow_app;
  END IF;
END $$;

GRANT USAGE ON SCHEMA crm, outreach, tracking TO prospectflow_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA crm, outreach, tracking TO prospectflow_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA crm GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO prospectflow_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA outreach GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO prospectflow_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA tracking GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO prospectflow_app;

-- CRM
ALTER TABLE crm.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.companies FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON crm.companies;
CREATE POLICY tenant_isolation ON crm.companies
  USING (organisation_id = app.current_organisation_id())
  WITH CHECK (organisation_id = app.current_organisation_id());

ALTER TABLE crm.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.people FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON crm.people;
CREATE POLICY tenant_isolation ON crm.people
  USING (organisation_id = app.current_organisation_id())
  WITH CHECK (organisation_id = app.current_organisation_id());

ALTER TABLE crm.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.positions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON crm.positions;
CREATE POLICY tenant_isolation ON crm.positions
  USING (organisation_id = app.current_organisation_id())
  WITH CHECK (organisation_id = app.current_organisation_id());

-- Outreach
ALTER TABLE outreach.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach.campaigns FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON outreach.campaigns;
CREATE POLICY tenant_isolation ON outreach.campaigns
  USING (organisation_id = app.current_organisation_id())
  WITH CHECK (organisation_id = app.current_organisation_id());

ALTER TABLE outreach.workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach.workflow_steps FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON outreach.workflow_steps;
CREATE POLICY tenant_isolation ON outreach.workflow_steps
  USING (organisation_id = app.current_organisation_id())
  WITH CHECK (organisation_id = app.current_organisation_id());

ALTER TABLE outreach.prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach.prompts FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON outreach.prompts;
CREATE POLICY tenant_isolation ON outreach.prompts
  USING (organisation_id = app.current_organisation_id())
  WITH CHECK (organisation_id = app.current_organisation_id());

ALTER TABLE outreach.step_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach.step_experiments FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON outreach.step_experiments;
CREATE POLICY tenant_isolation ON outreach.step_experiments
  USING (organisation_id = app.current_organisation_id())
  WITH CHECK (organisation_id = app.current_organisation_id());

ALTER TABLE outreach.step_experiment_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach.step_experiment_variants FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON outreach.step_experiment_variants;
CREATE POLICY tenant_isolation ON outreach.step_experiment_variants
  USING (organisation_id = app.current_organisation_id())
  WITH CHECK (organisation_id = app.current_organisation_id());

ALTER TABLE outreach.campaign_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach.campaign_enrollments FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON outreach.campaign_enrollments;
CREATE POLICY tenant_isolation ON outreach.campaign_enrollments
  USING (organisation_id = app.current_organisation_id())
  WITH CHECK (organisation_id = app.current_organisation_id());

ALTER TABLE outreach.enrollment_step_variant_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach.enrollment_step_variant_assignments FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON outreach.enrollment_step_variant_assignments;
CREATE POLICY tenant_isolation ON outreach.enrollment_step_variant_assignments
  USING (organisation_id = app.current_organisation_id())
  WITH CHECK (organisation_id = app.current_organisation_id());

ALTER TABLE outreach.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach.tasks FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON outreach.tasks;
CREATE POLICY tenant_isolation ON outreach.tasks
  USING (organisation_id = app.current_organisation_id())
  WITH CHECK (organisation_id = app.current_organisation_id());

ALTER TABLE outreach.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach.messages FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON outreach.messages;
CREATE POLICY tenant_isolation ON outreach.messages
  USING (organisation_id = app.current_organisation_id())
  WITH CHECK (organisation_id = app.current_organisation_id());

-- Tracking
ALTER TABLE tracking.pixels ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking.pixels FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON tracking.pixels;
CREATE POLICY tenant_isolation ON tracking.pixels
  USING (organisation_id = app.current_organisation_id())
  WITH CHECK (organisation_id = app.current_organisation_id());

ALTER TABLE tracking.message_open_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking.message_open_stats FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON tracking.message_open_stats;
CREATE POLICY tenant_isolation ON tracking.message_open_stats
  USING (organisation_id = app.current_organisation_id())
  WITH CHECK (organisation_id = app.current_organisation_id());
