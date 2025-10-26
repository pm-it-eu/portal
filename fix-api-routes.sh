#!/bin/bash

# =============================================================================
# Fix API Routes for Next.js 15
# Updates all API routes with dynamic parameters to use Promise<{ param: string }>
# =============================================================================

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

echo -e "${BLUE}"
echo "============================================================================="
echo "                    FIXING API ROUTES FOR NEXT.JS 15"
echo "                    Updating dynamic parameter handling"
echo "============================================================================="
echo -e "${NC}"

# Change to project directory
cd /srv/portal

log "Fixing API routes with dynamic parameters..."

# Find all API route files with dynamic parameters
find src/app/api -name "*.ts" -path "*/\[*\]/*" | while read file; do
    log "Processing: $file"
    
    # Replace { params: { param: string } } with { params: Promise<{ param: string }> }
    sed -i 's/{ params }: { params: { \([^}]*\) } }/{ params }: { params: Promise<{ \1 }> }/g' "$file"
    
    # Replace const { param } = params with const { param } = await params
    sed -i 's/const { \([^}]*\) } = params/const { \1 } = await params/g' "$file"
done

log "API routes fixed! Testing build..."

# Test build
if npm run build; then
    log "Build successful! 🎉"
else
    log "Build still has issues. Check the output above."
fi

echo -e "${GREEN}"
echo "============================================================================="
echo "                    API ROUTES FIXED!"
echo "============================================================================="
echo -e "${NC}"

log "All API routes have been updated for Next.js 15! 🚀"




