output "user_pool_id" {
  description = "The ID of the Cognito User Pool"
  value       = aws_cognito_user_pool.main.id
}

output "user_pool_arn" {
  description = "The ARN of the Cognito User Pool"
  value       = aws_cognito_user_pool.main.arn
}

output "app_client_id" {
  description = "The ID of the Cognito App Client"
  value       = aws_cognito_user_pool_client.api_client.id
}

output "issuer_url" {
  description = "The issuer URL for JWT token validation"
  value       = "https://cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.main.id}"
}

output "hosted_ui_url" {
  description = "The Cognito Hosted UI URL"
  value       = "https://${aws_cognito_user_pool_domain.main.domain}.auth.${var.aws_region}.amazoncognito.com"
}

output "cognito_domain" {
  description = "The Cognito domain prefix"
  value       = aws_cognito_user_pool_domain.main.domain
}
