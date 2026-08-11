import { env } from '../config/env.js';
import { forbidden } from '../lib/errors.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Defesa CSRF em camada dupla com o `sameSite` dos cookies: toda requisição que
 * muda estado precisa declarar uma origem, e ela precisa ser a do frontend.
 * Requisições sem Origin nem Referer só passam fora de produção (curl, testes).
 */
export function originGuard(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = req.get('origin') ?? originFromReferer(req.get('referer'));

  if (!origin) {
    if (env.NODE_ENV === 'production') {
      return next(forbidden('Origem da requisição não identificada.'));
    }
    return next();
  }

  if (origin !== env.FRONTEND_ORIGIN) {
    return next(forbidden('Origem da requisição não autorizada.'));
  }

  return next();
}

function originFromReferer(referer) {
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}
