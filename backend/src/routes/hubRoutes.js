import { Router } from 'express';
import { asyncRoute } from '../lib/asyncRoute.js';
import { requireAdmin, requireAuth, requireHubCurator } from '../middlewares/authMiddleware.js';
import * as hubController from '../controllers/hubController.js';

const router = Router();

router.use(requireAuth);

router.get('/', asyncRoute(hubController.list));
router.get('/:slug', asyncRoute(hubController.detail));

// Criar, renomear e desativar setores é decisão de administração.
router.post('/', requireAdmin, asyncRoute(hubController.create));
router.patch('/:hubId', requireAdmin, asyncRoute(hubController.update));
router.delete('/:hubId', requireAdmin, asyncRoute(hubController.deactivate));

// Já as seções internas são organização do dia a dia do curador.
router.post('/:hubId/categories', requireHubCurator, asyncRoute(hubController.createCategory));
router.patch(
  '/:hubId/categories/:categoryId',
  requireHubCurator,
  asyncRoute(hubController.updateCategory),
);
router.delete(
  '/:hubId/categories/:categoryId',
  requireHubCurator,
  asyncRoute(hubController.deleteCategory),
);

export default router;
