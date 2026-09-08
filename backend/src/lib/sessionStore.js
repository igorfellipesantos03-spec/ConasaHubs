import { env } from '../config/env.js';

/**
 * Retém o access token do Protheus em memória, só pelo tempo entre o login e
 * a conclusão do wizard de onboarding — nunca chega ao navegador.
 *
 * Map simples porque o deploy é um único processo (serviço Windows via NSSM,
 * sem cluster/PM2): não há necessidade de um store compartilhado como Redis.
 * Mesmo padrão do projeto-irmão ConectaRH (ver DOCUMENTACAO_PROTHEUS.md).
 */
const store = new Map();

const DEFAULT_TTL_MS = () => env.ACCESS_TOKEN_TTL_MIN * 60 * 1000;

export function set(userId, token, ttlMs = DEFAULT_TTL_MS()) {
  store.set(userId, { token, expiresAt: Date.now() + ttlMs });
}

export function get(userId) {
  const entry = store.get(userId);
  if (!entry) return null;

  if (entry.expiresAt <= Date.now()) {
    store.delete(userId);
    return null;
  }

  return entry.token;
}

export function del(userId) {
  store.delete(userId);
}
