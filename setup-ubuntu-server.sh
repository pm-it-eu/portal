#!/bin/bash

# =============================================================================
# Ubuntu Server Setup Script für Kundencenter Portal
# Portal: portal.pm-it.eu
# =============================================================================

# Error handling function
handle_error() {
    error "An error occurred at line $1. Continuing with setup..."
    return 0
}

# Set error trap
trap 'handle_error $LINENO' ERR

# Don't exit on error, just log it
set +e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
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

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   error "This script should not be run as root for security reasons"
   exit 1
fi

# Welcome message
echo -e "${BLUE}"
echo "============================================================================="
echo "                    KUNDENCENTER PORTAL SETUP"
echo "                    Ubuntu Server Installation"
echo "                    Portal: portal.pm-it.eu"
echo "============================================================================="
echo -e "${NC}"

# Update system
log "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install essential packages
log "Installing essential packages..."
sudo apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release

# Install Node.js 20.x
log "Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify Node.js installation
NODE_VERSION=$(node --version)
log "Node.js installed: $NODE_VERSION"

# Install PostgreSQL
log "Installing PostgreSQL..."
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Install PM2 globally
log "Installing PM2..."
sudo npm install -g pm2

# Install Nginx
log "Installing Nginx..."
sudo apt install -y nginx

# Install Certbot for Let's Encrypt
log "Installing Certbot..."
sudo apt install -y certbot python3-certbot-nginx

# Create application directory
APP_DIR="/srv/portal"
log "Creating application directory: $APP_DIR"
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

# Instructions for FTP upload
echo -e "${YELLOW}FTP Upload Instructions${NC}"
echo "Please upload your project files to: $APP_DIR"
echo "You can use any FTP client (FileZilla, WinSCP, etc.)"
echo ""
echo "Required files to upload:"
echo "  • All source code files"
echo "  • package.json"
echo "  • next.config.ts"
echo "  • prisma/ directory"
echo "  • scripts/ directory"
echo "  • .env files (if any)"
echo ""
read -p "Press Enter after uploading files to $APP_DIR..."

# Verify essential files exist
if [ ! -f "$APP_DIR/package.json" ]; then
    error "package.json not found in $APP_DIR. Please upload all project files."
    exit 1
fi

if [ ! -f "$APP_DIR/next.config.ts" ]; then
    error "next.config.ts not found in $APP_DIR. Please upload all project files."
    exit 1
fi

log "Project files found. Proceeding with setup..."

cd $APP_DIR

# Configure npm to work in project directory
log "Configuring npm for project directory..."
cd $APP_DIR

# Set npm cache and global directories to project location
npm config set cache $APP_DIR/.npm-cache
npm config set prefix $APP_DIR/.npm-global

# Create npm directories
mkdir -p $APP_DIR/.npm-cache
mkdir -p $APP_DIR/.npm-global

# Set proper permissions
chmod 755 $APP_DIR/.npm-cache
chmod 755 $APP_DIR/.npm-global

# Install application dependencies
log "Installing application dependencies..."
npm install

# Install additional dependencies for production
npm install --save-dev @types/node

# Database setup
log "Setting up PostgreSQL database..."

# Get database credentials from user
echo -e "${YELLOW}Database Setup${NC}"
read -p "Enter database name [kundencenter]: " DB_NAME
DB_NAME=${DB_NAME:-kundencenter}

read -p "Enter database user [kundencenter_user]: " DB_USER
DB_USER=${DB_USER:-kundencenter_user}

read -s -p "Enter database password: " DB_PASSWORD
echo

read -p "Enter database host [localhost]: " DB_HOST
DB_HOST=${DB_HOST:-localhost}

read -p "Enter database port [5432]: " DB_PORT
DB_PORT=${DB_PORT:-5432}

# Create database and user
log "Creating PostgreSQL database and user..."

# Check if database exists
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    warn "Database $DB_NAME already exists, skipping creation"
else
    log "Creating database $DB_NAME..."
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;"
fi

# Check if user exists
if sudo -u postgres psql -t -c "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER';" | grep -q 1; then
    warn "User $DB_USER already exists, updating password..."
    sudo -u postgres psql -c "ALTER USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
else
    log "Creating user $DB_USER..."
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
fi

# Grant privileges (safe to run multiple times)
log "Granting privileges..."
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" 2>/dev/null || true
sudo -u postgres psql -c "ALTER USER $DB_USER CREATEDB;" 2>/dev/null || true

# Grant schema permissions for Prisma
log "Granting schema permissions for Prisma..."
sudo -u postgres psql -d $DB_NAME -c "GRANT ALL ON SCHEMA public TO $DB_USER;" 2>/dev/null || true
sudo -u postgres psql -d $DB_NAME -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;" 2>/dev/null || true
sudo -u postgres psql -d $DB_NAME -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;" 2>/dev/null || true
sudo -u postgres psql -d $DB_NAME -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;" 2>/dev/null || true
sudo -u postgres psql -d $DB_NAME -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;" 2>/dev/null || true

# Create .env.production file
log "Creating production environment file..."
cat > .env.production << EOF
# Database
DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME?schema=public"

# NextAuth.js Secret (generate a strong one)
NEXTAUTH_SECRET=$(openssl rand -base64 32)

