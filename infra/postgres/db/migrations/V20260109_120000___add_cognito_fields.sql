-- Add Cognito sub (subject) identifier to users table
-- Migration: V6__add_cognito_fields.sql
-- Purpose: Link Cognito users to internal user records

ALTER TABLE public.iam_users
ADD COLUMN cognito_sub VARCHAR(255) UNIQUE;

-- Index for fast lookups during authentication
CREATE INDEX idx_users_cognito_sub
ON public.iam_users(cognito_sub);

-- Add comment for documentation
COMMENT ON COLUMN public.iam_users.cognito_sub IS
'AWS Cognito User Pool subject identifier (sub claim from JWT)';
