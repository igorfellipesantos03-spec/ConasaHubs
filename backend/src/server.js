import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';

const app = createApp();
const server = app.listen(env.PORT, () => {
  logger.info(`CentralHub API ouvindo na porta ${env.PORT} (${env.NODE_ENV})`);
});

async function shutdown(signal) {
  logger.info(`${signal} recebido, encerrando...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  // Se as conexões não fecharem sozinhas, não deixa o serviço pendurado.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
