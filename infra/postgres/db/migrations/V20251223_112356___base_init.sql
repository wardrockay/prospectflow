-- V20251223_112356___base_init.sql
-- Domain: --
-- Purpose: base init
-- NOTE: OVH CloudDB managed PostgreSQL does not allow custom schemas
-- Using public schema with table prefixes: iam_*, crm_*, outreach_*, lm_*

-- Write safe migrations:
-- 1) add nullable column
-- 2) backfill
-- 3) add NOT NULL / constraints in a later migration

-- OVH CloudDB: Extensions must be enabled by database admin, not via Flyway
-- If these fail, connect with admin user and run:
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- CREATE EXTENSION IF NOT EXISTS citext;
-- Then uncomment these lines:
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- CREATE EXTENSION IF NOT EXISTS citext;

-- OVH CloudDB: Cannot create custom schemas, use table prefixes instead
-- CREATE SCHEMA IF NOT EXISTS iam;
-- CREATE SCHEMA IF NOT EXISTS crm;

-- Helper: auto update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
