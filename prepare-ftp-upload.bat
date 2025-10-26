@echo off
REM =============================================================================
REM FTP Upload Preparation Script for Windows
REM Prepares the project for upload to Ubuntu Server
REM =============================================================================

setlocal enabledelayedexpansion

echo.
echo =============================================================================
echo                     FTP UPLOAD PREPARATION
echo                     Preparing project for server upload
echo =============================================================================
echo.

REM Create upload directory
set UPLOAD_DIR=portal-upload
echo [INFO] Creating upload directory: %UPLOAD_DIR%
if exist "%UPLOAD_DIR%" rmdir /s /q "%UPLOAD_DIR%"
mkdir "%UPLOAD_DIR%"

REM Copy essential files and directories
echo [INFO] Copying project files...

REM Source code
xcopy /E /I /Y "src" "%UPLOAD_DIR%\src"
if exist "public" xcopy /E /I /Y "public" "%UPLOAD_DIR%\public"

REM Configuration files
copy /Y "package.json" "%UPLOAD_DIR%\"
if exist "package-lock.json" copy /Y "package-lock.json" "%UPLOAD_DIR%\"
if exist "next.config.ts" copy /Y "next.config.ts" "%UPLOAD_DIR%\"
if exist "next.config.js" copy /Y "next.config.js" "%UPLOAD_DIR%\"
if exist "tsconfig.json" copy /Y "tsconfig.json" "%UPLOAD_DIR%\"
if exist "tailwind.config.ts" copy /Y "tailwind.config.ts" "%UPLOAD_DIR%\"
if exist "tailwind.config.js" copy /Y "tailwind.config.js" "%UPLOAD_DIR%\"
if exist "postcss.config.js" copy /Y "postcss.config.js" "%UPLOAD_DIR%\"

REM Prisma
xcopy /E /I /Y "prisma" "%UPLOAD_DIR%\prisma"

REM Scripts
xcopy /E /I /Y "scripts" "%UPLOAD_DIR%\scripts"

REM Environment files (create example)
if exist ".env.local" (
    copy /Y ".env.local" "%UPLOAD_DIR%\.env.local.example"
    echo [INFO] Created .env.local.example (remove sensitive data before upload)
)

REM Create .gitignore for upload
echo # Dependencies > "%UPLOAD_DIR%\.gitignore"
echo node_modules/ >> "%UPLOAD_DIR%\.gitignore"
echo npm-debug.log* >> "%UPLOAD_DIR%\.gitignore"
echo yarn-debug.log* >> "%UPLOAD_DIR%\.gitignore"
echo yarn-error.log* >> "%UPLOAD_DIR%\.gitignore"
echo. >> "%UPLOAD_DIR%\.gitignore"
echo # Next.js >> "%UPLOAD_DIR%\.gitignore"
echo .next/ >> "%UPLOAD_DIR%\.gitignore"
echo out/ >> "%UPLOAD_DIR%\.gitignore"
echo. >> "%UPLOAD_DIR%\.gitignore"
echo # Production >> "%UPLOAD_DIR%\.gitignore"
echo build/ >> "%UPLOAD_DIR%\.gitignore"
echo dist/ >> "%UPLOAD_DIR%\.gitignore"
echo. >> "%UPLOAD_DIR%\.gitignore"
echo # Environment variables >> "%UPLOAD_DIR%\.gitignore"
echo .env >> "%UPLOAD_DIR%\.gitignore"
echo .env.local >> "%UPLOAD_DIR%\.gitignore"
echo .env.development.local >> "%UPLOAD_DIR%\.gitignore"
echo .env.test.local >> "%UPLOAD_DIR%\.gitignore"
echo .env.production.local >> "%UPLOAD_DIR%\.gitignore"
echo. >> "%UPLOAD_DIR%\.gitignore"
echo # Logs >> "%UPLOAD_DIR%\.gitignore"
echo *.log >> "%UPLOAD_DIR%\.gitignore"
echo. >> "%UPLOAD_DIR%\.gitignore"
echo # PM2 >> "%UPLOAD_DIR%\.gitignore"
echo .pm2/ >> "%UPLOAD_DIR%\.gitignore"
echo. >> "%UPLOAD_DIR%\.gitignore"
echo # OS generated files >> "%UPLOAD_DIR%\.gitignore"
echo .DS_Store >> "%UPLOAD_DIR%\.gitignore"
echo Thumbs.db >> "%UPLOAD_DIR%\.gitignore"

REM Create README for server setup
echo # Server Setup Instructions > "%UPLOAD_DIR%\README-SERVER-SETUP.md"
echo. >> "%UPLOAD_DIR%\README-SERVER-SETUP.md"
echo ## 1. Upload Files >> "%UPLOAD_DIR%\README-SERVER-SETUP.md"
echo Upload all files in this directory to: `/srv/portal/` on your Ubuntu server >> "%UPLOAD_DIR%\README-SERVER-SETUP.md"
echo. >> "%UPLOAD_DIR%\README-SERVER-SETUP.md"
echo ## 2. Run Setup Script >> "%UPLOAD_DIR%\README-SERVER-SETUP.md"
echo On the server, run: >> "%UPLOAD_DIR%\README-SERVER-SETUP.md"
echo ```bash >> "%UPLOAD_DIR%\README-SERVER-SETUP.md"
echo chmod +x setup-ubuntu-server.sh >> "%UPLOAD_DIR%\README-SERVER-SETUP.md"
echo ./setup-ubuntu-server.sh >> "%UPLOAD_DIR%\README-SERVER-SETUP.md"
echo ``` >> "%UPLOAD_DIR%\README-SERVER-SETUP.md"
echo. >> "%UPLOAD_DIR%\README-SERVER-SETUP.md"
echo ## 3. Configure Environment >> "%UPLOAD_DIR%\README-SERVER-SETUP.md"
echo After setup, edit `.env.production` with your actual credentials >> "%UPLOAD_DIR%\README-SERVER-SETUP.md"
echo. >> "%UPLOAD_DIR%\README-SERVER-SETUP.md"
echo ## Portal URL >> "%UPLOAD_DIR%\README-SERVER-SETUP.md"
echo https://portal.pm-it.eu >> "%UPLOAD_DIR%\README-SERVER-SETUP.md"

REM Copy setup script
copy /Y "setup-ubuntu-server.sh" "%UPLOAD_DIR%\"

echo.
echo =============================================================================
echo                     UPLOAD PREPARATION COMPLETED!
echo =============================================================================
echo.

echo [INFO] Upload Options:
echo 1. Upload the directory: %UPLOAD_DIR%\
echo 2. Use FTP client (FileZilla, WinSCP, etc.)
echo.

echo [INFO] Upload Instructions:
echo 1. Use FTP client to connect to your Ubuntu server
echo 2. Upload to: /srv/portal/
echo 3. Run setup-ubuntu-server.sh on the server
echo.

echo [INFO] Files prepared for upload:
dir /B "%UPLOAD_DIR%"

echo.
echo [INFO] Next Steps:
echo 1. Upload files to server
echo 2. Run setup-ubuntu-server.sh on the server
echo 3. Configure environment variables
echo 4. Start services
echo.

echo [SUCCESS] Upload preparation completed! 🚀
pause

