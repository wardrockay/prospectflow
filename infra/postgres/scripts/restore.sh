#!/bin/bash

# ================================================================
# PostgreSQL Restore Script
# ProspectFlow Database Restore Utility
# ================================================================
#
# This script restores PostgreSQL backups created by backup.sh
# Supports full and schema-specific restores with safety checks.
#
# Usage:
#   ./restore.sh <backup_file> [schema_name]
#
# Examples:
#   ./restore.sh backups/prospectflow_full_20260108_140530.sql.gz
#   ./restore.sh backups/prospectflow_crm_data_20260108_140530.sql.gz crm
#
# ⚠️  WARNING: This will overwrite existing data! Always backup first.
#
# ================================================================

set -euo pipefail

# ================================================================
# Configuration
# ================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Docker container name
CONTAINER_NAME="${POSTGRES_CONTAINER:-prospectflow-postgres}"

# Database credentials
DB_USER="${POSTGRES_USER:-prospectflow}"
DB_NAME="${POSTGRES_DB:-prospectflow}"

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

check_backup_file() {
  local backup_file="$1"
  
  if [ ! -f "$backup_file" ]; then
    die "Backup file not found: $backup_file"
  fi
  
  log "✅ Backup file found: $(basename "$backup_file")"
  
  # Check if compressed
  if [[ "$backup_file" == *.gz ]]; then
    log "Backup is compressed (.gz)"
    if ! gunzip -t "$backup_file" 2>/dev/null; then
      die "Backup file is corrupted (failed gzip integrity check)"
    fi
    log "✅ Backup integrity verified"
  fi
}

confirm_restore() {
  local backup_file="$1"
  
  echo ""
  echo "⚠️  WARNING: DATABASE RESTORE OPERATION"
  echo "=========================================="
  echo "This will restore database from:"
  echo "  File: $(basename "$backup_file")"
  echo "  Size: $(du -h "$backup_file" | cut -f1)"
  echo ""
  echo "Database: $DB_NAME"
  echo "Container: $CONTAINER_NAME"
  echo ""
  echo "⚠️  EXISTING DATA WILL BE OVERWRITTEN"
  echo ""
  
  read -p "Are you sure you want to proceed? (yes/no): " -r
  echo
  
  if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    log "Restore cancelled by user"
    exit 0
  fi
  
  log "User confirmed restore operation"
}

create_pre_restore_backup() {
  log "Creating pre-restore backup as safety measure..."
  
  local timestamp=$(date +%Y%m%d_%H%M%S)
  local safety_backup="$PROJECT_ROOT/backups/postgres/pre_restore_safety_${timestamp}.sql.gz"
  
  mkdir -p "$(dirname "$safety_backup")"
  
  if docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$safety_backup"; then
    log "✅ Safety backup created: $(basename "$safety_backup")"
    log "   You can restore from this if needed"
  else
    error "⚠️  WARNING: Safety backup failed, but continuing..."
  fi
}

restore_full_backup() {
  local backup_file="$1"
  
  log "Starting full database restore..."
  
  # Decompress if needed
  local sql_file="$backup_file"
  if [[ "$backup_file" == *.gz ]]; then
    log "Decompressing backup..."
    sql_file="${backup_file%.gz}"
    gunzip -c "$backup_file" > "$sql_file"
  fi
  
  # Restore database
  if cat "$sql_file" | docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME"; then
    log "✅ Database restored successfully"
    
    # Cleanup decompressed file if we created it
    if [[ "$backup_file" == *.gz ]] && [ -f "$sql_file" ]; then
      rm "$sql_file"
      log "Cleaned up temporary decompressed file"
    fi
    
    return 0
  else
    error "❌ Database restore failed"
    
    # Cleanup decompressed file if we created it
    if [[ "$backup_file" == *.gz ]] && [ -f "$sql_file" ]; then
      rm "$sql_file"
    fi
    
    return 1
  fi
}

