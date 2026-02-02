# IAM User for Lead Magnet Service
resource "aws_iam_user" "lead_magnet_service" {
  name = "lightandshutter-lead-magnet-service"
  path = "/services/"

  tags = {
    Description = "Service account for B2C lead magnet delivery"
  }
}

# IAM Policy Document
data "aws_iam_policy_document" "lead_magnet_service" {
  # S3 Read-only access for signed URL generation
  statement {
    sid    = "S3LeadMagnetReadOnly"
    effect = "Allow"

    actions = [
      "s3:GetObject",
      "s3:GetObjectVersion"
    ]

    resources = [
      "${aws_s3_bucket.lead_magnets.arn}/*"
    ]
  }

  # SES Email Sending (restricted to specific from address)
  statement {
    sid    = "SESEmailSending"
    effect = "Allow"

    actions = [
      "ses:SendEmail",
      "ses:SendRawEmail"
    ]

    resources = ["*"]

    condition {
      test     = "StringLike"
      variable = "ses:FromAddress"
      values   = [var.from_email]
    }
  }

  # SES Configuration Set usage
  statement {
    sid    = "SESConfigurationSetUsage"
    effect = "Allow"

    actions = [
      "ses:PutConfigurationSetDeliveryOptions"
    ]

    resources = [
      aws_ses_configuration_set.lead_magnet.arn
    ]
  }
}

# Attach inline policy to user
resource "aws_iam_user_policy" "lead_magnet_service" {
  name   = "LeadMagnetServicePolicy"
  user   = aws_iam_user.lead_magnet_service.name
  policy = data.aws_iam_policy_document.lead_magnet_service.json
}

# Create access key (CRITICAL: Handle securely)
resource "aws_iam_access_key" "lead_magnet_service" {
  user = aws_iam_user.lead_magnet_service.name
}

# Store access key in AWS Secrets Manager (optional but recommended)
resource "aws_secretsmanager_secret" "lead_magnet_credentials" {
  name                    = "lead-magnet/service-credentials"
  description             = "IAM credentials for lead magnet service"
  recovery_window_in_days = 7

  tags = {
    Service = "LeadMagnet"
  }
}

resource "aws_secretsmanager_secret_version" "lead_magnet_credentials" {
  secret_id = aws_secretsmanager_secret.lead_magnet_credentials.id

  secret_string = jsonencode({
    AWS_ACCESS_KEY_ID     = aws_iam_access_key.lead_magnet_service.id
    AWS_SECRET_ACCESS_KEY = aws_iam_access_key.lead_magnet_service.secret
    AWS_REGION            = var.aws_region
    SES_FROM_EMAIL        = var.from_email
    S3_BUCKET_NAME        = var.s3_bucket_name
    S3_FILE_KEY           = var.s3_file_key
  })
}
