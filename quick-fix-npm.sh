#!/bin/bash

# =============================================================================
# Quick NPM Fix for /srv/portal/
# =============================================================================

set -e

echo "🔧 Quick NPM Fix for /srv/portal/"

# Set project directory
PROJECT_DIR="/srv/portal"

# Navigate to project directory
cd $PROJECT_DIR

# Configure npm to work in project directory
echo "📁 Configuring npm for project directory..."
npm config set cache $PROJECT_DIR/.npm-cache
npm config set prefix $PROJECT_DIR/.npm-global

# Create npm directories
mkdir -p $PROJECT_DIR/.npm-cache
mkdir -p $PROJECT_DIR/.npm-global

# Set permissions
chmod 755 $PROJECT_DIR/.npm-cache
chmod 755 $PROJECT_DIR/.npm-global

# Clear npm cache
echo "🧹 Clearing npm cache..."
npm cache clean --force

# Remove existing node_modules if they exist
if [ -d "node_modules" ]; then
    echo "🗑️ Removing existing node_modules..."
    rm -rf node_modules
fi

if [ -f "package-lock.json" ]; then
    echo "🗑️ Removing package-lock.json..."
    rm -f package-lock.json
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Install PM2 locally in project
echo "🚀 Installing PM2 locally..."
npm install -g pm2

echo "✅ NPM Fix completed!"
echo "📍 Working directory: $PROJECT_DIR"
echo "📁 NPM cache: $PROJECT_DIR/.npm-cache"
echo "📁 NPM global: $PROJECT_DIR/.npm-global"

