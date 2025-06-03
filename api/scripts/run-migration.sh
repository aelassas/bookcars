#!/bin/bash

# =====================================================
# Comprehensive Car to Dress Migration Runner
# =====================================================
# This script safely runs the database migration from car to dress rental
# with proper backup and rollback capabilities
# =====================================================

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="$SCRIPT_DIR/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/pre_migration_backup_$TIMESTAMP"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create backup directory
create_backup_dir() {
    log_info "Creating backup directory..."
    mkdir -p "$BACKUP_DIR"
}

# Backup database
backup_database() {
    log_info "Creating database backup..."

    # Check if MongoDB is available
    if command -v mongodump &> /dev/null; then
        log_info "Using mongodump for backup..."
        mongodump --uri="${BC_MONGODB_URI:-mongodb://localhost:27017/bookdresses}" --out="$BACKUP_FILE"
        log_success "Database backup created at: $BACKUP_FILE"
    else
        log_warning "mongodump not found. Please ensure you have a backup of your database before proceeding."
        read -p "Do you want to continue without backup? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_error "Migration aborted by user."
            exit 1
        fi
    fi
}

# Run migration
run_migration() {
    log_info "Starting comprehensive car-to-dress migration..."

    # Make the script executable
    chmod +x "$SCRIPT_DIR/comprehensive-car-to-dress-migration.js"

    # Run the migration script
    if node "$SCRIPT_DIR/comprehensive-car-to-dress-migration.js"; then
        log_success "Migration completed successfully!"
        return 0
    else
        log_error "Migration failed!"
        return 1
    fi
}

# Verify migration
verify_migration() {
    log_info "Verifying migration results..."

    # Run verification script if it exists
    if [ -f "$SCRIPT_DIR/verify-migration.js" ]; then
        node "$SCRIPT_DIR/verify-migration.js"
    else
        log_warning "Verification script not found. Please manually verify the migration."
    fi
}

# Rollback function
rollback_migration() {
    log_warning "Rolling back migration..."

    if [ -d "$BACKUP_FILE" ]; then
        log_info "Restoring from backup: $BACKUP_FILE"
        if command -v mongorestore &> /dev/null; then
            mongorestore --uri="${BC_MONGODB_URI:-mongodb://localhost:27017/bookdresses}" --drop "$BACKUP_FILE"
            log_success "Database restored from backup."
        else
            log_error "mongorestore not found. Please manually restore from backup: $BACKUP_FILE"
        fi
    else
        log_error "No backup found for rollback. Please restore manually."
    fi
}

# Main execution
main() {
    log_info "=== Car to Dress Migration Script ==="
    log_info "Timestamp: $TIMESTAMP"

    # Check prerequisites
    if ! command -v node &> /dev/null; then
        log_error "Node.js is required but not installed."
        exit 1
    fi

    # Load environment variables
    if [ -f "$SCRIPT_DIR/../.env" ]; then
        source "$SCRIPT_DIR/../.env"
        log_info "Environment variables loaded."
    else
        log_warning ".env file not found. Using default values."
    fi

    # Confirm migration
    echo
    log_warning "This migration will:"
    echo "  - Remove all car-related data and tables"
    echo "  - Convert existing data to dress rental format"
    echo "  - Add new dress-specific properties"
    echo "  - This operation cannot be easily undone!"
    echo
    read -p "Are you sure you want to proceed? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Migration cancelled by user."
        exit 0
    fi

    # Execute migration steps
    create_backup_dir
    backup_database

    if run_migration; then
        verify_migration
        log_success "=== Migration completed successfully! ==="
        log_info "Backup location: $BACKUP_FILE"
    else
        log_error "=== Migration failed! ==="
        read -p "Do you want to rollback? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rollback_migration
        fi
        exit 1
    fi
}

# Run main function
main "$@"
