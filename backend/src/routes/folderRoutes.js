import { Router } from 'express';
import { asyncRoute } from '../lib/asyncRoute.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { listActiveFolders } from '../services/folderService.js';

const router = Router();

/**
 * A leitura das pastas é de todo mundo que está logado: são elas que orbitam a
 * marca na tela inicial e que o formulário de link oferece na hora de arquivar.
 * Criar, editar e reordenar fica em `/api/admin`.
 */
router.get(
  '/',
  requireAuth,
  asyncRoute(async (_req, res) => {
    res.json({ folders: await listActiveFolders() });
  }),
);

export default router;
