import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncRoute } from '../lib/asyncRoute.js';

const router = Router();

/** Liveness — responde mesmo com o banco fora, para o IIS saber que o Node está de pé. */
router.get(
  '/health',
  asyncRoute(async (req, res) => {
    res.json({ status: 'ok', uptime: Math.round(process.uptime()) });
  }),
);

/** Readiness — inclui a checagem do PostgreSQL. */
router.get(
  '/health/ready',
  asyncRoute(async (req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: 'ok', database: 'up' });
    } catch {
      res.status(503).json({ status: 'degraded', database: 'down' });
    }
  }),
);

export default router;
