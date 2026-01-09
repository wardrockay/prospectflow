# Redis Infrastructure for ProspectFlow

Session storage for authentication and caching.

## Quick Start

```bash
# Start Redis
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f redis

# Test connection
redis-cli ping
# Expected output: PONG

# Stop Redis
docker-compose down
```

## Configuration

- **Memory**: 256MB limit with LRU eviction
- **Persistence**: AOF + RDB snapshots
- **Port**: 6379 (default)
- **Network**: prospectflow-network

## Data Persistence

Data is stored in `./data/` directory:
- `dump.rdb`: RDB snapshot
- `appendonly.aof`: AOF log

## Health Check

Redis container has automatic health monitoring:
- Interval: 10 seconds
- Timeout: 3 seconds
- Retries: 3

## Session Management Commands

```bash
# List all session keys
redis-cli keys "session:*"

# Get session data
redis-cli get "session:<cognito_sub>"

# Delete specific session
redis-cli del "session:<cognito_sub>"

# Delete all sessions
redis-cli --scan --pattern "session:*" | xargs redis-cli del

# Monitor session activity in real-time
redis-cli monitor

# Check memory usage
redis-cli info memory
```

## Backup & Restore

```bash
# Manual backup (creates dump.rdb)
redis-cli bgsave

# Check backup status
redis-cli lastsave

# Restore: Stop Redis, replace dump.rdb, restart
docker-compose down
cp backup/dump.rdb ./data/dump.rdb
docker-compose up -d
```

## Troubleshooting

### Container won't start
```bash
# Check logs
docker-compose logs redis

# Verify configuration
redis-cli config get *

# Reset data (⚠️ deletes all data)
rm -rf ./data/*
docker-compose up -d
```

### Memory issues
```bash
# Check memory usage
redis-cli info memory

# Check eviction stats
redis-cli info stats | grep evicted
```

### Connection issues
```bash
# Test from host
redis-cli -h localhost -p 6379 ping

# Test from another container
docker run --rm --network prospectflow-network redis:7-alpine redis-cli -h prospectflow-redis ping
```

## Production Considerations

For production deployment:

1. **Enable Authentication**: Uncomment `requirepass` in redis.conf
2. **Network Security**: Use private network or firewall rules
3. **Backups**: Set up automated backup schedule
4. **Monitoring**: Integrate with Prometheus/Grafana
5. **High Availability**: Consider Redis Sentinel or Redis Cluster
6. **Resource Limits**: Increase memory limit if needed

## Links

- [Redis Documentation](https://redis.io/documentation)
- [Redis Security Best Practices](https://redis.io/topics/security)
