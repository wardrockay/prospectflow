# AWS Lead Magnet Infrastructure Setup

**Last Updated:** February 2, 2026  
**Story:** LM-001 - Database Schema & Infrastructure Setup

---

## 📋 Overview

This guide walks through setting up AWS infrastructure for the B2C Lead Magnet Delivery System:
- **S3 Bucket** - Secure storage for PDF lead magnet
- **Amazon SES** - Email delivery (double opt-in)
- **IAM User** - Minimal permissions for service access

---

## 🪣 S3 Bucket Setup

### Create Bucket

1. Navigate to AWS Console → S3 → Create Bucket
2. Configure:
   - **Bucket name:** `lightandshutter-lead-magnets`
   - **Region:** `EU West (Paris) eu-west-3`
   - **Block All Public Access:** ✅ **ENABLED** (bucket is private)
   - **Bucket Versioning:** Optional (recommended for backup)
   - **Encryption:** Server-side encryption (SSE-S3) enabled by default

### Configure CORS

1. Go to Bucket → Permissions → CORS configuration
2. Add the following JSON policy:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": [
      "https://lightandshutter.fr",
      "https://www.lightandshutter.fr"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

### Upload Lead Magnet PDF

1. Go to Bucket → Objects → Upload
2. Upload file: `guide-mariee-sereine.pdf`
3. Set S3 Key (path): `lead-magnets/guide-mariee-sereine.pdf`
4. Storage class: **Standard**
5. **Do NOT** make public

---

## 📧 Amazon SES Setup

### Domain Verification

1. Navigate to SES Console → Verified identities → Create identity → Domain
2. Enter domain: `lightandshutter.fr`
3. Enable DKIM Signing: ✅ **ENABLED**
4. Copy the DKIM CNAME records provided by AWS

### Add DNS Records

Add these records at your domain registrar:

**SPF Record (TXT):**
```
Name: @
Type: TXT
Value: v=spf1 include:amazonses.com ~all
```

**DKIM Records (3x CNAME):**
- AWS will provide 3 CNAME records like:
  ```
  Name: abcd._domainkey.lightandshutter.fr
  Type: CNAME
  Value: abcd.dkim.amazonses.com
  ```
- Add all 3 CNAME records to your DNS

### Verify Email Address

1. SES Console → Verified identities → Create identity → Email address
2. Email: `etienne.maillot@lightandshutter.fr`
3. Check email inbox and click verification link

### Request Production Access (Exit Sandbox)

1. SES Console → Account dashboard → Request production access
2. Fill out the form:
   - **Use case:** Lead magnet delivery with double opt-in
   - **Expected volume:** 100-500 emails/month
   - **Description:** Explain double opt-in process for RGPD compliance
3. Wait for approval (usually 24-48 hours)

### Verify Production Status

1. Check: SES Console → Account dashboard → Sending limits
2. Should show: "Your account can send up to 200 emails per day"
3. Sandbox limit is much lower (typically 50)

---

## 🔐 IAM User Setup

### Create IAM User

1. IAM Console → Users → Add users
2. Configure:
   - **User name:** `lightandshutter-lead-magnet-service`
   - **Access type:** ✅ **Programmatic access** (access key only)
   - **Console access:** ❌ **Disabled**

### Create Inline Policy

1. Attach policies directly → Create inline policy → JSON
2. Paste the following policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3LeadMagnetReadOnly",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::lightandshutter-lead-magnets/*"
    },
    {
      "Sid": "SESEmailSending",
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*",
      "Condition": {
        "StringLike": {
          "ses:FromAddress": "etienne.maillot@lightandshutter.fr"
        }
      }
    }
  ]
}
```

3. Policy name: `LeadMagnetServicePolicy`

### Generate Access Keys

1. User → Security credentials → Create access key
2. Use case: **Application running outside AWS**
3. Copy:
   - **Access Key ID** (starts with AKIA...)
   - **Secret Access Key** (only shown once)

### Store Credentials Securely

**Local Development:**
```bash
# apps/ui-web/.env (NOT committed to git)
AWS_REGION=eu-west-3
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=***
S3_BUCKET_NAME=lightandshutter-lead-magnets
S3_FILE_KEY=lead-magnets/guide-mariee-sereine.pdf
SES_FROM_EMAIL=etienne.maillot@lightandshutter.fr
```

**Production (VPS):**
```bash
# Add to VPS environment file
# Use make sync-env to deploy
```

**CRITICAL:** Never commit credentials to git. Always use environment variables.

---

## ✅ Verification Tests

### Test S3 Access (AWS CLI)

```bash
# Configure AWS CLI profile
aws configure --profile lead-magnet-service
# Enter Access Key ID, Secret Access Key, region=eu-west-3

