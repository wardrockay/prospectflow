# Authentication Troubleshooting Guide

## Common Issues and Solutions

### 1. JWT Validation Errors

#### Error: "Invalid token"

**Symptoms:**

```json
{
  "error": "Unauthorized",
  "message": "Invalid token"
}
```

**Possible Causes:**

- Token signature doesn't match Cognito public keys
- Token was issued by a different User Pool
- Token client ID doesn't match configured `COGNITO_CLIENT_ID`

**Solutions:**

1. Verify environment variables match Terraform outputs:

   ```bash
   cd infra/cognito/terraform
   echo "Expected Pool ID: $(terraform output -raw user_pool_id)"
   echo "Expected Client ID: $(terraform output -raw app_client_id)"
   ```

2. Check token claims match configuration:

   ```bash
   # Decode JWT (header.payload.signature)
   echo $TOKEN | cut -d'.' -f2 | base64 -d | jq .
   ```

   Verify `iss` and `aud` claims.

3. Ensure User Pool ID format is correct: `eu-west-1_XXXXXXXXX`

---

#### Error: "Token expired"

**Symptoms:**

```json
{
  "error": "Unauthorized",
  "message": "Token expired"
}
```

**Solutions:**

1. Get a fresh token by re-authenticating via Hosted UI
2. Check system clock synchronization:
   ```bash
   timedatectl status
   ```
3. Cognito access tokens expire after 1 hour by default

---

#### Error: "No authorization header provided"

**Symptoms:**

```json
{
  "error": "Unauthorized",
  "message": "No authorization header provided"
}
```

**Solutions:**

1. Include `Authorization` header in request:

   ```bash
   curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/v1/endpoint
   ```

2. Verify header format is `Bearer <token>` (note the space)

---

### 2. Session Errors

#### Error: "Session service unavailable"

**Symptoms:**

```json
{
  "error": "Session service unavailable",
  "code": "REDIS_UNAVAILABLE"
}
```

**Possible Causes:**

- Redis container not running
- Redis connection refused
- Incorrect Redis host/port configuration

**Solutions:**

1. Check Redis container status:

   ```bash
   cd infra/redis
   docker-compose ps
   docker-compose logs redis
   ```

2. Verify Redis is responding:

   ```bash
   redis-cli -h localhost -p 6379 ping
   # Expected: PONG
   ```

3. Check environment variables:

   ```bash
   echo $REDIS_HOST  # Should be 'localhost' or container name
   echo $REDIS_PORT  # Should be 6379
   ```

4. Restart Redis:
   ```bash
   docker-compose restart redis
   ```

---

#### Error: "Session not found" (unexpected)

**Symptoms:**

- First request creates session
- Subsequent request doesn't find session

**Possible Causes:**

- Redis memory full (eviction triggered)
- TTL too short
- Different `cognito_sub` between requests

**Solutions:**

1. Check Redis memory usage:

   ```bash
   redis-cli info memory
   ```

2. Verify session exists:

   ```bash
   redis-cli keys "session:*"
   redis-cli get "session:<cognito_sub>"
   ```

3. Check TTL:
   ```bash
   redis-cli ttl "session:<cognito_sub>"
   # Should be > 0 (seconds remaining)
   ```

---

### 3. Organisation / Multi-Tenant Errors

#### Error: "User not assigned to an organisation"

**Symptoms:**

```json
{
  "error": "User not assigned to an organisation",
  "code": "MISSING_ORGANISATION"
}
```

**Possible Causes:**

- Cognito user missing `custom:organisation_id` attribute
- Attribute not included in JWT claims

**Solutions:**

1. Verify user attributes in AWS Console:

   - Cognito → User Pools → Users → Select user
   - Check custom attributes section

2. Add organisation_id via CLI:

   ```bash
   aws cognito-idp admin-update-user-attributes \
     --user-pool-id <pool-id> \
     --username <email> \
     --user-attributes Name=custom:organisation_id,Value=<org-uuid>
   ```

3. Ensure app client includes custom attributes in claims:
   - Cognito → App clients → Edit
   - Read/Write attributes must include `custom:organisation_id`

---

#### Error: "Access denied: resource belongs to a different organisation"

**Symptoms:**