restore_schema_backup() {
  local backup_file="$1"
  local schema_name="$2"
  
  log "Starting schema restore for: $schema_name"
  
  # Decompress if needed
  local sql_file="$backup_file"
  if [[ "$backup_file" == *.gz ]]; then
    log "Decompressing backup..."
    sql_file="${backup_file%.gz}"
    gunzip -c "$backup_file" > "$sql_file"
  fi
  
  # Drop existing schema
  log "Dropping existing schema: $schema_name"
  docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -c "DROP SCHEMA IF EXISTS $schema_name CASCADE;" || true
  
  # Restore schema data
  if cat "$sql_file" | docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME"; then
    log "✅ Schema $schema_name restored successfully"
    
    # Cleanup decompressed file if we created it
    if [[ "$backup_file" == *.gz ]] && [ -f "$sql_file" ]; then
      rm "$sql_file"
      log "Cleaned up temporary decompressed file"
    fi
    
    return 0
  else
    error "❌ Schema restore failed"
    
    # Cleanup decompressed file if we created it
    if [[ "$backup_file" == *.gz ]] && [ -f "$sql_file" ]; then
      rm "$sql_file"
    fi
    
    return 1
  fi
}

verify_restore() {
  log "Verifying restored database..."
  
  # Check schemas exist
  local schemas=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT schema_name FROM information_schema.schemata WHERE schema_name IN ('iam', 'crm', 'outreach', 'tracking') ORDER BY schema_name;")
  
  if [ -z "$schemas" ]; then
    error "⚠️  WARNING: No application schemas found after restore"
    return 1
  fi
  
  log "✅ Application schemas found:"
  echo "$schemas" | while read -r schema; do
    [ -n "$schema" ] && log "   - $(echo $schema | xargs)"
  done
  
  # Check Flyway history
  local migration_count=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM flyway_schema_history WHERE success = true;")
  
  if [ -n "$migration_count" ] && [ "$migration_count" -gt 0 ]; then
    log "✅ Flyway migrations found: $(echo $migration_count | xargs) successful"
  else
    error "⚠️  WARNING: No Flyway migration history found"
  fi
  
  return 0
}

show_usage() {
  cat <<EOF
Usage: $0 <backup_file> [schema_name]

Arguments:
  backup_file       Path to backup file (can be .sql or .sql.gz)
  schema_name       Optional: Specific schema to restore (iam, crm, outreach, tracking)

Examples:
  # Full database restore
  $0 backups/prospectflow_full_20260108_140530.sql.gz
  
  # Restore specific schema
  $0 backups/prospectflow_crm_data_20260108_140530.sql.gz crm

Environment Variables:
  POSTGRES_USER     Database user (default: prospectflow)
  POSTGRES_DB       Database name (default: prospectflow)

⚠️  WARNING: This will overwrite existing data!
Always create a backup before restoring.

EOF
}

# ================================================================
# Main Script
# ================================================================

main() {
  if [ $# -lt 1 ]; then
    show_usage
    exit 1
  fi
  
  local backup_file="$1"
  local schema_name="${2:-}"
  
  log "=========================================="
  log "ProspectFlow Database Restore"
  log "=========================================="
  log "Backup file: $(basename "$backup_file")"
  if [ -n "$schema_name" ]; then
    log "Schema: $schema_name"
  else
    log "Restore type: FULL DATABASE"
  fi
  log "=========================================="
  
  # Pre-flight checks
  check_docker_running
  check_backup_file "$backup_file"
  
  # Confirm with user
  confirm_restore "$backup_file"
  
  # Create safety backup
  create_pre_restore_backup
  
  # Perform restore
  local restore_success=0
  
  if [ -n "$schema_name" ]; then
    if restore_schema_backup "$backup_file" "$schema_name"; then
      restore_success=1
    fi
  else
    if restore_full_backup "$backup_file"; then
      restore_success=1
    fi
  fi
  
  # Verify restore
  if [ "$restore_success" -eq 1 ]; then
    verify_restore
  fi
  
  # Final status
  log "=========================================="
  if [ "$restore_success" -eq 1 ]; then
    log "✅ Restore completed successfully"
    log ""
    log "Next steps:"
    log "  1. Verify data integrity"
    log "  2. Run validation tests: psql -f db/validation-tests.sql"
    log "  3. Test application connectivity"
    exit 0
  else
    log "❌ Restore failed"
    log ""
    log "To recover:"
    log "  1. Check logs above for error details"
    log "  2. Restore from pre-restore safety backup if needed"
    log "  3. Check Docker container status: docker compose ps"
    exit 1
  fi
}

# Handle --help flag
if [ "${1:-}" == "--help" ] || [ "${1:-}" == "-h" ] || [ "${1:-}" == "help" ]; then
  show_usage
  exit 0
fi

# Run main function with all arguments
main "$@"
