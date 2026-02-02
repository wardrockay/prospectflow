# Terraform Guide - AWS Lead Magnet Infrastructure

**Created:** February 2, 2026  
**Story:** LM-001 - Database Schema & Infrastructure Setup

---

## 📋 Quick Start

### 1. Prerequisites

- Terraform >= 1.0 installed
- AWS CLI configured with admin credentials
- Domain registrar access (for DNS records)

### 2. Initialize Terraform

```bash
cd infra/aws/lead-magnet

# Copy example variables
cp terraform.tfvars.example terraform.tfvars

# Edit terraform.tfvars with your values
vim terraform.tfvars

# Initialize Terraform
terraform init
```

### 3. Plan Infrastructure

```bash
# Preview changes
terraform plan

# Review the output carefully
# Should create ~15 resources:
# - SES domain identity
# - SES email identity
# - SES configuration set
# - S3 bucket + policies
# - IAM user + policy
# - Secrets Manager secret
```

### 4. Apply Infrastructure

```bash
# Apply changes
terraform apply

# Type 'yes' to confirm

# ⚠️ CRITICAL: Save the outputs immediately
terraform output -json > outputs.json
```

### 5. Retrieve Credentials

```bash
# Get access key (sensitive)
terraform output -raw iam_access_key_id

# Get secret key (sensitive, only shown once)
terraform output -raw iam_secret_access_key

# Or retrieve from Secrets Manager later
aws secretsmanager get-secret-value \
  --secret-id lead-magnet/service-credentials \
  --query SecretString --output text | jq
```

### 6. Add DNS Records

```bash
# Display DNS records to add
terraform output -json dns_records_to_add | jq

# Add these records to your domain registrar:
# 1. SPF TXT record
# 2. SES verification TXT record
# 3. 3x DKIM CNAME records
```

### 7. Verify SES Domain

```bash
# Wait 5-10 minutes after adding DNS records
# Check verification status
aws ses get-identity-verification-attributes \
  --identities lightandshutter.fr \
  --region eu-west-3

# Should show: "VerificationStatus": "Success"
```

### 8. Verify Email Address

**Manual step required:**
1. AWS Console → SES → Email addresses
2. Email verification sent to `etienne.maillot@lightandshutter.fr`
3. Click verification link in email

### 9. Request Production Access

**Manual step required:**
1. AWS Console → SES → Account dashboard
2. Click "Request production access"
3. Fill out form (use case, expected volume)
4. Wait for approval (24-48 hours)

### 10. Upload Lead Magnet PDF

```bash
# Upload PDF to S3
aws s3 cp guide-mariee-sereine.pdf \
  s3://lightandshutter-lead-magnets/lead-magnets/guide-mariee-sereine.pdf \
  --region eu-west-3

# Verify upload
aws s3 ls s3://lightandshutter-lead-magnets/lead-magnets/ --region eu-west-3
```

---

## 📦 Resources Created

| Resource | Purpose |
|----------|---------|
| **aws_ses_domain_identity** | Verify domain ownership for SES |
| **aws_ses_domain_dkim** | DKIM signing for email authentication |
| **aws_ses_email_identity** | Verify specific from address |
| **aws_ses_configuration_set** | Track email events (bounces, complaints) |
| **aws_s3_bucket** | Store lead magnet PDFs |
| **aws_s3_bucket_cors_configuration** | Allow browser access via signed URLs |
| **aws_iam_user** | Service account for API access |
| **aws_iam_user_policy** | Minimal permissions (S3 read, SES send) |
| **aws_iam_access_key** | Programmatic access credentials |
| **aws_secretsmanager_secret** | Store credentials securely |

---

## 🔐 Security Best Practices

### Credential Management

```bash
# ✅ DO: Store credentials in environment variables
export AWS_ACCESS_KEY_ID=$(terraform output -raw iam_access_key_id)
export AWS_SECRET_ACCESS_KEY=$(terraform output -raw iam_secret_access_key)

# ✅ DO: Use Secrets Manager in production
aws secretsmanager get-secret-value --secret-id lead-magnet/service-credentials

# ❌ DON'T: Commit credentials to git
# ❌ DON'T: Store in plain text files
# ❌ DON'T: Share access keys via email/Slack
```

### Terraform State

