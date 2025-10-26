#!/bin/bash

# =============================================================================
# GitHub-based Server Setup
# Für Ubuntu Server mit Git-basiertem Deployment
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

echo -e "${BLUE}"
echo "============================================================================="
echo "                    GITHUB-BASED SERVER SETUP"
echo "                    Kundencenter Portal"
echo "============================================================================="
echo -e "${NC}"

# Server-Details
GITHUB_REPO="your-username/kundencenter"  # Ändern Sie das zu Ihrem GitHub Repo
APP_DIR="/srv/portal"

log "🚀 Starte GitHub-basiertes Setup..."

# 1. Git Repository klonen
log "📥 Klone GitHub Repository..."
if [ -d "$APP_DIR" ]; then
    warn "Verzeichnis $APP_DIR existiert bereits. Führe git pull aus..."
    cd $APP_DIR
    git pull origin main
else
    git clone https://github.com/$GITHUB_REPO.git $APP_DIR
    cd $APP_DIR
fi

# 2. Node.js Dependencies installieren
log "📦 Installiere Dependencies..."
npm install

# 3. Prisma Setup
log "🔧 Setup Prisma..."
npx prisma generate

# 4. Environment File erstellen
log "⚙️ Erstelle .env.production..."
if [ ! -f ".env.production" ]; then
    cat > .env.production << 'EOF'
# Database
DATABASE_URL="postgresql://portal_user:your_password@pg.pm-it.eu:5432/portal?schema=public"

# NextAuth.js Secret
NEXTAUTH_SECRET="your_nextauth_secret_here_change_this_in_production"
NEXTAUTH_URL="https://portal.pm-it.eu"

# Email (for sending notifications)
EMAIL_FROM="support@portal.pm-it.eu"
SMTP_HOST="your_smtp_host"
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER="your_smtp_user"
SMTP_PASS="your_smtp_password"

# Timezone
TZ=Europe/Berlin
EOF
    warn "⚠️ Bitte bearbeiten Sie .env.production mit Ihren echten Werten!"
fi

# 5. Build erstellen
log "🏗️ Erstelle Production Build..."
# Temporarily disable ESLint for build
export DISABLE_ESLINT_PLUGIN=true
npm run build

# 6. PM2 Setup
log "🚀 Setup PM2..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# 7. Nginx Setup (falls nicht vorhanden)
log "🌐 Setup Nginx..."
if [ ! -f "/etc/nginx/sites-available/portal.pm-it.eu" ]; then
    sudo tee /etc/nginx/sites-available/portal.pm-it.eu << 'EOF'
server {
    listen 80;
    server_name portal.pm-it.eu;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
    sudo ln -sf /etc/nginx/sites-available/portal.pm-it.eu /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl restart nginx
fi

# 8. SSL Setup (optional)
log "🔒 Setup SSL (optional)..."
read -p "SSL-Zertifikat mit Let's Encrypt einrichten? (y/n): " setup_ssl
if [[ $setup_ssl =~ ^[Yy]$ ]]; then
    sudo certbot --nginx -d portal.pm-it.eu --non-interactive --agree-tos --email your-email@example.com
fi

log "✅ GitHub-basiertes Setup abgeschlossen!"
log "🌐 Anwendung läuft auf: https://portal.pm-it.eu"

echo -e "${GREEN}"
echo "============================================================================="
echo "                    SETUP ERFOLGREICH!"
echo "============================================================================="
echo -e "${NC}"

log "📋 Nächste Schritte:"
log "1. Bearbeiten Sie .env.production mit Ihren echten Werten"
log "2. Konfigurieren Sie GitHub Secrets für automatisches Deployment:"
log "   - HOST: Ihre Server-IP"
log "   - USERNAME: Ihr SSH-Username"
log "   - SSH_KEY: Ihr privater SSH-Key"
log "   - PORT: SSH-Port (meist 22)"
log "3. Pushen Sie Änderungen zu GitHub für automatisches Deployment"




