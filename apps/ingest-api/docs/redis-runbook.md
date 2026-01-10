# Redis Runbook

## Overview

Redis serves as the session store for ProspectFlow authentication. This runbook covers operational procedures for managing the Redis instance.

## Infrastructure Details

| Property        | Value             |
| --------------- | ----------------- |
| Image           | `redis:7-alpine`  |
| Port            | 6379              |
| Memory Limit    | 256MB             |
| Eviction Policy | allkeys-lru       |
| Persistence     | AOF + RDB         |
| Session TTL     | 24 hours (86400s) |

## Container Management

### Start Redis

```bash
cd infra/redis
docker-compose up -d
```

### Stop Redis

```bash
cd infra/redis
docker-compose stop redis
```

### Restart Redis

```bash
cd infra/redis
docker-compose restart redis
```

### View Status

```bash
docker-compose ps
docker-compose logs -f redis
```

### Full Shutdown (with data)

```bash
docker-compose down
# Data persists in ./data directory
```

### Full Cleanup (destroy data)

```bash
docker-compose down -v
rm -rf data/*
```

## Health Checks

### Basic Health Check

```bash
redis-cli ping
# Expected: PONG
```

### Connection Test

```bash
redis-cli -h localhost -p 6379 info server | head -20
```

### Memory Status

```bash
redis-cli info memory
```

Key metrics to monitor:

- `used_memory`: Current memory usage
- `used_memory_peak`: Peak memory usage
- `maxmemory`: Configured limit (268435456 = 256MB)
- `maxmemory_policy`: Should be `allkeys-lru`

### Replication Status

```bash
redis-cli info replication
# For single-node: role:master
```

## Session Inspection

### List All Sessions

```bash
redis-cli keys "session:*"
```

### Count Active Sessions

```bash
redis-cli keys "session:*" | wc -l
```

### View Session Data

```bash
# Get raw data
redis-cli get "session:<cognito_sub>"

# Pretty print (requires jq)
redis-cli get "session:<cognito_sub>" | jq .
```

### Check Session TTL

```bash
redis-cli ttl "session:<cognito_sub>"
# Returns seconds remaining, -1 if no TTL, -2 if key doesn't exist
```

### Delete Single Session

```bash
redis-cli del "session:<cognito_sub>"
```

### Delete All Sessions (Emergency)

```bash
redis-cli keys "session:*" | xargs redis-cli del
```

### Delete Sessions by Organisation

```bash
# Script to find and delete sessions for an organisation
ORG_ID="target-org-uuid"

for key in $(redis-cli keys "session:*"); do
  org=$(redis-cli get "$key" | jq -r .organisationId)
  if [ "$org" == "$ORG_ID" ]; then
    echo "Deleting $key"
    redis-cli del "$key"
  fi
done
```

## Persistence Management

### Force RDB Snapshot

```bash
redis-cli bgsave
```

### Check Persistence Status

```bash
redis-cli info persistence
```

Key metrics:

- `rdb_last_save_time`: Unix timestamp of last RDB save
- `aof_enabled`: Should be 1
- `aof_last_rewrite_time_sec`: Time of last AOF rewrite

### Verify Data Files

```bash
ls -la infra/redis/data/
# Should see:
# - dump.rdb (RDB snapshot)
# - appendonly.aof (AOF log)
```

## Backup and Restore

### Manual Backup

```bash
# Stop writes temporarily (optional but recommended)
redis-cli bgsave

# Copy data files
cp infra/redis/data/dump.rdb backup/redis-$(date +%Y%m%d-%H%M%S).rdb
cp infra/redis/data/appendonly.aof backup/redis-$(date +%Y%m%d-%H%M%S).aof
```

### Restore from Backup

```bash
# Stop Redis
docker-compose stop redis

# Copy backup files
cp backup/redis-YYYYMMDD.rdb infra/redis/data/dump.rdb
cp backup/redis-YYYYMMDD.aof infra/redis/data/appendonly.aof

# Start Redis
docker-compose start redis

# Verify data
redis-cli keys "session:*" | wc -l
```

### Automated Backup (Cron)

Add to crontab:

```bash
# Daily backup at 3 AM
0 3 * * * cd /path/to/infra/redis && docker exec redis redis-cli bgsave && cp data/dump.rdb /backup/redis-$(date +\%Y\%m\%d).rdb
```

