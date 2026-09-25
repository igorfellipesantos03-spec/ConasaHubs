import { env } from '../config/env.js';
import { forbidden } from '../lib/errors.js';

const METODOS_SEGUROS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Valida se a origem da requisição é permitida.
 * Em produção: exige correspondência exata com FRONTEND_ORIGIN.
 * Fora de produção: aceita FRONTEND_ORIGIN ou qualquer porta em localhost / 127.0.0.1.
 */
export function verificarOrigemPermitida(origem) {
  if (!origem) return false;
  if (origem === env.FRONTEND_ORIGIN) return true;

  if (env.NODE_ENV !== 'production') {
    try {
      const url = new URL(origem);
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        return true;
      }
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Defesa CSRF em camada dupla com o `sameSite` dos cookies: toda requisição que
 * muda estado precisa declarar uma origem, e ela precisa ser a do frontend.
 * Requisições sem Origin nem Referer só passam fora de produção (curl, testes).
 */
export function originGuard(requisicao, resposta, proximo) {
  if (METODOS_SEGUROS.has(requisicao.method)) return proximo();

  const origem = requisicao.get('origin') ?? extrairOrigemDoReferer(requisicao.get('referer'));

  if (!origem) {
    if (env.NODE_ENV === 'production') {
      return proximo(forbidden('Origem da requisição não identificada.'));
    }
    return proximo();
  }

  if (!verificarOrigemPermitida(origem)) {
    return proximo(forbidden('Origem da requisição não autorizada.'));
  }

  return proximo();
}

function extrairOrigemDoReferer(referer) {
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}
