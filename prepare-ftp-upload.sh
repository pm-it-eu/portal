#!/bin/bash

# =============================================================================
# FTP Upload Preparation Script
# Prepares the project for upload to Ubuntu Server
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
echo "                    FTP UPLOAD PREPARATION"
echo "                    Preparing project for server upload"
echo "============================================================================="
echo -e "${NC}"

# Create upload directory
UPLOAD_DIR="portal-upload"
log "Creating upload directory: $UPLOAD_DIR"
rm -rf $UPLOAD_DIR
mkdir -p $UPLOAD_DIR

# Copy essential files and directories
log "Copying project files..."

# Source code
cp -r src $UPLOAD_DIR/
cp -r public $UPLOAD_DIR/ 2>/dev/null || true

# Configuration files
cp package.json $UPLOAD_DIR/
cp package-lock.json $UPLOAD_DIR/ 2>/dev/null || true
cp next.config.ts $UPLOAD_DIR/
cp next.config.js $UPLOAD_DIR/ 2>/dev/null || true
cp tsconfig.json $UPLOAD_DIR/
cp tailwind.config.ts $UPLOAD_DIR/ 2>/dev/null || true
cp tailwind.config.js $UPLOAD_DIR/ 2>/dev/null || true
cp postcss.config.js $UPLOAD_DIR/ 2>/dev/null || true

# Prisma
cp -r prisma $UPLOAD_DIR/

# Scripts
cp -r scripts $UPLOAD_DIR/

# Environment files (without sensitive data)
if [ -f ".env.local" ]; then
    cp .env.local $UPLOAD_DIR/.env.local.example
    # Remove sensitive data
    sed -i 's/DATABASE_URL=.*/DATABASE_URL="postgresql:\/\/user:password@localhost:5432\/database"/' $UPLOAD_DIR/.env.local.example
    sed -i 's/NEXTAUTH_SECRET=.*/NEXTAUTH_SECRET="your_secret_here"/' $UPLOAD_DIR/.env.local.example
    sed -i 's/SMTP_PASS=.*/SMTP_PASS="your_smtp_password"/' $UPLOAD_DIR/.env.local.example
    sed -i 's/UPSTASH_REDIS_REST_TOKEN=.*/UPSTASH_REDIS_REST_TOKEN="your_redis_token"/' $UPLOAD_DIR/.env.local.example
fi

# Create .gitignore for upload
cat > $UPLOAD_DIR/.gitignore << EOF
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Next.js
.next/
out/

# Production
build/
dist/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
*.log

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# PM2
.pm2/

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db
EOF

# Create README for server setup
cat > $UPLOAD_DIR/README-SERVER-SETUP.md << EOF
# Server Setup Instructions

## 1. Upload Files
Upload all files in this directory to: \`/srv/portal/\` on your Ubuntu server

## 2. Run Setup Script
On the server, run:
\`\`\`bash
chmod +x setup-ubuntu-server.sh
./setup-ubuntu-server.sh
\`\`\`

## 3. Configure Environment
After setup, edit \`.env.production\` with your actual credentials:
- Database credentials
- SMTP settings
- Redis credentials
- NextAuth secret

## 4. Restart Services
\`\`\`bash
pm2 restart all
sudo systemctl restart nginx
\`\`\`

## 5. Check Status
\`\`\`bash
pm2 status
sudo systemctl status nginx
\`\`\`

## Portal URL
https://portal.pm-it.eu
EOF

# Create a compressed archive for easier upload
log "Creating compressed archive..."
tar -czf portal-upload.tar.gz -C $UPLOAD_DIR .

# Show upload instructions
echo -e "${GREEN}"
echo "============================================================================="
echo "                    UPLOAD PREPARATION COMPLETED!"
echo "============================================================================="
echo -e "${NC}"

echo -e "${BLUE}Upload Options:${NC}"
echo "1. Upload the directory: $UPLOAD_DIR/"
echo "2. Upload the archive: portal-upload.tar.gz"
echo ""

echo -e "${BLUE}Upload Instructions:${NC}"
echo "1. Use FTP client (FileZilla, WinSCP, etc.)"
echo "2. Connect to your Ubuntu server"
echo "3. Upload to: /srv/portal/"
echo "4. If using archive, extract: tar -xzf portal-upload.tar.gz"
echo ""

echo -e "${BLUE}Files to upload:${NC}"
ls -la $UPLOAD_DIR/

echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Upload files to server"
echo "2. Run setup-ubuntu-server.sh on the server"
echo "3. Configure environment variables"
echo "4. Start services"

log "Upload preparation completed! 🚀"




