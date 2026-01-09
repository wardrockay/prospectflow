terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

resource "aws_cognito_user_pool" "main" {
  name = "${var.project_name}-${var.environment}"

  # Password policy
  password_policy {
    minimum_length                   = 8
    require_uppercase                = true
    require_lowercase                = true
    require_numbers                  = true
    require_symbols                  = false
    temporary_password_validity_days = 7
  }

  # MFA configuration (disabled for now, can enable later)
  mfa_configuration = "OFF"

  # Custom attributes
  schema {
    name                = "organisation_id"
    attribute_data_type = "String"
    mutable             = true
    required            = false

    string_attribute_constraints {
      min_length = 1
      max_length = 255
    }
  }

  schema {
    name                = "role"
    attribute_data_type = "String"
    mutable             = true
    required            = false

    string_attribute_constraints {
      min_length = 1
      max_length = 50
    }
  }

  # Email verification
  auto_verified_attributes = ["email"]

  email_verification_subject = "Your ProspectFlow verification code"
  email_verification_message = "Your verification code is {####}"

  # Account recovery
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # User attributes
  username_attributes = ["email"]

  username_configuration {
    case_sensitive = false
  }

  # Deletion protection for production
  deletion_protection = var.environment == "production" ? "ACTIVE" : "INACTIVE"

  tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
  }
}
