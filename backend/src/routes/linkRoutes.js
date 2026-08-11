import { Router } from 'express';
import { asyncRoute } from '../lib/asyncRoute.js';
import { requireAuth, requireHubCurator } from '../middlewares/authMiddleware.js';
import * as linkController from '../controllers/linkController.js';

const router = Router();

router.use(requireAuth);

router.post('/:hubId/links', requireHubCurator, asyncRoute(linkController.create));
// `reorder` precisa vir antes de `/:linkId` para não ser capturada como um id.
router.patch('/:hubId/links/reorder', requireHubCurator, asyncRoute(linkController.reorder));
router.patch('/:hubId/links/:linkId', requireHubCurator, asyncRoute(linkController.update));
router.delete('/:hubId/links/:linkId', requireHubCurator, asyncRoute(linkController.remove));

export default router;
