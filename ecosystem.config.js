module.exports = {
  apps: [
    {
      name: 'kundencenter-app',
      script: 'npm',
      args: 'run start',
      cwd: './',
      instances: 1, // Nur eine Instanz
      exec_mode: 'fork', // Fork-Modus statt Cluster
      watch: false,
      autorestart: true,
      max_restarts: 5, // Maximal 5 Restarts
      min_uptime: '10s', // Mindestens 10 Sekunden laufen
      env_file: '.env',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'email-polling',
      script: 'scripts/email-polling-service.js',
      cwd: './',
      autorestart: false, // WICHTIG: Nicht automatisch neu starten
      watch: false,
      env_file: '.env',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
}


