# AWS Cognito Infrastructure

This directory contains Terraform configuration for AWS Cognito User Pool setup.

## Prerequisites

- AWS CLI installed and configured
- Terraform >= 1.0
- AWS credentials with permissions to create Cognito resources

## Quick Start

```bash
cd infra/cognito/terraform

# Initialize Terraform
terraform init

# Review planned changes
terraform plan

# Apply infrastructure
terraform apply

# Save outputs for application configuration
terraform output -json > outputs.json
```

## Configuration

Edit `terraform.tfvars` to customize:

- `environment`: dev, staging, or production
- `project_name`: Project identifier (default: prospectflow)
- `aws_region`: AWS region (default: eu-west-1)

## Resources Created

- **Cognito User Pool**: Main authentication service
- **App Client**: OAuth 2.0 client for API access
- **User Groups**: admin, user, viewer
- **Hosted UI Domain**: Login interface

## Custom Attributes

- `organisation_id` (String): Links user to their tenant organization
- `role` (String): User's role within organization

## Outputs

After applying, the following values are available:

- `user_pool_id`: Required for API configuration
- `app_client_id`: Required for frontend OAuth flow
- `issuer_url`: JWT validation endpoint
- `hosted_ui_url`: Login page URL

## Environment Variables

Copy these outputs to your application's `.env`:

```bash
AWS_REGION=<aws_region from outputs>
COGNITO_USER_POOL_ID=<user_pool_id from outputs>
COGNITO_CLIENT_ID=<app_client_id from outputs>
COGNITO_ISSUER=<issuer_url from outputs>
```

## Destruction

⚠️ **Warning**: This will delete the User Pool and all user data!

```bash
terraform destroy
```

## Notes

- Production environments have deletion protection enabled
- MFA is optional by default (can be enabled per-user)
- Password policy: 8+ chars, uppercase, lowercase, number
- Tokens expire after 1 hour (access/ID tokens), 30 days (refresh token)
