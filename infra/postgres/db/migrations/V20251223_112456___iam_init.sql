-- V20251223_112456___iam_init.sql
-- Domain: IAM (Identity & Access Management)
-- Purpose: IAM init with public schema + iam_ prefix (OVH CloudDB compatible)

-- Write safe migrations:
-- 1) add nullable column
-- 2) backfill
-- 3) add NOT NULL / constraints in a later migration


CREATE TABLE public.iam_organisations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_iam_organisations_updated_at
BEFORE UPDATE ON public.iam_organisations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


CREATE TABLE public.iam_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email CITEXT NOT NULL UNIQUE,

  first_name TEXT,
  last_name  TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_iam_users_updated_at
BEFORE UPDATE ON public.iam_users
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


CREATE TABLE public.iam_organisation_users (
  organisation_id UUID NOT NULL REFERENCES public.iam_organisations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.iam_users(id) ON DELETE CASCADE,

  role TEXT NOT NULL CHECK (role IN ('owner','admin','member','viewer')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('invited','active','disabled')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (organisation_id, user_id)
);

CREATE TRIGGER trg_iam_org_users_updated_at
BEFORE UPDATE ON public.iam_organisation_users
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Garantit EXACTEMENT 1 owner par organisation
CREATE UNIQUE INDEX ux_one_owner_per_org
ON public.iam_organisation_users (organisation_id)
WHERE role = 'owner';

CREATE INDEX idx_iam_org_users_user ON public.iam_organisation_users(user_id);
