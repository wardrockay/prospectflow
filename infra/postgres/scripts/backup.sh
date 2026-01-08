#!/bin/bash

# ================================================================
# PostgreSQL Backup Script
# ProspectFlow Database Backup Automation
# ================================================================
#
# This script performs automated backups of the ProspectFlow PostgreSQL database
# with support for full, schema-only, and data-only backups.
#
# Usage:
#   ./backup.sh [full|schema|data] [schema_name]
#
# Examples:
#   ./backup.sh full              # Full database backup
#   ./backup.sh schema            # Schema-only backup (all schemas)
#   ./backup.sh data crm          # Data-only backup for CRM schema
#
# Schedule with cron (daily at 2 AM):
#   0 2 * * * /path/to/backup.sh full >> /var/log/prospectflow/backup.log 2>&1
#
# ================================================================

set -euo pipefail  # Exit on error, undefined var, pipe failure

# ================================================================
# Configuration
# ================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups/postgres}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Docker container name
CONTAINER_NAME="${POSTGRES_CONTAINER:-prospectflow-postgres}"

# Database credentials (from .env or defaults)
DB_USER="${POSTGRES_USER:-prospectflow}"
DB_NAME="${POSTGRES_DB:-prospectflow}"

# Backup file naming
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE_ONLY=$(date +%Y%m%d)

# ================================================================
# Functions
# ================================================================

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

error() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $*" >&2
}

die() {
  error "$*"
  exit 1
}

check_docker_running() {
  if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    die "PostgreSQL container '${CONTAINER_NAME}' is not running"
  fi
  log "✅ PostgreSQL container is running"
}

check_disk_space() {
  local available_mb
  available_mb=$(df -m "$BACKUP_DIR" | tail -1 | awk '{print $4}')
  
  if [ "$available_mb" -lt 1000 ]; then
    error "⚠️  WARNING: Low disk space (${available_mb}MB available)"
    error "Consider cleaning old backups or increasing storage"
  else
    log "✅ Disk space check passed (${available_mb}MB available)"
  fi
}

create_backup_dir() {
  if [ ! -d "$BACKUP_DIR" ]; then
    mkdir -p "$BACKUP_DIR"
    log "Created backup directory: $BACKUP_DIR"
  fi
}

backup_full() {
  local backup_file="$BACKUP_DIR/prospectflow_full_${TIMESTAMP}.sql"
  local compressed_file="${backup_file}.gz"
  
  log "Starting full database backup..."
  
  if docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" "$DB_NAME" > "$backup_file"; then
    log "✅ Full backup created: $backup_file"
    
    # Compress backup
    gzip "$backup_file"
    log "✅ Backup compressed: $compressed_file"
    
    # Calculate size
    local size_mb=$(du -m "$compressed_file" | cut -f1)
    log "📦 Backup size: ${size_mb}MB"
    
    return 0
  else
    error "❌ Full backup failed"
    [ -f "$backup_file" ] && rm "$backup_file"
    return 1
  fi
}

backup_schema() {
  local backup_file="$BACKUP_DIR/prospectflow_schema_${DATE_ONLY}.sql"
  local compressed_file="${backup_file}.gz"
  
  log "Starting schema-only backup..."
  
  if docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" -s "$DB_NAME" > "$backup_file"; then
    log "✅ Schema backup created: $backup_file"
    
    # Compress backup
    gzip -f "$backup_file"
    log "✅ Schema backup compressed: $compressed_file"
    
    return 0
  else
    error "❌ Schema backup failed"
    [ -f "$backup_file" ] && rm "$backup_file"
    return 1
  fi
}

backup_data_schema() {
  local schema_name="$1"
  local backup_file="$BACKUP_DIR/prospectflow_${schema_name}_data_${TIMESTAMP}.sql"
  local compressed_file="${backup_file}.gz"
  
  log "Starting data-only backup for schema: $schema_name"
  
  if docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" -a -n "$schema_name" "$DB_NAME" > "$backup_file"; then
    log "✅ Data backup created for $schema_name: $backup_file"
    
    # Compress backup
    gzip "$backup_file"
    log "✅ Data backup compressed: $compressed_file"
    
    return 0
  else
    error "❌ Data backup failed for schema: $schema_name"
    [ -f "$backup_file" ] && rm "$backup_file"
    return 1
  fi
}

