-- V20260108_120000___tenant_keys_rls_and_pooling_prep.sql
-- Domain: Multi-tenant hardening
-- Purpose:
--   1) Enforce composite primary keys (organisation_id, id) for tenant-scoped tables
--   2) Add DB-level tenant isolation via RLS that requires a session org context
--
-- Notes:
-- - This migration is designed to be safe to run once.
-- - RLS uses session variable: app.organisation_id
-- - OVH CloudDB: Cannot create 'app' schema, using public schema instead

-- -------------------------
-- 1) Helper schema + functions
-- -------------------------

-- OVH CloudDB: Cannot create custom schemas
-- CREATE SCHEMA IF NOT EXISTS app;

-- Using public schema for helper function
CREATE OR REPLACE FUNCTION public.current_organisation_id()
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
ALTER TABLE public.crm_companies DROP CONSTRAINT IF EXISTS crm_companies_pkey;
ALTER TABLE public.crm_companies ADD PRIMARY KEY (organisation_id, id);

ALTER TABLE public.crm_people DROP CONSTRAINT IF EXISTS crm_people_pkey;
ALTER TABLE public.crm_people ADD PRIMARY KEY (organisation_id, id);

ALTER TABLE public.crm_positions DROP CONSTRAINT IF EXISTS crm_positions_pkey;
ALTER TABLE public.crm_positions ADD PRIMARY KEY (organisation_id, id);

-- Outreach
ALTER TABLE public.outreach_campaigns DROP CONSTRAINT IF EXISTS outreach_campaigns_pkey;
ALTER TABLE public.outreach_campaigns ADD PRIMARY KEY (organisation_id, id);

ALTER TABLE public.outreach_workflow_steps DROP CONSTRAINT IF EXISTS outreach_workflow_steps_pkey;
ALTER TABLE public.outreach_workflow_steps ADD PRIMARY KEY (organisation_id, id);

ALTER TABLE public.outreach_prompts DROP CONSTRAINT IF EXISTS outreach_prompts_pkey;
ALTER TABLE public.outreach_prompts ADD PRIMARY KEY (organisation_id, id);

ALTER TABLE public.outreach_step_experiments DROP CONSTRAINT IF EXISTS outreach_step_experiments_pkey;
ALTER TABLE public.outreach_step_experiments ADD PRIMARY KEY (organisation_id, id);

ALTER TABLE public.outreach_step_experiment_variants DROP CONSTRAINT IF EXISTS outreach_step_experiment_variants_pkey;
ALTER TABLE public.outreach_step_experiment_variants ADD PRIMARY KEY (organisation_id, id);

ALTER TABLE public.outreach_campaign_enrollments DROP CONSTRAINT IF EXISTS outreach_campaign_enrollments_pkey;
ALTER TABLE public.outreach_campaign_enrollments ADD PRIMARY KEY (organisation_id, id);

ALTER TABLE public.outreach_enrollment_step_variant_assignments DROP CONSTRAINT IF EXISTS outreach_enrollment_step_variant_assignments_pkey;
ALTER TABLE public.outreach_enrollment_step_variant_assignments ADD PRIMARY KEY (organisation_id, enrollment_id, workflow_step_id);

ALTER TABLE public.outreach_tasks DROP CONSTRAINT IF EXISTS outreach_tasks_pkey;
ALTER TABLE public.outreach_tasks ADD PRIMARY KEY (organisation_id, id);

ALTER TABLE public.outreach_messages DROP CONSTRAINT IF EXISTS outreach_messages_pkey;
ALTER TABLE public.outreach_messages ADD PRIMARY KEY (organisation_id, id);

-- Tracking
ALTER TABLE public.tracking_pixels DROP CONSTRAINT IF EXISTS pixels_pkey;
ALTER TABLE public.tracking_pixels ADD PRIMARY KEY (organisation_id, id);