# NextAuth.js URL
NEXTAUTH_URL=https://portal.pm-it.eu

# Email Configuration
EMAIL_FROM="noreply@pm-it.eu"
SMTP_HOST="your_smtp_host"
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER="your_smtp_user"
SMTP_PASS="your_smtp_password"

# Upstash Redis (for Rate Limiting)
UPSTASH_REDIS_REST_URL="your_upstash_redis_rest_url"
UPSTASH_REDIS_REST_TOKEN="your_upstash_redis_rest_token"

# Timezone
TZ=Europe/Berlin
EOF

# Run database migrations
log "Running database migrations..."
npx prisma generate
npx prisma db push

# Build application
log "Building application for production..."
npm run build

# Create PM2 ecosystem file
log "Creating PM2 ecosystem configuration..."
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'kundencenter-app',
      script: 'npm',
      args: 'start',
      cwd: '$APP_DIR',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'email-polling',
      script: 'scripts/email-polling-service.js',
      cwd: '$APP_DIR',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
}
EOF

# Create Nginx configuration
log "Creating Nginx configuration..."
if [ -f "/etc/nginx/sites-available/portal.pm-it.eu" ]; then
    warn "Nginx configuration already exists, backing up..."
    sudo cp /etc/nginx/sites-available/portal.pm-it.eu /etc/nginx/sites-available/portal.pm-it.eu.backup.$(date +%Y%m%d_%H%M%S)
fi

sudo tee /etc/nginx/sites-available/portal.pm-it.eu << EOF
server {
    listen 80;
    server_name portal.pm-it.eu;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable the site
log "Enabling Nginx site..."
sudo ln -sf /etc/nginx/sites-available/portal.pm-it.eu /etc/nginx/sites-enabled/
if [ -f "/etc/nginx/sites-enabled/default" ]; then
    warn "Removing default Nginx site..."
    sudo rm -f /etc/nginx/sites-enabled/default
fi

# Test Nginx configuration
sudo nginx -t

# Start services
log "Starting services..."
sudo systemctl restart nginx
sudo systemctl enable nginx

# Start PM2 applications
log "Starting PM2 applications..."
if pm2 list | grep -q "kundencenter-app"; then
    warn "kundencenter-app already running, restarting..."
    pm2 restart kundencenter-app
else
    pm2 start ecosystem.config.js
fi

if pm2 list | grep -q "email-polling"; then
    warn "email-polling already running, restarting..."
    pm2 restart email-polling
else
    pm2 start ecosystem.config.js
fi

pm2 save
pm2 startup

# Setup SSL with Let's Encrypt
echo -e "${YELLOW}SSL Certificate Setup${NC}"
read -p "Do you want to setup SSL certificate with Let's Encrypt? (y/n): " SETUP_SSL

if [[ $SETUP_SSL =~ ^[Yy]$ ]]; then
    log "Setting up SSL certificate..."
    
    # Check if certificate already exists
    if sudo certbot certificates | grep -q "portal.pm-it.eu"; then
        warn "SSL certificate for portal.pm-it.eu already exists"
        read -p "Do you want to renew it? (y/n): " RENEW_SSL
        if [[ $RENEW_SSL =~ ^[Yy]$ ]]; then
            sudo certbot renew --nginx -d portal.pm-it.eu --non-interactive
        fi
    else
        # Get email for Let's Encrypt
        read -p "Enter email for Let's Encrypt notifications: " LETSENCRYPT_EMAIL
        
        # Obtain SSL certificate
        sudo certbot --nginx -d portal.pm-it.eu --email $LETSENCRYPT_EMAIL --agree-tos --non-interactive
    fi
    
    # Setup auto-renewal (only if not already exists)
    if ! crontab -l 2>/dev/null | grep -q "certbot renew"; then
        log "Setting up SSL certificate auto-renewal..."
        (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
    else
        warn "SSL auto-renewal already configured"
    fi
fi

# Firewall configuration
log "Configuring firewall..."
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Create systemd service for PM2
log "Creating PM2 systemd service..."
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME

# Final status check
log "Checking service status..."
pm2 status
sudo systemctl status nginx --no-pager -l

# Check for any errors during setup
if [ $? -ne 0 ]; then
    warn "Some services may not be running properly. Check the logs above."
fi

# Summary
echo -e "${GREEN}"
echo "============================================================================="
echo "                    SETUP COMPLETED SUCCESSFULLY!"
echo "============================================================================="
echo -e "${NC}"

echo -e "${BLUE}Application Details:${NC}"
echo "  • Application Directory: $APP_DIR"
echo "  • Database: $DB_NAME"
echo "  • Database User: $DB_USER"
echo "  • Portal URL: https://portal.pm-it.eu"
echo "  • PM2 Status: pm2 status"
echo "  • PM2 Logs: pm2 logs"
echo "  • Nginx Status: sudo systemctl status nginx"

echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Update .env.production with your actual SMTP and Redis credentials"
echo "2. Configure email settings in the admin panel"
echo "3. Test the application at https://portal.pm-it.eu"
echo "4. Monitor logs: pm2 logs"

echo -e "${GREEN}Setup completed! Your Kundencenter Portal is ready! 🚀${NC}"
