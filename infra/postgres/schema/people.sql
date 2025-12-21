CREATE TABLE people (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    first_name               VARCHAR(100),
    last_name                VARCHAR(100),
    salutation               VARCHAR(50),

    linkedin_url             TEXT,

    -- Téléphones (on garde brut, normalisation plus tard)
    mobile_phone             VARCHAR(32),
    phone_kaspr_1             VARCHAR(32),
    phone_kaspr_3             VARCHAR(32),
    phone_bettercontact      VARCHAR(32),
    phone_fullenrich_1       VARCHAR(32),
    phone_fullenrich_3       VARCHAR(32),

    created_at               TIMESTAMPTZ DEFAULT now(),
    updated_at               TIMESTAMPTZ DEFAULT now(),

    -- éviter les doublons évidents
    UNIQUE (first_name, last_name, linkedin_url)
);