cleanup_old_backups() {
  log "Cleaning up backups older than $RETENTION_DAYS days..."
  
  local deleted_count=0
  
  # Find and delete old backups
  while IFS= read -r -d '' file; do
    rm "$file"
    ((deleted_count++))
    log "Deleted old backup: $(basename "$file")"
  done < <(find "$BACKUP_DIR" -name "*.sql.gz" -type f -mtime +$RETENTION_DAYS -print0)
  
  if [ "$deleted_count" -gt 0 ]; then
    log "✅ Cleaned up $deleted_count old backup(s)"
  else
    log "No old backups to clean up"
  fi
}

verify_backup() {
  local backup_file="$1"
  
  log "Verifying backup integrity..."
  
  if gunzip -t "$backup_file" 2>/dev/null; then
    log "✅ Backup integrity verified: $(basename "$backup_file")"
    return 0
  else
    error "❌ Backup integrity check failed: $(basename "$backup_file")"
    return 1
  fi
}

show_usage() {
  cat <<EOF
Usage: $0 [full|schema|data] [schema_name]

Backup Types:
  full              Full database backup (schema + data)
  schema            Schema-only backup (structure, no data)
  data [schema]     Data-only backup for specified schema (iam, crm, outreach, tracking)

Environment Variables:
  BACKUP_DIR        Backup directory (default: $PROJECT_ROOT/backups/postgres)
  RETENTION_DAYS    Number of days to keep backups (default: 30)
  POSTGRES_USER     Database user (default: prospectflow)
  POSTGRES_DB       Database name (default: prospectflow)

Examples:
  $0 full                    # Full backup
  $0 schema                  # Schema-only
  $0 data crm                # CRM schema data only
  
Schedule with cron (daily at 2 AM):
  0 2 * * * /path/to/backup.sh full >> /var/log/prospectflow/backup.log 2>&1

EOF
}

# ================================================================
# Main Script
# ================================================================

main() {
  local backup_type="${1:-full}"
  local schema_name="${2:-}"
  
  log "=========================================="
  log "ProspectFlow Database Backup"
  log "=========================================="
  log "Backup type: $backup_type"
  log "Backup directory: $BACKUP_DIR"
  log "Retention: $RETENTION_DAYS days"
  log "=========================================="
  
  # Pre-flight checks
  check_docker_running
  create_backup_dir
  check_disk_space
  
  # Perform backup based on type
  local backup_success=0
  local latest_backup=""
  
  case "$backup_type" in
    full)
      if backup_full; then
        latest_backup="$BACKUP_DIR/prospectflow_full_${TIMESTAMP}.sql.gz"
        backup_success=1
      fi
      ;;
    
    schema)
      if backup_schema; then
        latest_backup="$BACKUP_DIR/prospectflow_schema_${DATE_ONLY}.sql.gz"
        backup_success=1
      fi
      ;;
    
    data)
      if [ -z "$schema_name" ]; then
        die "Schema name required for data backup. Usage: $0 data [iam|crm|outreach|tracking]"
      fi
      
      if backup_data_schema "$schema_name"; then
        latest_backup="$BACKUP_DIR/prospectflow_${schema_name}_data_${TIMESTAMP}.sql.gz"
        backup_success=1
      fi
      ;;
    
    help|--help|-h)
      show_usage
      exit 0
      ;;
    
    *)
      error "Unknown backup type: $backup_type"
      show_usage
      exit 1
      ;;
  esac
  
  # Verify backup if successful
  if [ "$backup_success" -eq 1 ] && [ -n "$latest_backup" ]; then
    verify_backup "$latest_backup"
  fi
  
  # Cleanup old backups
  cleanup_old_backups
  
  # Final status
  log "=========================================="
  if [ "$backup_success" -eq 1 ]; then
    log "✅ Backup completed successfully"
    log "Latest backup: $(basename "$latest_backup")"
    exit 0
  else
    log "❌ Backup failed"
    exit 1
  fi
}

# Run main function with all arguments
main "$@"
