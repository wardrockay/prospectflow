-- U20260108_120000__tenant_keys_rls_and_pooling_prep.sql
-- Manual rollback helper for V20260108_120000___tenant_keys_rls_and_pooling_prep.sql
--
-- WARNING:
-- - This is NOT executed automatically by Flyway Community.
-- - Reverting PKs back to `id` can fail if duplicate `id` values exist across organisations.
--   (After composite PK enforcement, duplicates across orgs are technically possible.)

-- 1) Disable RLS + drop policies

-- CRM
DROP POLICY IF EXISTS tenant_isolation ON crm.companies;
ALTER TABLE crm.companies NO FORCE ROW LEVEL SECURITY;
ALTER TABLE crm.companies DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON crm.people;
ALTER TABLE crm.people NO FORCE ROW LEVEL SECURITY;
ALTER TABLE crm.people DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON crm.positions;
ALTER TABLE crm.positions NO FORCE ROW LEVEL SECURITY;
ALTER TABLE crm.positions DISABLE ROW LEVEL SECURITY;

-- Outreach
DROP POLICY IF EXISTS tenant_isolation ON outreach.campaigns;
ALTER TABLE outreach.campaigns NO FORCE ROW LEVEL SECURITY;
ALTER TABLE outreach.campaigns DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON outreach.workflow_steps;
ALTER TABLE outreach.workflow_steps NO FORCE ROW LEVEL SECURITY;
ALTER TABLE outreach.workflow_steps DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON outreach.prompts;
ALTER TABLE outreach.prompts NO FORCE ROW LEVEL SECURITY;
ALTER TABLE outreach.prompts DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON outreach.step_experiments;
ALTER TABLE outreach.step_experiments NO FORCE ROW LEVEL SECURITY;
ALTER TABLE outreach.step_experiments DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON outreach.step_experiment_variants;
ALTER TABLE outreach.step_experiment_variants NO FORCE ROW LEVEL SECURITY;
ALTER TABLE outreach.step_experiment_variants DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON outreach.campaign_enrollments;
ALTER TABLE outreach.campaign_enrollments NO FORCE ROW LEVEL SECURITY;
ALTER TABLE outreach.campaign_enrollments DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON outreach.enrollment_step_variant_assignments;
ALTER TABLE outreach.enrollment_step_variant_assignments NO FORCE ROW LEVEL SECURITY;
ALTER TABLE outreach.enrollment_step_variant_assignments DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON outreach.tasks;
ALTER TABLE outreach.tasks NO FORCE ROW LEVEL SECURITY;
ALTER TABLE outreach.tasks DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON outreach.messages;
ALTER TABLE outreach.messages NO FORCE ROW LEVEL SECURITY;
ALTER TABLE outreach.messages DISABLE ROW LEVEL SECURITY;

-- Tracking
DROP POLICY IF EXISTS tenant_isolation ON tracking.pixels;
ALTER TABLE tracking.pixels NO FORCE ROW LEVEL SECURITY;
ALTER TABLE tracking.pixels DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON tracking.message_open_stats;
ALTER TABLE tracking.message_open_stats NO FORCE ROW LEVEL SECURITY;
ALTER TABLE tracking.message_open_stats DISABLE ROW LEVEL SECURITY;

-- 2) Revert primary keys back to `id` (best-effort)
-- NOTE: This assumes `id` is unique globally.

ALTER TABLE crm.companies DROP CONSTRAINT IF EXISTS companies_pkey;
ALTER TABLE crm.companies ADD PRIMARY KEY (id);

ALTER TABLE crm.people DROP CONSTRAINT IF EXISTS people_pkey;
ALTER TABLE crm.people ADD PRIMARY KEY (id);

ALTER TABLE crm.positions DROP CONSTRAINT IF EXISTS positions_pkey;
ALTER TABLE crm.positions ADD PRIMARY KEY (id);

ALTER TABLE outreach.campaigns DROP CONSTRAINT IF EXISTS campaigns_pkey;
ALTER TABLE outreach.campaigns ADD PRIMARY KEY (id);

ALTER TABLE outreach.workflow_steps DROP CONSTRAINT IF EXISTS workflow_steps_pkey;
ALTER TABLE outreach.workflow_steps ADD PRIMARY KEY (id);

ALTER TABLE outreach.prompts DROP CONSTRAINT IF EXISTS prompts_pkey;
ALTER TABLE outreach.prompts ADD PRIMARY KEY (id);

ALTER TABLE outreach.step_experiments DROP CONSTRAINT IF EXISTS step_experiments_pkey;
ALTER TABLE outreach.step_experiments ADD PRIMARY KEY (id);

ALTER TABLE outreach.step_experiment_variants DROP CONSTRAINT IF EXISTS step_experiment_variants_pkey;
ALTER TABLE outreach.step_experiment_variants ADD PRIMARY KEY (id);

ALTER TABLE outreach.campaign_enrollments DROP CONSTRAINT IF EXISTS campaign_enrollments_pkey;
ALTER TABLE outreach.campaign_enrollments ADD PRIMARY KEY (id);

ALTER TABLE outreach.enrollment_step_variant_assignments DROP CONSTRAINT IF EXISTS enrollment_step_variant_assignments_pkey;
ALTER TABLE outreach.enrollment_step_variant_assignments ADD PRIMARY KEY (id);

ALTER TABLE outreach.tasks DROP CONSTRAINT IF EXISTS tasks_pkey;
ALTER TABLE outreach.tasks ADD PRIMARY KEY (id);

ALTER TABLE outreach.messages DROP CONSTRAINT IF EXISTS messages_pkey;
ALTER TABLE outreach.messages ADD PRIMARY KEY (id);

ALTER TABLE tracking.pixels DROP CONSTRAINT IF EXISTS pixels_pkey;
ALTER TABLE tracking.pixels ADD PRIMARY KEY (id);

-- tracking.message_open_stats keeps PK (organisation_id, message_id)

-- 3) Optional: drop helper schema (only if you are sure nothing else uses it)
-- DROP SCHEMA IF EXISTS app CASCADE;
