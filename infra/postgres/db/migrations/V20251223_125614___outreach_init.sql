-- V20251223_125614___outreach_init.sql
-- Domain: Campaigns (Steps,Prompts,A-B per step,Enrollments,Tasks,Messages)
-- Purpose: outreach init

-- Write safe migrations:
-- 1) add nullable column
-- 2) backfill
-- 3) add NOT NULL / constraints in a later migration

ALTER TABLE public.crm_positions
  ADD CONSTRAINT ux_positions_org_id UNIQUE (organisation_id, id);

-- -------------------------
-- campaigns
-- -------------------------
CREATE TABLE public.outreach_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.iam_organisations(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','running','paused','archived')),

  from_mailbox_id UUID NULL,
  created_by_user_id UUID NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_outreach_campaigns_updated_at
BEFORE UPDATE ON public.outreach_campaigns
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.outreach_campaigns
  ADD CONSTRAINT ux_campaigns_org_id UNIQUE (organisation_id, id);

CREATE INDEX idx_campaigns_org_status
  ON public.outreach_campaigns(organisation_id, status);


-- -------------------------
-- workflow_steps
-- -------------------------
CREATE TABLE public.outreach_workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.iam_organisations(id) ON DELETE CASCADE,

  campaign_id UUID NOT NULL,

  step_index INT NOT NULL CHECK (step_index >= 0),
  kind TEXT NOT NULL DEFAULT 'email' CHECK (kind IN ('email')),

  delay_days INT NOT NULL DEFAULT 0 CHECK (delay_days >= 0),
  exit_on_reply BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (organisation_id, campaign_id, step_index),

  CONSTRAINT fk_workflow_steps_campaign_same_org
    FOREIGN KEY (organisation_id, campaign_id)
    REFERENCES public.outreach_campaigns(organisation_id, id)
    ON DELETE CASCADE
);

CREATE TRIGGER trg_outreach_workflow_steps_updated_at
BEFORE UPDATE ON public.outreach_workflow_steps
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.outreach_workflow_steps
  ADD CONSTRAINT ux_workflow_steps_org_id UNIQUE (organisation_id, id);

CREATE INDEX idx_workflow_steps_org_campaign
  ON public.outreach_workflow_steps(organisation_id, campaign_id);


-- -------------------------
-- prompts (versioned)
-- -------------------------
CREATE TABLE public.outreach_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.iam_organisations(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  purpose TEXT NULL, -- initial_email, fu1, fu2...
  model TEXT NULL,

  version INT NOT NULL DEFAULT 1 CHECK (version >= 1),
  is_active BOOLEAN NOT NULL DEFAULT true,

  prompt_text TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (organisation_id, name, version)
);

CREATE TRIGGER trg_outreach_prompts_updated_at
BEFORE UPDATE ON public.outreach_prompts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.outreach_prompts
  ADD CONSTRAINT ux_prompts_org_id UNIQUE (organisation_id, id);

CREATE INDEX idx_prompts_org_active
  ON public.outreach_prompts(organisation_id, is_active);


-- -------------------------
-- experiments (A/B per step)
-- -------------------------
CREATE TABLE public.outreach_step_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.iam_organisations(id) ON DELETE CASCADE,

  workflow_step_id UUID NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','running','stopped')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (organisation_id, workflow_step_id),

  CONSTRAINT fk_step_experiments_step_same_org
    FOREIGN KEY (organisation_id, workflow_step_id)
    REFERENCES public.outreach_workflow_steps(organisation_id, id)
    ON DELETE CASCADE
);



CREATE TRIGGER trg_outreach_step_experiments_updated_at
BEFORE UPDATE ON public.outreach_step_experiments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.outreach_step_experiments
  ADD CONSTRAINT ux_step_experiments_org_id UNIQUE (organisation_id, id);

CREATE INDEX idx_step_experiments_org_step
  ON public.outreach_step_experiments(organisation_id, workflow_step_id);


