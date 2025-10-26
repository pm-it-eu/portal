module.exports = {
  apps: [
    {
      name: 'kundencenter-app',
      script: 'npm',
      args: 'run dev',
      cwd: './',
      watch: false,
      env: {
        NODE_ENV: 'development'
      }
    },
    {
      name: 'email-polling',
      script: 'scripts/email-polling-service.js',
      cwd: './',
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
}


