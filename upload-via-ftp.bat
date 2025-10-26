@echo off
echo =============================================================================
echo                    FTP UPLOAD SCRIPT
echo                    Kundencenter Portal
echo =============================================================================

echo Erstelle Upload-Paket...

REM Erstelle Upload-Verzeichnis
if not exist "portal-upload" mkdir "portal-upload"

REM Kopiere alle notwendigen Dateien
xcopy "src" "portal-upload\src" /E /I /Y
xcopy "prisma" "portal-upload\prisma" /E /I /Y
xcopy "scripts" "portal-upload\scripts" /E /I /Y
copy "package.json" "portal-upload\" /Y
copy "next.config.ts" "portal-upload\" /Y
copy "tsconfig.json" "portal-upload\" /Y
copy "postcss.config.js" "portal-upload\" /Y
copy "tailwind.config.ts" "portal-upload\" /Y
copy ".eslintrc.json" "portal-upload\" /Y
copy "ecosystem.config.js" "portal-upload\" /Y
copy ".gitignore" "portal-upload\" /Y
copy ".prettierrc.json" "portal-upload\" /Y

REM Kopiere .env als .env.production
if exist ".env" (
    copy ".env" "portal-upload\.env.production" /Y
    echo .env Datei kopiert
) else (
    echo WARNUNG: .env Datei nicht gefunden
)

echo.
echo =============================================================================
echo                    UPLOAD-PAKET ERSTELLT!
echo =============================================================================
echo.
echo Nächste Schritte:
echo 1. Laden Sie den Inhalt von 'portal-upload\' via FTP nach /srv/portal/ hoch
echo 2. SSH auf den Server: ssh root@portal.pm-it.eu
echo 3. Führen Sie aus: cd /srv/portal && chmod +x setup-ubuntu-server.sh && ./setup-ubuntu-server.sh
echo.
echo Oder verwenden Sie das automatische Script: deploy-to-ubuntu.sh
echo.
pause




