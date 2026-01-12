resource "aws_cognito_user_pool_client" "api_client" {
  name         = "${var.project_name}-api-client"
  user_pool_id = aws_cognito_user_pool.main.id

  # OAuth flows
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["openid", "email", "profile"]

  # Callback URLs
  # Note: Cognito requires HTTPS for non-localhost URLs
  # For VPS deployment, configure nginx with SSL and use https://vps-ea22871d.vps.ovh.net/auth/callback
  callback_urls = var.environment == "production" ? [
    "https://app.prospectflow.com/auth/callback"
    ] : [
    "http://localhost:4000/auth/callback",
    "http://localhost:5173/auth/callback",
    "https://vps-ea22871d.vps.ovh.net/auth/callback"
  ]

  # Logout URLs
  logout_urls = var.environment == "production" ? [
    "https://app.prospectflow.com/"
    ] : [
    "http://localhost:4000/",
    "http://localhost:5173/",
    "https://vps-ea22871d.vps.ovh.net/"
  ]

  # Supported identity providers
  supported_identity_providers = ["COGNITO"]

  # Token validity
  access_token_validity  = 60  # 1 hour
  id_token_validity      = 60  # 1 hour
  refresh_token_validity = 30  # 30 days

  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "days"
  }

  # Prevent secret generation (for public clients like SPAs)
  generate_secret = false

  # Read and write attributes
  read_attributes = [
    "email",
    "email_verified",
    "custom:organisation_id",
    "custom:role"
  ]

  write_attributes = [
    "email",
    "custom:organisation_id",
    "custom:role"
  ]

  # Explicit attribute mapping
  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH"
  ]
}