# List bucket contents
aws s3 ls s3://lightandshutter-lead-magnets/ \
  --region eu-west-3 \
  --profile lead-magnet-service

# Expected output: lead-magnets/guide-mariee-sereine.pdf
```

### Test SES Email Sending

```bash
# Send test email
aws ses send-email \
  --region eu-west-3 \
  --from etienne.maillot@lightandshutter.fr \
  --destination ToAddresses=your-test-email@example.com \
  --message Subject={Data="Test from SES",Charset=utf8},Body={Text={Data="This is a test",Charset=utf8}} \
  --profile lead-magnet-service

# Check inbox for test email
# Verify "from" address is correct
# Check email headers for SPF/DKIM pass
```

### Verify SES Production Status

```bash
# Check sending is enabled
aws ses get-account-sending-enabled --region eu-west-3

# Expected: { "Enabled": true }

# Check sending quota
aws ses get-send-quota --region eu-west-3

# Expected: daily limit >200 (sandbox is much lower)
```

### Test Signed URL Generation (Node.js)

```typescript
// Test script: apps/ui-web/scripts/test-s3-url.ts
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({ 
  region: 'eu-west-3',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

const command = new GetObjectCommand({
  Bucket: 'lightandshutter-lead-magnets',
  Key: 'lead-magnets/guide-mariee-sereine.pdf',
});

const url = await getSignedUrl(s3Client, command, { expiresIn: 900 });
console.log('Signed URL:', url);

// Test URL in browser - should download PDF
```

---

## 🔒 Security Best Practices

1. **Never commit credentials to git**
   - Always use environment variables
   - Keep `.env` files in `.gitignore`

2. **Use minimal IAM permissions**
   - Only S3 read access (not write/delete)
   - Only SES send from specific address

3. **Rotate access keys regularly**
   - Every 90 days recommended
   - Disable old keys after rotation

4. **Monitor usage**
   - Set up CloudWatch alarms for SES bounces
   - Monitor S3 access logs for anomalies

5. **Use signed URLs with expiration**
   - Never make S3 bucket public
   - Set short expiration times (15 minutes)

---

## 📝 Maintenance

### Update Lead Magnet PDF

1. Upload new version to S3
2. Keep same path: `lead-magnets/guide-mariee-sereine.pdf`
3. No code changes needed (uses same S3 key)

### Add New From Email

1. SES Console → Verified identities → Create identity
2. Verify new email address
3. Update `SES_FROM_EMAIL` in environment

### Increase SES Sending Limits

1. SES Console → Account dashboard → Request limit increase
2. Fill out form with justification
3. Wait for AWS support approval

---

## 🐛 Troubleshooting

### S3 Access Denied

- Verify IAM policy includes `s3:GetObject` for correct bucket
- Check access key ID/secret are correct
- Ensure bucket name matches exactly

### SES Email Not Sending

- Verify SES is out of sandbox (check account dashboard)
- Check email address is verified
- Verify SPF/DKIM DNS records are correct (use DNS checker)
- Check AWS CloudWatch logs for SES errors

### Signed URL Not Working

- Verify URL hasn't expired
- Check CORS configuration on bucket
- Test URL from same domain as CORS origin

---

## 📚 References

- [AWS S3 Signed URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/ShareObjectPreSignedURL.html)
- [SES Production Access](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html)
- [IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [Story LM-001](../../../doc/implementation-artifacts/lm-001-database-schema-infrastructure-setup.md)
