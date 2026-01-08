#!/bin/sh

set -eu

: "${PGBOUNCER_LISTEN_PORT:=5432}"
: "${PGBOUNCER_MAX_CLIENT_CONN:=100}"
: "${PGBOUNCER_DEFAULT_POOL_SIZE:=25}"
: "${PGBOUNCER_POOL_MODE:=transaction}"

: "${PGBOUNCER_DB_HOST:=postgres}"
: "${PGBOUNCER_DB_PORT:=5432}"

: "${POSTGRES_DB:=prospectflow}"

: "${APP_DB_USER:=prospectflow_app}"
: "${APP_DB_PASSWORD:=changeme_app}"

mkdir -p /etc/pgbouncer

# pgbouncer expects md5(password + username)
md5_hash="$(printf '%s%s' "$APP_DB_PASSWORD" "$APP_DB_USER" | md5sum | awk '{print $1}')"

cat > /etc/pgbouncer/userlist.txt <<EOF
"$APP_DB_USER" "md5$md5_hash"
EOF

cat > /etc/pgbouncer/pgbouncer.ini <<EOF
[databases]
$POSTGRES_DB = host=$PGBOUNCER_DB_HOST port=$PGBOUNCER_DB_PORT dbname=$POSTGRES_DB

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = $PGBOUNCER_LISTEN_PORT

auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

pool_mode = $PGBOUNCER_POOL_MODE
max_client_conn = $PGBOUNCER_MAX_CLIENT_CONN
default_pool_size = $PGBOUNCER_DEFAULT_POOL_SIZE

ignore_startup_parameters = extra_float_digits
EOF

exec pgbouncer /etc/pgbouncer/pgbouncer.ini
