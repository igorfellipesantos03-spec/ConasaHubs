import { Router } from 'express';
import { asyncRoute } from '../lib/asyncRoute.js';
import { requireAuth, requireHubCurator, requireHubMember } from '../middlewares/authMiddleware.js';
import * as linkController from '../controllers/linkController.js';

const router = Router();

router.use(requireAuth);

// Quem é do setor adiciona link à vontade; editar e excluir o que é dos outros
// exige curadoria, e isso o service confere pelo autor do registro.
router.post('/:hubId/links', requireHubMember, asyncRoute(linkController.create));
// `reorder` precisa vir antes de `/:linkId` para não ser capturada como um id.
// Reordenar mexe no mural inteiro, inclusive nos links dos outros: só curador.
router.patch('/:hubId/links/reorder', requireHubCurator, asyncRoute(linkController.reorder));
router.patch('/:hubId/links/:linkId', requireHubMember, asyncRoute(linkController.update));
router.delete('/:hubId/links/:linkId', requireHubMember, asyncRoute(linkController.remove));

export default router;
