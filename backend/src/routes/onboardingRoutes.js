import { Router } from 'express';
import { asyncRoute } from '../lib/asyncRoute.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import * as onboardingController from '../controllers/onboardingController.js';

const router = Router();

router.use(requireAuth);

router.post('/complete', asyncRoute(onboardingController.complete));

export default router;
