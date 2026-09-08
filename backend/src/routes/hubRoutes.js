import { Router } from 'express';
import { asyncRoute } from '../lib/asyncRoute.js';
import {
  requireAdmin,
  requireAuth,
  requireHubCurator,
  requireHubMember,
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

// Seções são organização do dia a dia: qualquer pessoa do setor cria; mexer no
// que é dos outros é que exige curadoria (conferido no service).
router.post('/:hubId/categories', requireHubMember, asyncRoute(hubController.createCategory));
router.patch(
  '/:hubId/categories/:categoryId',
  requireHubMember,
  asyncRoute(hubController.updateCategory),
);
router.delete(
  '/:hubId/categories/:categoryId',
  requireHubMember,
  asyncRoute(hubController.deleteCategory),
);

export default router;
