import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';

import { env, isTest } from './config/env.js';
import { logger } from './lib/logger.js';
import { originGuard, verificarOrigemPermitida } from './middlewares/originGuard.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';

import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';
import onboardingRoutes from './routes/onboardingRoutes.js';
import hubRoutes from './routes/hubRoutes.js';
import linkRoutes from './routes/linkRoutes.js';
import folderRoutes from './routes/folderRoutes.js';
import favoriteRoutes from './routes/favoriteRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

export function createApp() {
  const app = express();

  // Atrás do IIS/ARR: confia no primeiro proxy para obter o IP real do cliente,
  // que alimenta o rate limit e o log de auditoria.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
  app.use(
    cors({
      origin: (origem, callback) => {
        if (!origem || verificarOrigemPermitida(origem)) {
          return callback(null, true);
        }
        return callback(null, false);
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  if (!isTest) app.use(pinoHttp({ logger }));

  app.use('/api', healthRoutes);

  app.use('/api', originGuard);
  app.use('/api/auth', authRoutes);
  app.use('/api/onboarding', onboardingRoutes);
  app.use('/api/hubs', hubRoutes);
  app.use('/api/hubs', linkRoutes);
  app.use('/api/folders', folderRoutes);
  app.use('/api/favorites', favoriteRoutes);
  app.use('/api/admin', adminRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