CREATE TABLE public.outreach_step_experiment_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.iam_organisations(id) ON DELETE CASCADE,

  step_experiment_id UUID NOT NULL,

  key TEXT NOT NULL, -- 'A' / 'B'
  weight INT NOT NULL DEFAULT 50 CHECK (weight > 0),

  prompt_id UUID NULL,
  subject_template TEXT NULL,
  body_template TEXT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (organisation_id, step_experiment_id, key),

  CONSTRAINT fk_step_variants_experiment_same_org
    FOREIGN KEY (organisation_id, step_experiment_id)
    REFERENCES public.outreach_step_experiments(organisation_id, id)
    ON DELETE CASCADE,

  CONSTRAINT fk_step_variants_prompt_same_org
    FOREIGN KEY (organisation_id, prompt_id)
    REFERENCES public.outreach_prompts(organisation_id, id)
    ON DELETE SET NULL
);

ALTER TABLE public.outreach_step_experiment_variants
  ADD CONSTRAINT ux_step_experiment_variants_org_id UNIQUE (organisation_id, id);

CREATE INDEX idx_step_variants_org_experiment
  ON public.outreach_step_experiment_variants(organisation_id, step_experiment_id);


-- -------------------------
-- enrollments (position in campaign)
-- -------------------------
CREATE TABLE public.outreach_campaign_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.iam_organisations(id) ON DELETE CASCADE,

  campaign_id UUID NOT NULL,
  position_id UUID NOT NULL,

  state TEXT NOT NULL DEFAULT 'active'
    CHECK (state IN ('active','paused','replied','bounced','unsubscribed','finished')),

  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_activity_at TIMESTAMPTZ NULL,
  stopped_reason TEXT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (organisation_id, campaign_id, position_id),

  CONSTRAINT fk_enrollments_campaign_same_org
    FOREIGN KEY (organisation_id, campaign_id)
    REFERENCES public.outreach_campaigns(organisation_id, id)
    ON DELETE CASCADE,

  CONSTRAINT fk_enrollments_position_same_org
    FOREIGN KEY (organisation_id, position_id)
    REFERENCES public.crm_positions(organisation_id, id)
    ON DELETE CASCADE
);

CREATE TRIGGER trg_outreach_enrollments_updated_at
BEFORE UPDATE ON public.outreach_campaign_enrollments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.outreach_campaign_enrollments
  ADD CONSTRAINT ux_enrollments_org_id UNIQUE (organisation_id, id);

CREATE INDEX idx_enrollments_org_campaign
  ON public.outreach_campaign_enrollments(organisation_id, campaign_id);

CREATE INDEX idx_enrollments_org_state
  ON public.outreach_campaign_enrollments(organisation_id, state);


-- -------------------------
-- enrollment + step assignment (stable A/B)
-- -------------------------
CREATE TABLE public.outreach_enrollment_step_variant_assignments (
  organisation_id UUID NOT NULL REFERENCES public.iam_organisations(id) ON DELETE CASCADE,

  enrollment_id UUID NOT NULL,
  workflow_step_id UUID NOT NULL,
  step_experiment_id UUID NOT NULL,
  variant_id UUID NOT NULL,

  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (organisation_id, enrollment_id, workflow_step_id),

  CONSTRAINT fk_assign_enrollment_same_org
    FOREIGN KEY (organisation_id, enrollment_id)
    REFERENCES public.outreach_campaign_enrollments(organisation_id, id)
    ON DELETE CASCADE,

  CONSTRAINT fk_assign_step_same_org
    FOREIGN KEY (organisation_id, workflow_step_id)
    REFERENCES public.outreach_workflow_steps(organisation_id, id)
    ON DELETE CASCADE,

  CONSTRAINT fk_assign_experiment_same_org
    FOREIGN KEY (organisation_id, step_experiment_id)
    REFERENCES public.outreach_step_experiments(organisation_id, id)
    ON DELETE CASCADE,

  CONSTRAINT fk_assign_variant_same_org
    FOREIGN KEY (organisation_id, variant_id)
    REFERENCES public.outreach_step_experiment_variants(organisation_id, id)
    ON DELETE CASCADE
);

CREATE INDEX idx_assignments_org_variant
  ON public.outreach_enrollment_step_variant_assignments(organisation_id, variant_id);


