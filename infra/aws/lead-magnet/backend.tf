# Backend Configuration for Terraform State
# 
# OPTIONAL: Uncomment this block to store Terraform state in S3
# This is HIGHLY RECOMMENDED for production to:
# - Enable state locking (prevent concurrent modifications)
# - Encrypt state at rest
# - Enable team collaboration
# - Backup state automatically
#
# Prerequisites:
# 1. Create S3 bucket for state: terraform-state-lightandshutter
# 2. Enable versioning on bucket
# 3. Enable encryption
# 4. Create DynamoDB table for locking: terraform-state-lock
#
# Setup:
# 1. Uncomment lines below
# 2. Run: terraform init -migrate-state
# 3. Confirm migration when prompted

# terraform {
#   backend "s3" {
#     bucket         = "terraform-state-lightandshutter"
#     key            = "lead-magnet/terraform.tfstate"
#     region         = "eu-west-3"
#     encrypt        = true
#     
#     # Optional: DynamoDB table for state locking
#     # dynamodb_table = "terraform-state-lock"
#   }
# }

# To create the backend infrastructure:
# 
# 1. Create S3 bucket:
#    aws s3 mb s3://terraform-state-lightandshutter --region eu-west-3
#    aws s3api put-bucket-versioning --bucket terraform-state-lightandshutter \
#      --versioning-configuration Status=Enabled
#    aws s3api put-bucket-encryption --bucket terraform-state-lightandshutter \
#      --server-side-encryption-configuration \
#      '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
#
# 2. Optional - Create DynamoDB table for locking:
#    aws dynamodb create-table \
#      --table-name terraform-state-lock \
#      --attribute-definitions AttributeName=LockID,AttributeType=S \
#      --key-schema AttributeName=LockID,KeyType=HASH \
#      --billing-mode PAY_PER_REQUEST \
#      --region eu-west-3
