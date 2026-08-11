import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncRoute } from '../lib/asyncRoute.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { isTest } from '../config/env.js';
import * as authController from '../controllers/authController.js';

const router = Router();

// Freio contra força bruta: conta tentativas por IP e por usuário, para que um
// atacante distribuído não escape só trocando de origem.
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => isTest,
  keyGenerator: (req) => `${req.ip}|${String(req.body?.username ?? '').toLowerCase()}`,
  message: { message: 'Muitas tentativas de login. Aguarde alguns minutos.' },
});

router.post('/login', loginLimiter, asyncRoute(authController.login));
router.post('/refresh', asyncRoute(authController.refresh));
router.post('/logout', asyncRoute(authController.logout));
router.get('/me', requireAuth, asyncRoute(authController.me));

export default router;
