#!/bin/bash
# Validation script for AWS Lead Magnet infrastructure
# Checks if all resources are properly configured

set -e

REGION="eu-west-3"
DOMAIN="lightandshutter.fr"
EMAIL="etienne.maillot@lightandshutter.fr"
BUCKET="lightandshutter-lead-magnets"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  AWS Lead Magnet Infrastructure Validation                ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Check AWS CLI
echo -n "Checking AWS CLI... "
if ! command -v aws &> /dev/null; then
    echo -e "${RED}✗ AWS CLI not found${NC}"
    echo "  Install: https://aws.amazon.com/cli/"
    exit 1
fi
echo -e "${GREEN}✓${NC}"

# Check AWS credentials
echo -n "Checking AWS credentials... "
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}✗ AWS credentials not configured${NC}"
    echo "  Run: aws configure"
    exit 1
fi
echo -e "${GREEN}✓${NC}"

# Check S3 bucket
echo -n "Checking S3 bucket... "
if aws s3 ls "s3://${BUCKET}" --region "$REGION" &> /dev/null; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ Bucket not found${NC}"
    echo "  Run: terraform apply"
fi

# Check S3 bucket CORS
echo -n "Checking S3 CORS configuration... "
if aws s3api get-bucket-cors --bucket "$BUCKET" --region "$REGION" &> /dev/null; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠ CORS not configured${NC}"
fi

# Check SES domain verification
echo -n "Checking SES domain verification... "
SES_STATUS=$(aws ses get-identity-verification-attributes \
    --identities "$DOMAIN" \
    --region "$REGION" \
    --query "VerificationAttributes.\"$DOMAIN\".VerificationStatus" \
    --output text 2>/dev/null || echo "NotFound")

if [ "$SES_STATUS" = "Success" ]; then
    echo -e "${GREEN}✓ Verified${NC}"
elif [ "$SES_STATUS" = "Pending" ]; then
    echo -e "${YELLOW}⚠ Pending (add DNS records)${NC}"
    echo "  Run: make dns"
else
    echo -e "${RED}✗ Not found${NC}"
    echo "  Run: terraform apply"
fi

# Check DKIM
echo -n "Checking DKIM configuration... "
DKIM_STATUS=$(aws ses get-identity-dkim-attributes \
    --identities "$DOMAIN" \
    --region "$REGION" \
    --query "DkimAttributes.\"$DOMAIN\".DkimVerificationStatus" \
    --output text 2>/dev/null || echo "NotFound")

if [ "$DKIM_STATUS" = "Success" ]; then
    echo -e "${GREEN}✓ Verified${NC}"
elif [ "$DKIM_STATUS" = "Pending" ]; then
    echo -e "${YELLOW}⚠ Pending (add DNS records)${NC}"
else
    echo -e "${RED}✗ Not configured${NC}"
fi

# Check email verification
echo -n "Checking email verification... "
EMAIL_STATUS=$(aws ses get-identity-verification-attributes \
    --identities "$EMAIL" \
    --region "$REGION" \
    --query "VerificationAttributes.\"$EMAIL\".VerificationStatus" \
    --output text 2>/dev/null || echo "NotFound")

if [ "$EMAIL_STATUS" = "Success" ]; then
    echo -e "${GREEN}✓ Verified${NC}"
elif [ "$EMAIL_STATUS" = "Pending" ]; then
    echo -e "${YELLOW}⚠ Pending (check inbox)${NC}"
else
    echo -e "${RED}✗ Not found${NC}"
    echo "  Verify email in AWS Console"
fi

# Check SES sending enabled
echo -n "Checking SES sending status... "
SENDING_ENABLED=$(aws ses get-account-sending-enabled \
    --region "$REGION" \
    --query "Enabled" \
    --output text 2>/dev/null || echo "false")

if [ "$SENDING_ENABLED" = "True" ]; then
    echo -e "${GREEN}✓ Enabled${NC}"
else
    echo -e "${RED}✗ Disabled${NC}"
fi

# Check SES sandbox status
echo -n "Checking SES production access... "
QUOTA=$(aws ses get-send-quota \
    --region "$REGION" \
    --query "Max24HourSend" \
    --output text 2>/dev/null || echo "0")

if (( $(echo "$QUOTA >= 200" | bc -l) )); then
    echo -e "${GREEN}✓ Production mode (quota: $QUOTA/day)${NC}"
else
    echo -e "${YELLOW}⚠ Sandbox mode (quota: $QUOTA/day)${NC}"
    echo "  Request production access in AWS Console"
fi

# Check IAM user
echo -n "Checking IAM user... "
if aws iam get-user --user-name "lightandshutter-lead-magnet-service" &> /dev/null; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ Not found${NC}"
    echo "  Run: terraform apply"
fi

# Check PDF in S3
echo -n "Checking lead magnet PDF... "
if aws s3 ls "s3://${BUCKET}/lead-magnets/guide-mariee-sereine.pdf" --region "$REGION" &> /dev/null; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠ Not uploaded${NC}"
    echo "  Run: make upload-pdf FILE=path/to/guide.pdf"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo ""

# Summary
TOTAL=10
PASSED=$(grep -c "✓" <<< $(cat /dev/stdout 2>&1) || echo 0)

if [ "$SES_STATUS" = "Success" ] && [ "$EMAIL_STATUS" = "Success" ] && [ "$SENDING_ENABLED" = "True" ]; then
    echo -e "${GREEN}✓ Infrastructure is ready!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Get credentials: make credentials"
    echo "  2. Add to .env file in apps/ingest-api/"
    echo "  3. Test email sending"
else
    echo -e "${YELLOW}⚠ Infrastructure needs attention${NC}"
    echo ""
    echo "Next steps:"
    if [ "$SES_STATUS" != "Success" ]; then
        echo "  1. Add DNS records: make dns"
        echo "  2. Wait 5-10 minutes for propagation"
    fi
    if [ "$EMAIL_STATUS" != "Success" ]; then
        echo "  3. Verify email (check inbox: $EMAIL)"
    fi
    if (( $(echo "$QUOTA < 200" | bc -l) )); then
        echo "  4. Request SES production access (AWS Console)"
    fi
fi

echo ""
