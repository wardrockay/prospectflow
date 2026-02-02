output "ses_domain_identity_arn" {
  description = "ARN of the SES domain identity"
  value       = aws_ses_domain_identity.main.arn
}

output "ses_domain_verification_token" {
  description = "SES domain verification token (add as TXT record)"
  value       = aws_ses_domain_identity.main.verification_token
}

output "ses_dkim_tokens" {
  description = "DKIM tokens for DNS CNAME records (3 records required)"
  value       = aws_ses_domain_dkim.main.dkim_tokens
}

output "ses_from_email" {
  description = "Verified from email address"
  value       = aws_ses_email_identity.from_email.email
}

output "s3_bucket_name" {
  description = "S3 bucket name for lead magnets"
  value       = aws_s3_bucket.lead_magnets.id
}

output "s3_bucket_arn" {
  description = "S3 bucket ARN"
  value       = aws_s3_bucket.lead_magnets.arn
}

output "iam_user_name" {
  description = "IAM user name for lead magnet service"
  value       = aws_iam_user.lead_magnet_service.name
}

output "iam_access_key_id" {
  description = "IAM access key ID (SENSITIVE - store securely)"
  value       = aws_iam_access_key.lead_magnet_service.id
  sensitive   = true
}

output "iam_secret_access_key" {
  description = "IAM secret access key (SENSITIVE - store securely, only shown once)"
  value       = aws_iam_access_key.lead_magnet_service.secret
  sensitive   = true
}

output "secrets_manager_arn" {
  description = "ARN of Secrets Manager secret containing credentials"
  value       = aws_secretsmanager_secret.lead_magnet_credentials.arn
}

output "dns_records_to_add" {
  description = "DNS records that must be added to domain registrar"
  value = {
    spf_record = {
      type  = "TXT"
      name  = "@"
      value = "v=spf1 include:amazonses.com ~all"
    }
    ses_verification = {
      type  = "TXT"
      name  = "_amazonses.${var.domain_name}"
      value = aws_ses_domain_identity.main.verification_token
    }
    dkim_records = [
      for token in aws_ses_domain_dkim.main.dkim_tokens : {
        type  = "CNAME"
        name  = "${token}._domainkey.${var.domain_name}"
        value = "${token}.dkim.amazonses.com"
      }
    ]
  }
}

output "configuration_set_name" {
  description = "SES configuration set name"
  value       = aws_ses_configuration_set.lead_magnet.name
}

# Instructions for retrieving credentials later
output "retrieve_credentials_command" {
  description = "AWS CLI command to retrieve credentials from Secrets Manager"
  value       = "aws secretsmanager get-secret-value --secret-id ${aws_secretsmanager_secret.lead_magnet_credentials.name} --query SecretString --output text | jq"
}
