-- V20251223_112543___crm_init.sql
-- Domain: CRM (companies, people, positions)
-- Purpose: CRM init with public schema + crm_ prefix (OVH CloudDB compatible)

-- Write safe migrations:
-- 1) add nullable column
-- 2) backfill
-- 3) add NOT NULL / constraints in a later migration

CREATE TABLE public.crm_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL
    REFERENCES public.iam_organisations(id) ON DELETE CASCADE,

  -- Identifiants externes
  pharow_company_id VARCHAR(32),
  siren VARCHAR(9),
  hq_siret VARCHAR(14),

  -- Noms & branding
  name VARCHAR(255) NOT NULL,
  brand_name VARCHAR(255),
  linkedin_name VARCHAR(255),

  -- Activité
  naf_sector VARCHAR(255),
  activity TEXT,

  -- Infos business
  founding_year SMALLINT,
  founding_date DATE,
  growing BOOLEAN,
  employee_range VARCHAR(50),
  annual_revenue_eur BIGINT,
  annual_revenue_year SMALLINT,

  -- Contact
  main_phone VARCHAR(32),
  generic_email CITEXT,
  website_url TEXT,
  linkedin_url TEXT,

  -- Adresse
  hq_address TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (organisation_id, pharow_company_id)
);

CREATE TRIGGER trg_crm_companies_updated_at
BEFORE UPDATE ON public.crm_companies
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_crm_companies_org_siren
  ON public.crm_companies(organisation_id, siren);

CREATE INDEX idx_crm_companies_org_pharow
  ON public.crm_companies(organisation_id, pharow_company_id);

-- clé composite pour FKs cross-tenant
ALTER TABLE public.crm_companies
  ADD CONSTRAINT ux_crm_companies_org_id UNIQUE (organisation_id, id);


CREATE TABLE public.crm_people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL
    REFERENCES public.iam_organisations(id) ON DELETE CASCADE,

  first_name VARCHAR(100),
  last_name  VARCHAR(100),
  salutation VARCHAR(50),

  linkedin_url TEXT,

  -- Téléphones (brut)
  mobile_phone VARCHAR(32),
  phone_kaspr_1 VARCHAR(32),
  phone_kaspr_3 VARCHAR(32),
  phone_bettercontact VARCHAR(32),
  phone_fullenrich_1 VARCHAR(32),
  phone_fullenrich_3 VARCHAR(32),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (organisation_id, first_name, last_name, linkedin_url)
);

CREATE TRIGGER trg_crm_people_updated_at
BEFORE UPDATE ON public.crm_people
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_crm_people_org_last_name
  ON public.crm_people(organisation_id, last_name);

ALTER TABLE public.crm_people
  ADD CONSTRAINT ux_crm_people_org_id UNIQUE (organisation_id, id);


CREATE TABLE public.crm_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL
    REFERENCES public.iam_organisations(id) ON DELETE CASCADE,

  person_id  UUID NOT NULL,
  company_id UUID NOT NULL,

  -- Métier / prospection
  job_title VARCHAR(255),
  pharow_list_name VARCHAR(255),

  email CITEXT,
  email_status VARCHAR(50),
  email_reliability NUMERIC(5,2),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (organisation_id, company_id, person_id, email),

  -- Anti cross-tenant
  CONSTRAINT fk_crm_positions_person_same_org
    FOREIGN KEY (organisation_id, person_id)
    REFERENCES public.crm_people(organisation_id, id)
    ON DELETE CASCADE,

  CONSTRAINT fk_crm_positions_company_same_org
    FOREIGN KEY (organisation_id, company_id)
    REFERENCES public.crm_companies(organisation_id, id)
    ON DELETE CASCADE
);

CREATE TRIGGER trg_crm_positions_updated_at
BEFORE UPDATE ON public.crm_positions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_crm_positions_org_email
  ON public.crm_positions(organisation_id, email);

CREATE INDEX idx_crm_positions_org_company
  ON public.crm_positions(organisation_id, company_id);

CREATE INDEX idx_crm_positions_org_person
  ON public.crm_positions(organisation_id, person_id);
