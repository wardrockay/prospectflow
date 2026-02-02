.PHONY: help init plan apply destroy output clean validate fmt

# Default target
help:
	@echo "╔════════════════════════════════════════════════════════════╗"
	@echo "║  AWS Lead Magnet Infrastructure - Terraform Commands      ║"
	@echo "╚════════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "Available commands:"
	@echo "  make init       - Initialize Terraform (download providers)"
	@echo "  make validate   - Validate Terraform configuration"
	@echo "  make fmt        - Format Terraform files"
	@echo "  make plan       - Preview infrastructure changes"
	@echo "  make apply      - Apply infrastructure changes"
	@echo "  make output     - Display all outputs"
	@echo "  make credentials - Show IAM credentials (sensitive)"
	@echo "  make dns        - Show DNS records to add"
	@echo "  make validate-infra - Validate infrastructure is working"
	@echo "  make verify-ses - Check SES domain verification status"
	@echo "  make check-quota - Check SES sending quota"
	@echo "  make test-s3    - Test S3 bucket access"
	@echo "  make upload-pdf - Upload lead magnet PDF (FILE=path)"
	@echo "  make destroy    - Destroy all infrastructure (DANGEROUS)"
	@echo "  make clean      - Clean Terraform cache files"
	@echo ""
	@echo "Quick Start:"
	@echo "  1. cp terraform.tfvars.example terraform.tfvars"
	@echo "  2. vim terraform.tfvars  # Edit your values"
	@echo "  3. make init"
	@echo "  4. make plan"
	@echo "  5. make apply"
	@echo "  6. make dns  # Add these records to domain registrar"
	@echo "  7. make validate-infra  # Check everything works"
	@echo ""

# Validate infrastructure is working
validate-infra:
	@echo "🔍 Validating infrastructure..."
	@./validate.sh

# Initialize Terraform
init:
	@echo "🚀 Initializing Terraform..."
	terraform init

# Validate configuration
validate:
	@echo "✅ Validating Terraform configuration..."
	terraform validate

# Format Terraform files
fmt:
	@echo "🎨 Formatting Terraform files..."
	terraform fmt -recursive

# Plan infrastructure changes
plan:
	@echo "📋 Planning infrastructure changes..."
	terraform plan

# Apply infrastructure
apply:
	@echo "🏗️  Applying infrastructure changes..."
	@echo "⚠️  This will create real AWS resources (costs may apply)"
	terraform apply
	@echo ""
	@echo "✅ Infrastructure created!"
	@echo ""
	@echo "Next steps:"
	@echo "  1. Run 'make dns' to get DNS records"
	@echo "  2. Add DNS records to your domain registrar"
	@echo "  3. Wait 5-10 minutes for DNS propagation"
	@echo "  4. Verify email address (check inbox)"
	@echo "  5. Request SES production access (AWS Console)"
	@echo ""

# Display all outputs
output:
	@echo "📤 Terraform Outputs:"
	@terraform output

# Show IAM credentials
credentials:
	@echo "🔐 IAM Credentials (SENSITIVE - Do not share!):"
	@echo ""
	@echo "AWS_ACCESS_KEY_ID:"
	@terraform output -raw iam_access_key_id
	@echo ""
	@echo ""
	@echo "AWS_SECRET_ACCESS_KEY:"
	@terraform output -raw iam_secret_access_key
	@echo ""
	@echo ""
	@echo "⚠️  Store these securely in your .env file"
	@echo ""

# Show DNS records to add
dns:
	@echo "🌐 DNS Records to Add to Domain Registrar:"
	@echo ""
	@terraform output -json dns_records_to_add | jq -r '
		"SPF Record:",
		"  Type: \(.spf_record.type)",
		"  Name: \(.spf_record.name)",
		"  Value: \(.spf_record.value)",
		"",
		"SES Verification Record:",
		"  Type: \(.ses_verification.type)",
		"  Name: \(.ses_verification.name)",
		"  Value: \(.ses_verification.value)",
		"",
		"DKIM Records (3 records):",
		(.dkim_records[] |
			"  Type: \(.type)",
			"  Name: \(.name)",
			"  Value: \(.value)",
			""
		)
	'
	@echo "After adding DNS records:"
	@echo "  - Wait 5-10 minutes for propagation"
	@echo "  - Run: make verify-ses"
	@echo ""

# Verify SES domain status
verify-ses:
	@echo "🔍 Checking SES domain verification status..."
	@aws ses get-identity-verification-attributes \
		--identities lightandshutter.fr \
		--region eu-west-3 \
		--query "VerificationAttributes.*.{Status:VerificationStatus}" \
		--output table

# Check SES sending quota
check-quota:
	@echo "📊 SES Sending Quota:"
	@aws ses get-send-quota --region eu-west-3 --output table

# Test S3 access
test-s3:
	@echo "🪣 Testing S3 access..."
	@aws s3 ls s3://lightandshutter-lead-magnets/ --region eu-west-3

# Upload lead magnet PDF (requires file path)
upload-pdf:
	@echo "📤 Uploading lead magnet PDF..."
	@if [ -z "$(FILE)" ]; then \
		echo "❌ Error: FILE not specified"; \
		echo "Usage: make upload-pdf FILE=path/to/guide.pdf"; \
		exit 1; \
	fi
	@aws s3 cp "$(FILE)" \
		s3://lightandshutter-lead-magnets/lead-magnets/guide-mariee-sereine.pdf \
		--region eu-west-3
	@echo "✅ PDF uploaded successfully"

# Destroy infrastructure
destroy:
	@echo "💥 WARNING: This will destroy ALL infrastructure!"
	@echo "This includes:"
	@echo "  - SES domain verification"
	@echo "  - S3 bucket (must be empty)"
	@echo "  - IAM user and access keys"
	@echo "  - Secrets Manager secret"
	@echo ""
	@echo "Press Ctrl+C to cancel, or Enter to continue..."
	@read confirm
	terraform destroy

# Clean Terraform cache
clean:
	@echo "🧹 Cleaning Terraform cache..."
	rm -rf .terraform
	rm -f .terraform.lock.hcl
	rm -f terraform.tfstate
	rm -f terraform.tfstate.backup
	@echo "✅ Cache cleaned"

# Quick setup (init + validate + plan)
setup: init validate fmt plan
	@echo "✅ Setup complete! Ready to apply."
	@echo "Run: make apply"
