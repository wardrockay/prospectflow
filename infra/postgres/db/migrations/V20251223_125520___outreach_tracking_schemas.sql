-- V20251223_125520___outreach_init.sql
-- Domain: outreach
-- Purpose: outreach init

-- Write safe migrations:
-- 1) add nullable column
-- 2) backfill
-- 3) add NOT NULL / constraints in a later migration

CREATE SCHEMA IF NOT EXISTS outreach;
CREATE SCHEMA IF NOT EXISTS tracking;
