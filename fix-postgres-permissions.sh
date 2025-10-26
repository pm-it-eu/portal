#!/bin/bash

# =============================================================================
# PostgreSQL Permissions Fix Script
# Fixes permission issues for Prisma migrations
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

echo -e "${BLUE}"
echo "============================================================================="
echo "                    POSTGRESQL PERMISSIONS FIX"
echo "                    Fixing Prisma migration permissions"
echo "============================================================================="
echo -e "${NC}"

# Get database credentials
read -p "Enter database name [portal]: " DB_NAME
DB_NAME=${DB_NAME:-portal}

read -p "Enter database user [portal_user]: " DB_USER
DB_USER=${DB_USER:-portal_user}

log "Fixing permissions for database: $DB_NAME, user: $DB_USER"

# Grant schema permissions for Prisma
log "Granting schema permissions for Prisma..."
sudo -u postgres psql -d $DB_NAME -c "GRANT ALL ON SCHEMA public TO $DB_USER;"
sudo -u postgres psql -d $DB_NAME -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;"
sudo -u postgres psql -d $DB_NAME -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;"
sudo -u postgres psql -d $DB_NAME -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;"
sudo -u postgres psql -d $DB_NAME -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;"

# Alternative: Make user superuser (if needed)
read -p "Do you want to make the user a superuser? (y/n): " MAKE_SUPERUSER
if [[ $MAKE_SUPERUSER =~ ^[Yy]$ ]]; then
    log "Making user superuser..."
    sudo -u postgres psql -c "ALTER USER $DB_USER WITH SUPERUSER;"
fi

# Test connection
log "Testing database connection..."
if psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1; then
    log "Database connection successful!"
else
    error "Database connection failed. Please check credentials."
    exit 1
fi

# Try Prisma migration
log "Testing Prisma migration..."
cd /srv/portal
if npx prisma db push; then
    log "Prisma migration successful!"
else
    error "Prisma migration failed. Check the error above."
    exit 1
fi

echo -e "${GREEN}"
echo "============================================================================="
echo "                    PERMISSIONS FIXED SUCCESSFULLY!"
echo "============================================================================="
echo -e "${NC}"

log "PostgreSQL permissions fixed! 🚀"

