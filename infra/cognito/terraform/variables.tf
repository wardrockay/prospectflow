variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "prospectflow"
}

variable "aws_region" {
  description = "AWS region for Cognito resources"
  type        = string
  default     = "eu-west-1"
}
