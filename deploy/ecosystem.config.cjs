/** PM2 config — chạy trên EC2: pm2 start deploy/ecosystem.config.cjs */
module.exports = {
  apps: [
    {
      name: 'gametoanhoc-api',
      cwd: '/opt/gametoanhoc/backend',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 5050,
      },
    },
  ],
};
