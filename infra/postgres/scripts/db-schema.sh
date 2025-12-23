#!/usr/bin/env bash
set -euo pipefail

DB_NAME=${POSTGRES_DB:-prospectflow}
DB_USER=${POSTGRES_USER:-prospectflow}
CONTAINER=prospectflow-postgres
OUTPUT=db/schema.sql

echo "📸 Generating DB schema snapshot..."

sudo docker exec -i "$CONTAINER" pg_dump \
  --schema-only \
  --no-owner \
  --no-privileges \
  --schema=public \
  --schema=iam \
  --schema=crm \
  --schema=outreach \
  --schema=tracking \
  -U "$DB_USER" \
  "$DB_NAME" \
  > "$OUTPUT"

echo "✅ Schema written to $OUTPUT"
