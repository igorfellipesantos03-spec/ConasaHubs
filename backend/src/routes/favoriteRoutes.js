import { Router } from 'express';
import { z } from 'zod';
import { asyncRoute } from '../lib/asyncRoute.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import * as favoriteService from '../services/favoriteService.js';

const router = Router();
const linkIdSchema = z.object({ linkId: z.string().uuid() });

router.use(requireAuth);

router.get(
  '/',
  asyncRoute(async (req, res) => {
    res.json({ favorites: await favoriteService.listFavorites(req.user) });
  }),
);

router.post(
  '/',
  asyncRoute(async (req, res) => {
    const { linkId } = linkIdSchema.parse(req.body);
    await favoriteService.addFavorite(req.user, linkId);
    res.status(204).end();
  }),
);

router.delete(
  '/:linkId',
  asyncRoute(async (req, res) => {
    const { linkId } = linkIdSchema.parse(req.params);
    await favoriteService.removeFavorite(req.user, linkId);
    res.status(204).end();
  }),
);

export default router;
