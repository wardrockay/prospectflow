#!/bin/sh

set -eu

: "${POSTGRES_USER:=prospectflow}"
: "${POSTGRES_DB:=prospectflow}"

: "${APP_DB_PASSWORD:=changeme_app}"

# This script runs only on first init (empty data directory)
# It creates a non-superuser app login role.

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<EOF
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'prospectflow_app') THEN
    CREATE ROLE prospectflow_app
      LOGIN
      PASSWORD '${APP_DB_PASSWORD}'
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOREPLICATION;
  END IF;
END $$;
EOF
