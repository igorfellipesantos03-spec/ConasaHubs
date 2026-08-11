import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { unauthorized } from './errors.js';

const ISSUER = 'centralhub';

/**
 * O access token carrega só o necessário para autorizar sem ir ao banco:
 * identidade, papel global, hub do usuário e os hubs em que ele é curador.
 */
export function signAccessToken(payload) {
  return jwt.sign(payload, env.JWT_SECRET, {
    issuer: ISSUER,
    expiresIn: `${env.ACCESS_TOKEN_TTL_MIN}m`,
  });
}

export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, env.JWT_SECRET, { issuer: ISSUER });
  } catch (error) {
    throw unauthorized('Sessão expirada. Faça login novamente.', {
      code: 'INVALID_TOKEN',
      cause: error,
    });
  }
}
