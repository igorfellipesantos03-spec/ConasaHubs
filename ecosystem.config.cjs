// Processos do CentralHub no PM2 (servidor Linux).
// Subir/atualizar: pm2 start ecosystem.config.cjs && pm2 save
//
// O proxy reverso da infra (192.168.0.150) publica https://centralhub.conasa.com:
//   /api/*  → 192.168.0.203:3001 (centralhub-api)
//   demais  → 192.168.0.203:8080 (centralhub-web)
module.exports = {
  apps: [
    {
      name: 'centralhub-api',
      cwd: __dirname + '/backend',
      script: 'src/server.js',
      max_memory_restart: '300M',
    },
    {
      name: 'centralhub-web',
      cwd: __dirname + '/frontend',
      // Serve o dist/ e encaminha /api → 127.0.0.1:3001 (permite testar direto no IP)
      script: 'server.js',
      env: {
        PORT: 8080,
      },
    },
  ],
};
