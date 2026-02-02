# S3 Bucket for Lead Magnet PDFs
resource "aws_s3_bucket" "lead_magnets" {
  bucket = var.s3_bucket_name

  tags = {
    Name = "Lead Magnet PDFs"
  }
}

# Block all public access (bucket is private, uses signed URLs)
resource "aws_s3_bucket_public_access_block" "lead_magnets" {
  bucket = aws_s3_bucket.lead_magnets.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Enable versioning (recommended for backup)
resource "aws_s3_bucket_versioning" "lead_magnets" {
  bucket = aws_s3_bucket.lead_magnets.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "lead_magnets" {
  bucket = aws_s3_bucket.lead_magnets.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# CORS configuration for browser access via signed URLs
resource "aws_s3_bucket_cors_configuration" "lead_magnets" {
  bucket = aws_s3_bucket.lead_magnets.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = var.cors_allowed_origins
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# Lifecycle policy to clean up old versions
resource "aws_s3_bucket_lifecycle_configuration" "lead_magnets" {
  bucket = aws_s3_bucket.lead_magnets.id

  rule {
    id     = "expire-old-versions"
    status = "Enabled"

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}
