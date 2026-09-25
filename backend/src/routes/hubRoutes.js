import { Router } from 'express';
import { asyncRoute } from '../lib/asyncRoute.js';
import {
  requireAdmin,
  requireAuth,
  requireHubCurator,
} from '../middlewares/authMiddleware.js';
import * as hubController from '../controllers/hubController.js';

const router = Router();

router.use(requireAuth);

router.get('/', asyncRoute(hubController.list));
router.get('/:slug', asyncRoute(hubController.detail));

// Abrir e fechar setores continua sendo decisão de administração — a criação
// automática de setor acontece no onboarding, não por esta rota.
router.post('/', requireAdmin, asyncRoute(hubController.create));
router.delete('/:hubId', requireAdmin, asyncRoute(hubController.deactivate));

// O curador responde pelo próprio setor: pode reapresentá-lo (nome, descrição,
// ícone, cor). Identidade e ordenação seguem com o admin, via o mesmo endpoint.
router.patch('/:hubId', requireHubCurator, asyncRoute(hubController.update));

export default router;
