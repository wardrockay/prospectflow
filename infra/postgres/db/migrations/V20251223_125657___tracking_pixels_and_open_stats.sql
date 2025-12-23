-- V20251223_125657___tracking_pixels_and_open_stats.sql
-- Domain: --
-- Purpose: tracking pixels_and_open_stats

-- Write safe migrations:
-- 1) add nullable column
-- 2) backfill
-- 3) add NOT NULL / constraints in a later migration

-- Pixels + aggregated open stats (hits are in ClickHouse)

CREATE TABLE tracking.pixels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES iam.organisations(id) ON DELETE CASCADE,

  message_id UUID NOT NULL,
  token TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (organisation_id, token),

  CONSTRAINT fk_pixels_message_same_org
    FOREIGN KEY (organisation_id, message_id)
    REFERENCES outreach.messages(organisation_id, id)
    ON DELETE CASCADE
);

CREATE INDEX idx_pixels_org_message
  ON tracking.pixels(organisation_id, message_id);


CREATE TABLE tracking.message_open_stats (
  organisation_id UUID NOT NULL REFERENCES iam.organisations(id) ON DELETE CASCADE,
  message_id UUID NOT NULL,

  first_open_at TIMESTAMPTZ NULL,
  last_open_at  TIMESTAMPTZ NULL,
  total_opens BIGINT NOT NULL DEFAULT 0 CHECK (total_opens >= 0),
  unique_opens BIGINT NOT NULL DEFAULT 0 CHECK (unique_opens >= 0),

  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (organisation_id, message_id),

  CONSTRAINT fk_open_stats_message_same_org
    FOREIGN KEY (organisation_id, message_id)
    REFERENCES outreach.messages(organisation_id, id)
    ON DELETE CASCADE
);

CREATE INDEX idx_open_stats_org_last_open
  ON tracking.message_open_stats(organisation_id, last_open_at);
