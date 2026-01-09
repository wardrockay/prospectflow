# Cognito Authentication - Smoke Test

## Overview

This smoke test validates that Phase 1 of the AWS Cognito Authentication Integration works end-to-end with real JWT tokens.

## Prerequisites

- AWS CLI configured with credentials
- Terraform applied (Cognito User Pool created)
- API server running locally on port 3003
- `jq` installed for JSON parsing

## Test Flow

### 1. Create Test User

```bash
cd apps/ingest-api
./smoke-test.sh create-user
```

This creates a test user with:

- Email: `test-admin@prospectflow.com`
- Password: `TestPass123!`
- Custom attributes: `organisation_id=test-org-001`, `role=admin`
- Group: `admin`

### 2. Generate JWT Token

```bash
./smoke-test.sh generate-token
```

This attempts to programmatically authenticate and save the JWT token to `test-token.txt`.

If programmatic auth fails (USER_PASSWORD_AUTH not enabled on app client), follow the manual steps:

1. Open the provided Hosted UI URL in browser
2. Login with test user credentials
3. Copy the `id_token` from the redirect URL
4. Save it to `test-token.txt`

### 3. Start API Server

In a separate terminal:

```bash
cd apps/ingest-api
pnpm dev
```

Server should start on `http://localhost:3003`

### 4. Test Authentication Endpoint

```bash
./smoke-test.sh test-endpoint
```

This runs three tests:

**Test 1: Valid Token (200)**

```bash
curl -H "Authorization: Bearer <token>" http://localhost:3003/api/v1/auth/test
```

Expected: 200 OK with decoded user payload

**Test 2: Missing Token (401)**

```bash
curl http://localhost:3003/api/v1/auth/test
```

Expected: 401 Unauthorized

**Test 3: Invalid Token (401)**

```bash
curl -H "Authorization: Bearer invalid.token" http://localhost:3003/api/v1/auth/test
```

Expected: 401 Unauthorized

### 5. Cleanup

```bash
./smoke-test.sh cleanup
```

This deletes the test user and removes `test-token.txt`.

## Expected Results

### Valid Token Response (200)

```json
{
  "success": true,
  "message": "Authentication successful",
  "user": {
    "sub": "12345-67890-abcdef",
    "email": "test-admin@prospectflow.com",
    "email_verified": true,
    "custom:organisation_id": "test-org-001",
    "custom:role": "admin",
    "cognito:groups": ["admin"],
    "iss": "https://cognito-idp.eu-west-1.amazonaws.com/eu-west-1_xxxxx",
    "token_use": "id",
    "aud": "client-id-here",
    "exp": 1234567890,
    "iat": 1234567890
  },
  "timestamp": "2026-01-09T19:30:00.000Z"
}
```

### Missing Token Response (401)

```json
{
  "error": "Unauthorized",
  "message": "No authorization header provided"
}
```

### Invalid Token Response (401)

```json
{
  "error": "Unauthorized",
  "message": "Invalid token",
  "details": "Token verification failed"
}
```

## Troubleshooting

### Issue: Programmatic auth fails

**Solution**: The app client may not have USER_PASSWORD_AUTH enabled. Use the manual Hosted UI method instead.

To enable programmatic auth:

```bash
cd ../../infra/cognito/terraform
# Add to app_client.tf:
explicit_auth_flows = ["USER_PASSWORD_AUTH", ...]
terraform apply
```

### Issue: Token verification fails with "invalid signature"

**Solution**: Verify Cognito config matches Terraform outputs:

```bash
cd ../../infra/cognito/terraform
terraform output
```

Check `apps/ingest-api/src/config/cognito.ts` has matching values.

### Issue: API returns 500 instead of 401

**Solution**: Check API logs for errors. Likely causes:

- Cognito config mismatch (region, userPoolId, clientId)
- Network issue reaching Cognito public keys endpoint
- Middleware not properly initialized

### Issue: Token expired

**Solution**: Tokens are valid for 1 hour by default. Regenerate:

```bash
./smoke-test.sh generate-token
```

## Acceptance Criteria Checklist

- [ ] Test user created in Cognito with custom attributes
- [ ] JWT token successfully generated
- [ ] Valid token returns 200 with decoded payload
- [ ] Missing token returns 401
- [ ] Invalid token returns 401
- [ ] Expired token returns 401 (wait 1 hour or manipulate token)
- [ ] `req.user` contains expected claims (sub, email, organisation_id, groups)

## Next Steps

After smoke test passes:

- Proceed to Phase 2: Session Management & User Sync
- Implement Redis session storage
- Create user sync service
- Add auth routes (login, logout, refresh)

## Files Created

```
apps/ingest-api/
├── src/
│   ├── routes/
│   │   └── auth.test.routes.ts    # Test endpoint
│   ├── middlewares/
│   │   └── cognito-auth.middleware.ts  # Already exists
│   └── config/
│       └── cognito.ts              # Already exists
├── smoke-test.sh                   # This smoke test script
└── COGNITO_SMOKE_TEST.md          # This documentation
```