-- -------------------------
-- tasks (intention)
-- -------------------------
CREATE TABLE public.outreach_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.iam_organisations(id) ON DELETE CASCADE,

  enrollment_id UUID NOT NULL,
  workflow_step_id UUID NOT NULL,

  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','locked','sent','skipped','cancelled','failed')),

  attempts INT NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  locked_at TIMESTAMPTZ NULL,
  locked_by TEXT NULL,
  last_error TEXT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (organisation_id, enrollment_id, workflow_step_id),

  CONSTRAINT fk_tasks_enrollment_same_org
    FOREIGN KEY (organisation_id, enrollment_id)
    REFERENCES public.outreach_campaign_enrollments(organisation_id, id)
    ON DELETE CASCADE,

  CONSTRAINT fk_tasks_step_same_org
    FOREIGN KEY (organisation_id, workflow_step_id)
    REFERENCES public.outreach_workflow_steps(organisation_id, id)
    ON DELETE CASCADE
);

ALTER TABLE public.outreach_tasks
  ADD CONSTRAINT ux_tasks_org_id UNIQUE (organisation_id, id);


CREATE TRIGGER trg_outreach_tasks_updated_at
BEFORE UPDATE ON public.outreach_tasks
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_tasks_due
  ON public.outreach_tasks(organisation_id, status, scheduled_for);


-- -------------------------
-- messages (event)
-- -------------------------
CREATE TABLE public.outreach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.iam_organisations(id) ON DELETE CASCADE,

  enrollment_id UUID NULL,
  task_id UUID NULL,

  position_id UUID NOT NULL,

  direction TEXT NOT NULL CHECK (direction IN ('outbound','inbound')),
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','sent','delivered','bounced','received','failed')),

  provider TEXT NOT NULL DEFAULT 'gmail',
  mailbox_id UUID NULL,

  provider_message_id TEXT NULL,
  provider_thread_id TEXT NULL,

  rfc822_message_id TEXT NULL,
  in_reply_to TEXT NULL,

  -- A/B attribution (for easy stats)
  step_experiment_id UUID NULL,
  variant_id UUID NULL,

  subject TEXT NULL,
  body_text TEXT NULL,
  body_html TEXT NULL,

  sent_at TIMESTAMPTZ NULL,
  received_at TIMESTAMPTZ NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_messages_position_same_org
    FOREIGN KEY (organisation_id, position_id)
    REFERENCES public.crm_positions(organisation_id, id)
    ON DELETE CASCADE
);

ALTER TABLE public.outreach_messages
  ADD CONSTRAINT ux_messages_org_id UNIQUE (organisation_id, id);

CREATE TRIGGER trg_outreach_messages_updated_at
BEFORE UPDATE ON public.outreach_messages
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.outreach_messages
  ADD CONSTRAINT fk_messages_enrollment_same_org
  FOREIGN KEY (organisation_id, enrollment_id)
  REFERENCES public.outreach_campaign_enrollments(organisation_id, id)
  ON DELETE SET NULL;

ALTER TABLE public.outreach_messages
  ADD CONSTRAINT fk_messages_task_same_org
  FOREIGN KEY (organisation_id, task_id)
  REFERENCES public.outreach_tasks(organisation_id, id)
  ON DELETE SET NULL;

ALTER TABLE public.outreach_messages
  ADD CONSTRAINT fk_messages_experiment_same_org
  FOREIGN KEY (organisation_id, step_experiment_id)
  REFERENCES public.outreach_step_experiments(organisation_id, id)
  ON DELETE SET NULL;

ALTER TABLE public.outreach_messages
  ADD CONSTRAINT fk_messages_variant_same_org
  FOREIGN KEY (organisation_id, variant_id)
  REFERENCES public.outreach_step_experiment_variants(organisation_id, id)
  ON DELETE SET NULL;

CREATE INDEX idx_messages_org_position_time
  ON public.outreach_messages(organisation_id, position_id, created_at);

CREATE INDEX idx_messages_org_thread
  ON public.outreach_messages(organisation_id, provider_thread_id);

CREATE UNIQUE INDEX ux_messages_org_provider_message_id
  ON public.outreach_messages(organisation_id, provider_message_id)
  WHERE provider_message_id IS NOT NULL;
