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
    },
    {
      name: 'email-polling',
      script: 'scripts/email-polling-service.js',
      cwd: './',
      autorestart: false, // WICHTIG: Nicht automatisch neu starten
      watch: false,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
}


