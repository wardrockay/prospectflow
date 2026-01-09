#!/bin/bash

# Smoke Test Script for Cognito JWT Validation
# Usage: ./smoke-test.sh [create-user|generate-token|test-endpoint|cleanup]

set -e

# Load Terraform outputs
TERRAFORM_DIR="../../infra/cognito/terraform"
USER_POOL_ID=$(cd $TERRAFORM_DIR && terraform output -raw user_pool_id)
CLIENT_ID=$(cd $TERRAFORM_DIR && terraform output -raw app_client_id)
HOSTED_UI_URL=$(cd $TERRAFORM_DIR && terraform output -raw hosted_ui_url)

TEST_USER_EMAIL="test-admin@prospectflow.com"
TEST_USER_PASSWORD="TestPass123!"
TEST_ORG_ID="test-org-001"
TEST_ROLE="admin"
API_ENDPOINT="http://localhost:3003/api/v1/auth/test"

function create_user() {
  echo "🔧 Creating test user in Cognito..."
  
  # Create user
  aws cognito-idp admin-create-user \
    --user-pool-id "$USER_POOL_ID" \
    --username "$TEST_USER_EMAIL" \
    --user-attributes \
      Name=email,Value="$TEST_USER_EMAIL" \
      Name=email_verified,Value=true \
      Name=custom:organisation_id,Value="$TEST_ORG_ID" \
      Name=custom:role,Value="$TEST_ROLE" \
    --message-action SUPPRESS \
    --region eu-west-1
  
  # Set permanent password
  aws cognito-idp admin-set-user-password \
    --user-pool-id "$USER_POOL_ID" \
    --username "$TEST_USER_EMAIL" \
    --password "$TEST_USER_PASSWORD" \
    --permanent \
    --region eu-west-1
  
  # Add to admin group
  aws cognito-idp admin-add-user-to-group \
    --user-pool-id "$USER_POOL_ID" \
    --username "$TEST_USER_EMAIL" \
    --group-name admin \
    --region eu-west-1
  
  echo "✅ User created successfully"
  echo "   Email: $TEST_USER_EMAIL"
  echo "   Password: $TEST_USER_PASSWORD"
  echo "   Organisation ID: $TEST_ORG_ID"
  echo "   Role: $TEST_ROLE"
  echo "   Group: admin"
}

function generate_token() {
  echo "🔑 Generating JWT token..."
  echo ""
  echo "⚠️  Manual step required:"
  echo "1. Open browser: $HOSTED_UI_URL/login?client_id=$CLIENT_ID&response_type=code&scope=email+openid+phone+profile&redirect_uri=http://localhost:3000"
  echo "2. Login with:"
  echo "   Email: $TEST_USER_EMAIL"
  echo "   Password: $TEST_USER_PASSWORD"
  echo "3. Copy the 'id_token' from the URL after redirect"
  echo "4. Save it to test-token.txt"
  echo ""
  echo "Alternative: Use AWS CLI to get tokens"
  echo ""
  
  # Programmatic auth (if auth flow allows)
  echo "Attempting programmatic authentication..."
  
  AUTH_RESPONSE=$(aws cognito-idp initiate-auth \
    --auth-flow USER_PASSWORD_AUTH \
    --client-id "$CLIENT_ID" \
    --auth-parameters \
      USERNAME="$TEST_USER_EMAIL",PASSWORD="$TEST_USER_PASSWORD" \
    --region eu-west-1 2>/dev/null || echo "")
  
  if [ -n "$AUTH_RESPONSE" ]; then
    ID_TOKEN=$(echo "$AUTH_RESPONSE" | jq -r '.AuthenticationResult.IdToken')
    if [ "$ID_TOKEN" != "null" ] && [ -n "$ID_TOKEN" ]; then
      echo "$ID_TOKEN" > test-token.txt
      echo "✅ Token generated and saved to test-token.txt"
      echo "Token preview: ${ID_TOKEN:0:50}..."
      return 0
    fi
  fi
  
  echo "❌ Programmatic auth failed (may not be enabled). Use Hosted UI method above."
  return 1
}

function test_endpoint() {
  echo "🧪 Testing auth endpoint..."
  
  if [ ! -f test-token.txt ]; then
    echo "❌ test-token.txt not found. Run: ./smoke-test.sh generate-token first"
    exit 1
  fi
  
  TOKEN=$(cat test-token.txt)
  
  echo ""
  echo "Test 1: Valid token (should return 200)"
  curl -s -w "\nHTTP Status: %{http_code}\n" \
    -H "Authorization: Bearer $TOKEN" \
    "$API_ENDPOINT" | jq '.'
  
  echo ""
  echo "Test 2: Missing token (should return 401)"
  curl -s -w "\nHTTP Status: %{http_code}\n" \
    "$API_ENDPOINT" | jq '.'
  
  echo ""
  echo "Test 3: Invalid token (should return 401)"
  curl -s -w "\nHTTP Status: %{http_code}\n" \
    -H "Authorization: Bearer invalid.token.here" \
    "$API_ENDPOINT" | jq '.'
  
  echo ""
  echo "✅ All tests completed"
}

function cleanup() {
  echo "🧹 Cleaning up test user..."
  
  aws cognito-idp admin-delete-user \
    --user-pool-id "$USER_POOL_ID" \
    --username "$TEST_USER_EMAIL" \
    --region eu-west-1
  
  rm -f test-token.txt
  
  echo "✅ Cleanup completed"
}

# Main
case "${1:-}" in
  create-user)
    create_user
    ;;
  generate-token)
    generate_token
    ;;
  test-endpoint)
    test_endpoint
    ;;
  cleanup)
    cleanup
    ;;
  *)
    echo "Usage: $0 {create-user|generate-token|test-endpoint|cleanup}"
    echo ""
    echo "Commands:"
    echo "  create-user      - Create test user in Cognito"
    echo "  generate-token   - Generate JWT token for test user"
    echo "  test-endpoint    - Test /auth/test endpoint with token"
    echo "  cleanup          - Delete test user and token file"
    echo ""
    echo "Example workflow:"
    echo "  $0 create-user"
    echo "  $0 generate-token"
    echo "  $0 test-endpoint"
    echo "  $0 cleanup"
    exit 1
    ;;
esac
