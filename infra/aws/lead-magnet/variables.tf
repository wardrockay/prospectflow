variable "aws_region" {
  description = "AWS region for SES and S3"
  type        = string
  default     = "eu-west-1"
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  default     = "production"
}

variable "domain_name" {
  description = "Domain name for SES verification"
  type        = string
  default     = "lightandshutter.fr"
}

variable "from_email" {
  description = "Email address for sending confirmation emails"
  type        = string
  default     = "etienne.maillot@lightandshutter.fr"
}

variable "s3_bucket_name" {
  description = "S3 bucket name for lead magnet PDFs"
  type        = string
  default     = "lightandshutter-lead-magnets"
}

variable "s3_file_key" {
  description = "S3 key (path) for the lead magnet PDF"
  type        = string
  default     = "lead-magnets/guide-mariee-sereine.pdf"
}

variable "cors_allowed_origins" {
  description = "CORS allowed origins for S3 bucket"
  type        = list(string)
  default = [
    "https://lightandshutter.fr",
    "https://www.lightandshutter.fr"
  ]
}