```json
{
  "error": "Access denied: prospect belongs to a different organisation",
  "code": "CROSS_TENANT_ACCESS_DENIED"
}
```

**Cause:**
This is **expected behavior** - user is trying to access a resource from another organisation.

**Solutions:**

1. Verify resource ownership:

   ```sql
   SELECT id, organisation_id FROM <table> WHERE id = '<resource-id>';
   ```

2. Verify user's organisation:

   ```bash
   redis-cli get "session:<cognito_sub>" | jq .organisationId
   ```

3. If legitimate access needed, update resource's `organisation_id` or user's `organisation_id`

---

### 4. User Synchronization Errors

#### Error: "User synchronization failed"

**Possible Causes:**

- Database connection failed
- Missing required fields in JWT
- Race condition on first login

**Solutions:**

1. Check database connectivity:

   ```bash
   psql -h localhost -U postgres -d prospectflow -c "SELECT 1"
   ```

2. Verify JWT has required claims:

   ```bash
   echo $TOKEN | cut -d'.' -f2 | base64 -d | jq '{sub, email, "custom:organisation_id", "custom:role"}'
   ```

3. Check for duplicate user (race condition):
   ```sql
   SELECT * FROM iam.users WHERE cognito_sub = '<sub>';
   ```

---

### 5. Debug Checklist

When troubleshooting, check in order:

#### Infrastructure

- [ ] Redis container running: `docker-compose ps`
- [ ] PostgreSQL accessible: `psql -c "SELECT 1"`
- [ ] Environment variables set correctly

#### Token

- [ ] Token not expired: check `exp` claim
- [ ] Correct issuer (`iss`): matches `COGNITO_ISSUER`
- [ ] Correct audience (`aud`): matches `COGNITO_CLIENT_ID`
- [ ] Has required claims: `sub`, `email`, `custom:organisation_id`

#### Session

- [ ] Session exists in Redis: `redis-cli get "session:*"`
- [ ] Session has organisationId
- [ ] Session not expired: `redis-cli ttl "session:*"`

#### Multi-tenant

- [ ] Request includes correct organisation context
- [ ] Resource belongs to user's organisation
- [ ] Service includes organisation filter in query

---

### 6. Log Analysis

#### Enable Debug Logging

Set environment variable:

```bash
LOG_LEVEL=debug
```

#### Key Log Entries to Look For

**Successful authentication:**

```
INFO: Session created for user abc123...
DEBUG: Organisation scope attached { organisationId: "org-uuid" }
```

**Failed authentication:**

```
ERROR: Token verification failed: Token expired
WARN: Cross-tenant access attempt blocked
```

#### View Logs

```bash
# Application logs
docker-compose logs -f ingest-api

# Filter by level
docker-compose logs ingest-api 2>&1 | grep ERROR
```

---

### 7. Testing Authentication Manually

#### Get Token via Hosted UI

```bash
# Open in browser
open "https://prospectflow-dev.auth.eu-west-1.amazoncognito.com/login?client_id=<client_id>&response_type=code&scope=openid+email+profile&redirect_uri=http://localhost:3000/auth/callback"
```

#### Decode and Inspect Token

```bash
# Decode JWT payload
decode_jwt() {
  echo "$1" | cut -d'.' -f2 | base64 -d 2>/dev/null | jq .
}

decode_jwt $TOKEN
```

#### Test Protected Endpoint

```bash
# Should return 200 with user info
curl -v -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/health

# Should return 401
curl -v http://localhost:3000/api/v1/protected
```

#### Inspect Session in Redis

```bash
# List all sessions
redis-cli keys "session:*"

# Get session data
redis-cli get "session:<cognito_sub>" | jq .

# Check TTL
redis-cli ttl "session:<cognito_sub>"

# Delete session (simulate logout)
redis-cli del "session:<cognito_sub>"
```

---

### 8. Contact Support

If issues persist after following this guide:

1. Collect diagnostic information:

   - Environment variables (redact secrets)
   - Decoded JWT payload (redact signature)
   - Redis session data
   - Application logs (last 100 lines)

2. Create issue with:
   - Steps to reproduce
   - Expected vs actual behavior
   - Diagnostic information from step 1