-- public.tracking_message_open_stats already uses (organisation_id, message_id)

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
ALTER TABLE public.crm_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_companies FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.crm_companies;
CREATE POLICY tenant_isolation ON public.crm_companies
  USING (organisation_id = public.current_organisation_id())
  WITH CHECK (organisation_id = public.current_organisation_id());

ALTER TABLE public.crm_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_people FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.crm_people;
CREATE POLICY tenant_isolation ON public.crm_people
  USING (organisation_id = public.current_organisation_id())
  WITH CHECK (organisation_id = public.current_organisation_id());

ALTER TABLE public.crm_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_positions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.crm_positions;
CREATE POLICY tenant_isolation ON public.crm_positions
  USING (organisation_id = public.current_organisation_id())
  WITH CHECK (organisation_id = public.current_organisation_id());

-- Outreach
ALTER TABLE public.outreach_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_campaigns FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.outreach_campaigns;
CREATE POLICY tenant_isolation ON public.outreach_campaigns
  USING (organisation_id = public.current_organisation_id())
  WITH CHECK (organisation_id = public.current_organisation_id());

ALTER TABLE public.outreach_workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_workflow_steps FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.outreach_workflow_steps;
CREATE POLICY tenant_isolation ON public.outreach_workflow_steps
  USING (organisation_id = public.current_organisation_id())
  WITH CHECK (organisation_id = public.current_organisation_id());

ALTER TABLE public.outreach_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_prompts FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.outreach_prompts;
CREATE POLICY tenant_isolation ON public.outreach_prompts
  USING (organisation_id = public.current_organisation_id())
  WITH CHECK (organisation_id = public.current_organisation_id());

ALTER TABLE public.outreach_step_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_step_experiments FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.outreach_step_experiments;
CREATE POLICY tenant_isolation ON public.outreach_step_experiments
  USING (organisation_id = public.current_organisation_id())
  WITH CHECK (organisation_id = public.current_organisation_id());

ALTER TABLE public.outreach_step_experiment_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_step_experiment_variants FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.outreach_step_experiment_variants;
CREATE POLICY tenant_isolation ON public.outreach_step_experiment_variants
  USING (organisation_id = public.current_organisation_id())
  WITH CHECK (organisation_id = public.current_organisation_id());

ALTER TABLE public.outreach_campaign_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_campaign_enrollments FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.outreach_campaign_enrollments;
CREATE POLICY tenant_isolation ON public.outreach_campaign_enrollments
  USING (organisation_id = public.current_organisation_id())
  WITH CHECK (organisation_id = public.current_organisation_id());

ALTER TABLE public.outreach_enrollment_step_variant_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_enrollment_step_variant_assignments FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.outreach_enrollment_step_variant_assignments;
CREATE POLICY tenant_isolation ON public.outreach_enrollment_step_variant_assignments
  USING (organisation_id = public.current_organisation_id())
  WITH CHECK (organisation_id = public.current_organisation_id());

ALTER TABLE public.outreach_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_tasks FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.outreach_tasks;
CREATE POLICY tenant_isolation ON public.outreach_tasks
  USING (organisation_id = public.current_organisation_id())
  WITH CHECK (organisation_id = public.current_organisation_id());

ALTER TABLE public.outreach_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_messages FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.outreach_messages;
CREATE POLICY tenant_isolation ON public.outreach_messages
  USING (organisation_id = public.current_organisation_id())
  WITH CHECK (organisation_id = public.current_organisation_id());

-- Tracking
ALTER TABLE public.tracking_pixels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_pixels FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.tracking_pixels;
CREATE POLICY tenant_isolation ON public.tracking_pixels
  USING (organisation_id = public.current_organisation_id())
  WITH CHECK (organisation_id = public.current_organisation_id());

ALTER TABLE public.tracking_message_open_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_message_open_stats FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.tracking_message_open_stats;
CREATE POLICY tenant_isolation ON public.tracking_message_open_stats
  USING (organisation_id = public.current_organisation_id())
  WITH CHECK (organisation_id = public.current_organisation_id());