```bash
# ⚠️ CRITICAL: Terraform state contains sensitive data
# Store in S3 backend with encryption (recommended)

# Add to main.tf:
terraform {
  backend "s3" {
    bucket = "your-terraform-state-bucket"
    key    = "lead-magnet/terraform.tfstate"
    region = "eu-west-3"
    encrypt = true
  }
}
```

### IAM Permissions

The created IAM user has **minimal permissions**:
- ✅ S3 read-only (`s3:GetObject` only)
- ✅ SES send from specific address only
- ❌ No write/delete access to S3
- ❌ No administrative permissions

### Rotate Access Keys

```bash
# Rotate keys every 90 days
# 1. Create new access key
aws iam create-access-key --user-name lightandshutter-lead-magnet-service

# 2. Update application with new credentials

# 3. Delete old key
aws iam delete-access-key \
  --user-name lightandshutter-lead-magnet-service \
  --access-key-id OLD_ACCESS_KEY_ID
```

---

## 📊 Monitoring & Troubleshooting

### Check SES Sending Quota

```bash
# Check current quota
aws ses get-send-quota --region eu-west-3

# Output:
# {
#   "Max24HourSend": 200.0,      # Daily limit
#   "MaxSendRate": 1.0,          # Emails per second
#   "SentLast24Hours": 5.0       # Already sent today
# }
```

### Monitor SES Events (CloudWatch)

```bash
# View CloudWatch metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/SES \
  --metric-name Send \
  --dimensions Name=ConfigurationSet,Value=lead-magnet-config-set \
  --start-time 2026-02-01T00:00:00Z \
  --end-time 2026-02-02T00:00:00Z \
  --period 3600 \
  --statistics Sum \
  --region eu-west-3
```

### Test S3 Access

```bash
# Generate signed URL (using IAM credentials)
aws s3 presign \
  s3://lightandshutter-lead-magnets/lead-magnets/guide-mariee-sereine.pdf \
  --expires-in 900 \
  --region eu-west-3

# Test URL in browser - should download PDF
```

### Debug SES Issues

```bash
# Check domain verification status
aws ses get-identity-verification-attributes \
  --identities lightandshutter.fr \
  --region eu-west-3

# Check DKIM status
aws ses get-identity-dkim-attributes \
  --identities lightandshutter.fr \
  --region eu-west-3

# List verified email addresses
aws ses list-identities --identity-type EmailAddress --region eu-west-3
```

---

## 🗑️ Cleanup / Destroy

```bash
# ⚠️ WARNING: This will delete ALL resources

# Preview what will be deleted
terraform plan -destroy

# Destroy infrastructure
terraform destroy

# Type 'yes' to confirm

# Note: S3 bucket must be empty before deletion
# If error, manually empty bucket:
aws s3 rm s3://lightandshutter-lead-magnets --recursive --region eu-west-3
```

---

## 🔄 Updates & Maintenance

### Update Lead Magnet PDF

```bash
# Just upload new version (no Terraform changes needed)
aws s3 cp new-guide.pdf \
  s3://lightandshutter-lead-magnets/lead-magnets/guide-mariee-sereine.pdf \
  --region eu-west-3

# S3 versioning is enabled, so old versions are kept
```

### Add New From Email

```bash
# 1. Update terraform.tfvars
from_email = "new-sender@lightandshutter.fr"

# 2. Apply changes
terraform apply

# 3. Verify new email address (manual step)
```

### Increase SES Sending Limits

This requires manual AWS support request:
1. AWS Console → SES → Account dashboard
2. Click "Request limit increase"
3. Fill out form with justification
4. Wait for AWS approval

---

## 📚 References

- [Terraform AWS Provider - SES](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ses_domain_identity)
- [AWS SES Developer Guide](https://docs.aws.amazon.com/ses/latest/dg/)
- [S3 Signed URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/ShareObjectPreSignedURL.html)
- [IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)

---

## 🆘 Support

If you encounter issues:

1. **Check Terraform plan output** - Review resources before applying
2. **Verify AWS credentials** - Ensure CLI has admin permissions
3. **Check DNS propagation** - DNS changes can take 24-48 hours
4. **Review CloudWatch logs** - SES events are logged automatically
5. **AWS Support** - For SES production access issues
