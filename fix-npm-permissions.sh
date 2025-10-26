#!/bin/bash

# =============================================================================
# NPM Permissions Fix Script
# Fixes npm permission issues on Ubuntu Server
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
echo "                    NPM PERMISSIONS FIX"
echo "                    Fixing npm permission issues"
echo "============================================================================="
echo -e "${NC}"

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   error "This script should not be run as root for security reasons"
   exit 1
fi

# Fix npm permissions
log "Fixing npm permissions..."

# Set project directory
PROJECT_DIR="/srv/portal"

# Create npm directories in project location
mkdir -p $PROJECT_DIR/.npm-cache
mkdir -p $PROJECT_DIR/.npm-global

# Set npm cache and global directories to project location
npm config set cache $PROJECT_DIR/.npm-cache
npm config set prefix $PROJECT_DIR/.npm-global

# Set proper permissions
chmod 755 $PROJECT_DIR/.npm-cache
chmod 755 $PROJECT_DIR/.npm-global

# Add to PATH if not already there
if ! grep -q "$PROJECT_DIR/.npm-global/bin" ~/.bashrc; then
    echo "export PATH=$PROJECT_DIR/.npm-global/bin:\$PATH" >> ~/.bashrc
    export PATH=$PROJECT_DIR/.npm-global/bin:$PATH
fi

# Fix ownership of project directory
sudo chown -R $USER:$USER $PROJECT_DIR

# Clear npm cache
log "Clearing npm cache..."
npm cache clean --force

# Reinstall PM2 with correct permissions
log "Reinstalling PM2 with correct permissions..."
npm install -g pm2

# Verify PM2 installation
if command -v pm2 &> /dev/null; then
    log "PM2 installed successfully"
    pm2 --version
else
    error "PM2 installation failed"
    exit 1
fi

# Fix project directory permissions
log "Fixing project directory permissions..."
sudo chown -R $USER:$USER /srv/portal

# Clean up any existing node_modules
if [ -d "/srv/portal/node_modules" ]; then
    log "Removing existing node_modules..."
    rm -rf /srv/portal/node_modules
fi

# Clean up package-lock.json
if [ -f "/srv/portal/package-lock.json" ]; then
    log "Removing package-lock.json..."
    rm -f /srv/portal/package-lock.json
fi

# Install dependencies with correct permissions
log "Installing project dependencies..."
cd /srv/portal
npm install

# Verify installation
if [ -d "node_modules" ]; then
    log "Dependencies installed successfully"
else
    error "Dependency installation failed"
    exit 1
fi

echo -e "${GREEN}"
echo "============================================================================="
echo "                    NPM PERMISSIONS FIXED!"
echo "============================================================================="
echo -e "${NC}"

echo -e "${BLUE}Next Steps:${NC}"
echo "1. Run the main setup script: ./setup-ubuntu-server.sh"
echo "2. Or continue with manual setup"

log "NPM permissions fixed! 🚀"
