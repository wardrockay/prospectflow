#!/bin/bash
set -e

# Load environment variables
if [ -f ../../apps/ingest-api/env/.env.production ]; then
    export $(grep -v '^#' ../../apps/ingest-api/env/.env.production | xargs)
fi

# Check if PAGERDUTY_ROUTING_KEY is set
if [ -z "$PAGERDUTY_ROUTING_KEY" ]; then
    echo "Error: PAGERDUTY_ROUTING_KEY is not set in .env.production"
    exit 1
fi

# Generate alertmanager.yml from template
echo "Generating alertmanager.yml with PAGERDUTY_ROUTING_KEY..."
envsubst < alertmanager.yml.template > alertmanager.yml

echo "✓ Configuration generated successfully"
echo "  Using routing key: ${PAGERDUTY_ROUTING_KEY:0:20}..."
