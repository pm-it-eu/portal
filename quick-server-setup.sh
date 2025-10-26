#!/bin/bash

# =============================================================================
# Quick Server Setup - Vereinfachte Version
# Für bereits konfigurierte Server
# =============================================================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

echo -e "${BLUE}"
echo "============================================================================="
echo "                    QUICK SERVER SETUP"
echo "                    Kundencenter Portal"
echo "============================================================================="
echo -e "${NC}"

# Wechsle ins Projekt-Verzeichnis
cd /srv/portal

log "📦 Installiere Dependencies..."
npm install

log "🔧 Generiere Prisma Client..."
npx prisma generate

log "🏗️ Erstelle Production Build..."
npm run build

log "🚀 Starte PM2 Services..."
pm2 start ecosystem.config.js
pm2 save

log "✅ Setup abgeschlossen!"
log "🌐 Anwendung läuft auf: https://portal.pm-it.eu"

echo -e "${GREEN}"
echo "============================================================================="
echo "                    SETUP ERFOLGREICH!"
echo "============================================================================="
echo -e "${NC}"




