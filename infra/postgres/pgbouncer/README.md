# PgBouncer Configuration

## Overview

PgBouncer is a lightweight connection pooler for PostgreSQL. It reduces the overhead of opening and closing database connections by maintaining a pool of connections to PostgreSQL.

## Current Setup

- **Image**: `edoburu/pgbouncer:latest` - Pre-configured image with simple env-based configuration
- **Port**: `6432` (exposed on localhost only for security)
- **Pool Mode**: `transaction` - Most efficient for web applications
- **Max Connections**: 100 client connections
- **Default Pool Size**: 25 server connections per database

## Connection String

Applications should connect to PgBouncer instead of directly to PostgreSQL:

```bash
# Development (local)
postgresql://prospectflow:changeme@localhost:6432/prospectflow

# Production (from containers)
postgresql://prospectflow:password@prospectflow-pgbouncer:5432/prospectflow
```

## Why edoburu/pgbouncer?

The official `pgbouncer/pgbouncer` image requires complex configuration files and custom entrypoints. The `edoburu/pgbouncer` image provides:

- ✅ Simple environment variable configuration
- ✅ Works with `DATABASE_URL` (12-factor app compatible)
- ✅ Maintained and well-tested
- ✅ Minimal image size
- ✅ No custom entrypoint scripts needed

## Configuration Options

Set via environment variables in `docker-compose.yaml`:

| Variable            | Default       | Description                                    |
| ------------------- | ------------- | ---------------------------------------------- |
| `DATABASE_URL`      | Required      | PostgreSQL connection string                   |
| `POOL_MODE`         | `transaction` | Pooling mode (session, transaction, statement) |
| `MAX_CLIENT_CONN`   | `100`         | Maximum client connections                     |
| `DEFAULT_POOL_SIZE` | `25`          | Server connections per database                |

## Health Check

```bash
# Check PgBouncer status
docker exec prospectflow-pgbouncer pg_isready -h localhost -p 5432

# View pool statistics
psql -h localhost -p 6432 -U prospectflow -d pgbouncer -c "SHOW POOLS;"
```

## Troubleshooting

### Container restarts continuously

**Symptom**: `pgbouncer: not found` error

**Cause**: Custom entrypoint script overrides the image's built-in pgbouncer binary

**Solution**: Use `edoburu/pgbouncer` image which handles configuration via environment variables

### Connection refused

1. Check PgBouncer is running: `docker ps | grep pgbouncer`
2. Check logs: `docker logs prospectflow-pgbouncer`
3. Verify PostgreSQL is healthy: `docker exec prospectflow-postgres pg_isready`
4. Test connection: `psql -h localhost -p 6432 -U prospectflow -d prospectflow`

## References

- [PgBouncer Official Docs](https://www.pgbouncer.org/)
- [edoburu/pgbouncer Image](https://hub.docker.com/r/edoburu/pgbouncer)
- [Pool Mode Explanation](https://www.pgbouncer.org/config.html#pool_mode)
