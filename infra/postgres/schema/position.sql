CREATE TABLE positions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Relations
    person_id               UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    company_id              UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Métier / rôle
    job_title               VARCHAR(255),

    -- Prospection
    pharow_list_name        VARCHAR(255),
    email                   VARCHAR(255),
    email_status            VARCHAR(50),
    email_reliability       NUMERIC(5,2), -- ex: 95.00

    created_at              TIMESTAMPTZ DEFAULT now(),
    updated_at              TIMESTAMPTZ DEFAULT now(),

    -- un contact = 1 email unique par boîte
UNIQUE(company_id, person_id, email)
);
