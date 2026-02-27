module.exports = {
  apps: [{
    name: 'planta3d',
    script: 'server.js',
    cwd: '/root/clawd/planta3d',
    env: {
      NODE_ENV: 'production',
      PORT: 3400
    },
    watch: false,
    instances: 1,
    autorestart: true,
    max_memory_restart: '256M'
  }]
};
