#!/bin/sh
set -e

# Create pgbouncer directories
mkdir -p /etc/pgbouncer

# Generate userlist.txt with MD5 hash
# pgbouncer expects: "username" "md5" + md5(password + username)
if [ -n "$DB_PASSWORD" ] && [ -n "$DB_USER" ]; then
    # Calculate MD5 hash: md5(password + username)
    HASH=$(printf '%s%s' "$DB_PASSWORD" "$DB_USER" | md5sum | awk '{print $1}')
    echo "\"$DB_USER\" \"md5$HASH\"" > /etc/pgbouncer/userlist.txt
    chmod 600 /etc/pgbouncer/userlist.txt
    echo "✅ Created userlist.txt for user: $DB_USER"
else
    echo "⚠️  DB_USER and DB_PASSWORD must be set"
    exit 1
fi

# Generate pgbouncer.ini
cat > /etc/pgbouncer/pgbouncer.ini <<EOF
[databases]
${DB_NAME:-*} = host=${DB_HOST:-postgres} port=${DB_PORT:-5432} dbname=${DB_NAME:-*}

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = ${PGBOUNCER_PORT:-6432}

auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

pool_mode = ${PGBOUNCER_POOL_MODE:-transaction}
max_client_conn = ${PGBOUNCER_MAX_CLIENT_CONN:-100}
default_pool_size = ${PGBOUNCER_DEFAULT_POOL_SIZE:-25}

# Connection settings
server_reset_query = DISCARD ALL
server_check_delay = 30
server_lifetime = 3600
server_idle_timeout = 600

# Logging
log_connections = 1
log_disconnections = 1
log_pooler_errors = 1

# Avoid startup parameter issues
ignore_startup_parameters = extra_float_digits,options

# Allow admin access
admin_users = ${DB_USER}
EOF

chmod 600 /etc/pgbouncer/pgbouncer.ini
echo "✅ Created pgbouncer.ini"
echo ""
echo "🚀 Starting PgBouncer..."

# Start pgbouncer (binary location in official image)
exec /opt/pgbouncer/pgbouncer /etc/pgbouncer/pgbouncer.ini
