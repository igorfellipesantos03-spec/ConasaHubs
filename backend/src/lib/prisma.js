import { PrismaClient } from '@prisma/client';
import { isProduction } from '../config/env.js';

/**
 * Instância única do Prisma. Em desenvolvimento o `node --watch` reinicia o
 * módulo a cada mudança, então guardamos o cliente no globalThis para não abrir
 * uma nova pool de conexões a cada reload.
 */
const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.__centralhubPrisma ??
  new PrismaClient({
    log: isProduction ? ['error'] : ['warn', 'error'],
  });

if (!isProduction) {
  globalForPrisma.__centralhubPrisma = prisma;
}
