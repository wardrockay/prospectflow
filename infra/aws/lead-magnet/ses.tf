# SES Domain Identity
resource "aws_ses_domain_identity" "main" {
  domain = var.domain_name
}

# SES Domain DKIM Verification
resource "aws_ses_domain_dkim" "main" {
  domain = aws_ses_domain_identity.main.domain
}

# SES Email Identity (for specific from address)
resource "aws_ses_email_identity" "from_email" {
  email = var.from_email
}

# SES Configuration Set (for tracking bounces, complaints)
resource "aws_ses_configuration_set" "lead_magnet" {
  name = "lead-magnet-config-set"

  reputation_metrics_enabled = true
  sending_enabled            = true
}

# CloudWatch Event Destination for SES events
resource "aws_ses_event_destination" "cloudwatch" {
  name                   = "cloudwatch-destination"
  configuration_set_name = aws_ses_configuration_set.lead_magnet.name
  enabled                = true
  matching_types         = ["send", "bounce", "complaint", "delivery", "reject"]

  cloudwatch_destination {
    default_value  = "default"
    dimension_name = "ses:configuration-set"
    value_source   = "messageTag"
  }
}

# Note: DNS records must be manually added to domain registrar
# Output the DKIM tokens and SPF record below