## Incident Response

### Redis Unresponsive

**Symptoms:**

- `redis-cli ping` timeout
- API returns 503 "Session service unavailable"

**Steps:**

1. Check container status:

   ```bash
   docker-compose ps
   docker-compose logs --tail=100 redis
   ```

2. Check system resources:

   ```bash
   docker stats redis
   free -m
   df -h
   ```

3. Restart container:

   ```bash
   docker-compose restart redis
   ```

4. If still failing, recreate container:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

### Memory Exhaustion

**Symptoms:**

- `maxmemory` reached
- LRU eviction occurring (sessions being dropped)

**Steps:**

1. Check memory status:

   ```bash
   redis-cli info memory | grep -E "(used_memory|maxmemory)"
   ```

2. Identify largest keys:

   ```bash
   redis-cli --bigkeys
   ```

3. Short-term: Delete old sessions:

   ```bash
   # Find sessions older than 12 hours
   THRESHOLD=$(($(date +%s) - 43200))
   for key in $(redis-cli keys "session:*"); do
     created=$(redis-cli get "$key" | jq -r .createdAt)
     created_sec=$((created / 1000))
     if [ "$created_sec" -lt "$THRESHOLD" ]; then
       redis-cli del "$key"
     fi
   done
   ```

4. Long-term: Increase memory limit in `redis.conf`:
   ```conf
   maxmemory 512mb
   ```

### Data Corruption

**Symptoms:**

- `MISCONF` errors
- AOF/RDB loading failures

**Steps:**

1. Stop Redis:

   ```bash
   docker-compose stop redis
   ```

2. Try AOF repair:

   ```bash
   docker run --rm -v $(pwd)/data:/data redis:7-alpine redis-check-aof --fix /data/appendonly.aof
   ```

3. If AOF corrupted, restore from RDB:

   ```bash
   rm data/appendonly.aof
   docker-compose up -d
   ```

4. If both corrupted, restore from backup or accept data loss:
   ```bash
   rm data/*
   docker-compose up -d
   # Users will need to re-authenticate
   ```

## Performance Tuning

### Monitor Slow Queries

```bash
redis-cli slowlog get 10
```

### Configure Slow Log

In `redis.conf`:

```conf
slowlog-log-slower-than 10000  # 10ms
slowlog-max-len 128
```

### Connection Pooling

The application should use connection pooling. Check current connections:

```bash
redis-cli info clients
```

## Scaling Considerations

### When to Scale

- Memory usage consistently >80% of limit
- Response times >10ms P99
- Connection count approaching limit

### Vertical Scaling (Single Node)

1. Increase memory limit in `redis.conf`:

   ```conf
   maxmemory 512mb
   ```

2. Restart Redis:
   ```bash
   docker-compose restart redis
   ```

### Horizontal Scaling (Redis Cluster)

For high-availability requirements:

1. Consider Redis Sentinel for automatic failover
2. Consider Redis Cluster for sharding
3. Alternative: AWS ElastiCache (managed)

**Note:** Current session design uses single Redis instance. Scaling to cluster requires:

- Update connection configuration
- Consider session stickiness or shared sessions

## Monitoring

### Key Metrics to Monitor

| Metric              | Warning | Critical |
| ------------------- | ------- | -------- |
| Memory usage        | >70%    | >90%     |
| Connected clients   | >100    | >500     |
| Blocked clients     | >0      | >10      |
| Keyspace hits ratio | <90%    | <70%     |
| Latency (ms)        | >5      | >20      |

### Prometheus Metrics (Optional)

Add Redis Exporter:

```yaml
# docker-compose.yaml
services:
  redis-exporter:
    image: oliver006/redis_exporter
    ports:
      - '9121:9121'
    environment:
      - REDIS_ADDR=redis://redis:6379
```

### Alerting (Example)

```yaml
# AlertManager rule example
- alert: RedisDown
  expr: redis_up == 0
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: 'Redis is down'

- alert: RedisMemoryHigh
  expr: redis_memory_used_bytes / redis_memory_max_bytes > 0.8
  for: 5m
  labels:
    severity: warning
```

## Contacts

| Role            | Contact              |
| --------------- | -------------------- |
| Primary On-Call | [Team Slack Channel] |
| Infrastructure  | [Infra Team]         |
| Escalation      | [Engineering Lead]   |
