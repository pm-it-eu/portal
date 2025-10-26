# GitHub Deployment Setup

## 1. Repository erstellen
1. Erstellen Sie ein neues Repository auf GitHub
2. Pushen Sie den Code: `git push origin main`

## 2. GitHub Secrets konfigurieren
Gehen Sie zu: `Settings` → `Secrets and variables` → `Actions`

Fügen Sie folgende Secrets hinzu:

### HOST
```
portal.pm-it.eu
```

### USERNAME
```
root
```
(oder Ihr Ubuntu-Username)

### SSH_KEY
Ihr privater SSH-Key (der komplette Inhalt von `~/.ssh/id_rsa`)

### PORT
```
22
```
(oder Ihr SSH-Port)

## 3. Server Setup
```bash
# SSH auf den Server
ssh root@portal.pm-it.eu

# Setup Script ausführen
wget https://raw.githubusercontent.com/your-username/kundencenter/main/server-setup-github.sh
chmod +x server-setup-github.sh
./server-setup-github.sh
```

## 4. Automatisches Deployment
Nach dem Setup wird bei jedem Push zu `main` automatisch deployed:

1. **Code pushen:** `git push origin main`
2. **GitHub Actions** läuft automatisch
3. **Server wird aktualisiert** automatisch

## 5. Manuelles Deployment
Falls nötig, können Sie auch manuell deployen:

```bash
# Auf dem Server
cd /srv/portal
git pull origin main
npm ci
npx prisma generate
npm run build
pm2 restart ecosystem.config.js
```

## 6. Monitoring
```bash
# PM2 Status prüfen
pm2 status

# Logs anzeigen
pm2 logs

# Nginx Status
sudo systemctl status nginx
```

## 7. Troubleshooting
```bash
# PM2 neu starten
pm2 restart all

# Nginx neu starten
sudo systemctl restart nginx

# Logs prüfen
pm2 logs --lines 100
```




