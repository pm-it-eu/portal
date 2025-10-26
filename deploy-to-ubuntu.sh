#!/bin/bash

# =============================================================================
# Ubuntu Deployment Script für Kundencenter
# Lädt die Anwendung auf Ubuntu hoch und startet sie
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
echo "                    UBUNTU DEPLOYMENT SCRIPT"
echo "                    Kundencenter Portal"
echo "============================================================================="
echo -e "${NC}"

# Server-Details
SERVER="portal.pm-it.eu"
USER="root"  # oder Ihr Ubuntu-User
REMOTE_DIR="/srv/portal"

log "🚀 Starte Deployment auf Ubuntu Server..."

# 1. Erstelle lokales Deployment-Paket
log "📦 Erstelle Deployment-Paket..."
mkdir -p deploy-package

# Kopiere alle notwendigen Dateien
cp -r src deploy-package/
cp -r prisma deploy-package/
cp -r scripts deploy-package/
cp package.json deploy-package/
cp next.config.ts deploy-package/
cp tsconfig.json deploy-package/
cp postcss.config.js deploy-package/
cp tailwind.config.ts deploy-package/
cp .eslintrc.json deploy-package/
cp ecosystem.config.js deploy-package/
cp .gitignore deploy-package/
cp .prettierrc.json deploy-package/

# Kopiere .env.example als .env.production
if [ -f ".env" ]; then
    cp .env deploy-package/.env.production
    log "✅ .env Datei kopiert"
else
    warn "⚠️ .env Datei nicht gefunden - erstellen Sie eine .env.production auf dem Server"
fi

log "📦 Deployment-Paket erstellt in 'deploy-package/'"

# 2. Upload zum Server
log "📤 Lade Dateien auf Server hoch..."
rsync -avz --delete deploy-package/ $USER@$SERVER:$REMOTE_DIR/

# 3. Führe Setup auf dem Server aus
log "🔧 Führe Server-Setup aus..."
ssh $USER@$SERVER << 'EOF'
cd /srv/portal

# NPM Dependencies installieren
npm install

# Prisma Client generieren
npx prisma generate

# Build erstellen
npm run build

# PM2 starten
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo "✅ Deployment abgeschlossen!"
echo "🌐 Anwendung läuft auf: https://portal.pm-it.eu"
EOF

log "🎉 Deployment erfolgreich abgeschlossen!"
log "🌐 Ihre Anwendung läuft jetzt auf: https://portal.pm-it.eu"

# Cleanup
rm -rf deploy-package

echo -e "${GREEN}"
echo "============================================================================="
echo "                    DEPLOYMENT ERFOLGREICH!"
echo "============================================================================="
echo -e "${NC}"

