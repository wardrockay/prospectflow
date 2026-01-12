#!/bin/sh
set -e

# Substitute environment variables in template
envsubst < /etc/alertmanager/alertmanager.yml.template > /etc/alertmanager/alertmanager.yml

# Start alertmanager with provided arguments
exec /bin/alertmanager "$@"
