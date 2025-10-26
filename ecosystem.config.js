module.exports = {
  apps: [
    {
      name: 'kundencenter-app',
      script: 'npm',
      args: 'run start',
      cwd: './',
      instances: 'max',
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      }
    }
    // Email-polling temporär deaktiviert bis E-Mail-Konfigurationen existieren
  ]
}


