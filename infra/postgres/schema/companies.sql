CREATE TABLE companies (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identifiants externes
    pharow_company_id        VARCHAR(32) UNIQUE,
    siren                    VARCHAR(9),
    hq_siret                 VARCHAR(14),

    -- Noms & branding
    name                     VARCHAR(255) NOT NULL,
    brand_name               VARCHAR(255),
    linkedin_name            VARCHAR(255),

    -- Activité
    naf_sector               VARCHAR(255),
    activity                 TEXT,

    -- Infos business
    founding_year             SMALLINT,
    founding_date             DATE,
    growing                   BOOLEAN,
    employee_range            VARCHAR(50),
    annual_revenue_eur        BIGINT,
    annual_revenue_year       SMALLINT,

    -- Contact
    main_phone                VARCHAR(32),
    generic_email             VARCHAR(255),
    website_url               TEXT,
    linkedin_url              TEXT,

    -- Adresse HQ
    hq_address                TEXT,

    created_at                TIMESTAMPTZ DEFAULT now(),
    updated_at                TIMESTAMPTZ DEFAULT now()
);
