import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api, onSessionLost, errorMessage } from '../services/api';

/**
 * O interceptor é testado no adaptador do axios: cada resposta é decidida pela
 * URL da requisição, o que permite simular o 401 → refresh → repetição.
 */
function instalarAdaptador(rotas) {
  const chamadas = [];
  api.defaults.adapter = async (config) => {
    chamadas.push(config.url);
    const resposta = rotas[config.url];
    if (typeof resposta === 'function') return resposta(config);
    return { status: 200, data: resposta ?? {}, config, headers: {} };
  };
  return chamadas;
}

const falha = (status) => (config) =>
  Promise.reject(
    Object.assign(new Error(`HTTP ${status}`), { config, response: { status, data: {} } }),
  );

beforeEach(() => {
  onSessionLost(() => {});
});

describe('interceptor de sessão', () => {
  it('renova a sessão e repete a requisição depois de um 401', async () => {
    let tentativas = 0;
    const chamadas = instalarAdaptador({
      '/hubs': (config) => {
        tentativas += 1;
        if (tentativas === 1) return falha(401)(config);
        return { status: 200, data: { hubs: [] }, config, headers: {} };
      },
      '/auth/refresh': { user: {} },
    });

    const resposta = await api.get('/hubs');

    expect(resposta.data).toEqual({ hubs: [] });
    expect(chamadas).toEqual(['/hubs', '/auth/refresh', '/hubs']);
  });

  it('não tenta renovar mais de uma vez para a mesma requisição', async () => {
    const chamadas = instalarAdaptador({
      '/hubs': falha(401),
      '/auth/refresh': { user: {} },
    });

    await expect(api.get('/hubs')).rejects.toBeTruthy();

    expect(chamadas.filter((url) => url === '/auth/refresh')).toHaveLength(1);
  });

  it('avisa que a sessão acabou quando a renovação falha', async () => {
    const aoPerder = vi.fn();
    onSessionLost(aoPerder);
    instalarAdaptador({ '/hubs': falha(401), '/auth/refresh': falha(401) });

    await expect(api.get('/hubs')).rejects.toBeTruthy();

    expect(aoPerder).toHaveBeenCalledOnce();
  });

  it('não tenta renovar quando o próprio login falha', async () => {
    const chamadas = instalarAdaptador({ '/auth/login': falha(401) });

    await expect(api.post('/auth/login', {})).rejects.toBeTruthy();

    expect(chamadas).toEqual(['/auth/login']);
  });

  it('deixa passar erros que não são 401', async () => {
    const chamadas = instalarAdaptador({ '/hubs': falha(500) });

    await expect(api.get('/hubs')).rejects.toBeTruthy();

    expect(chamadas).toEqual(['/hubs']);
  });

  it('compartilha uma única renovação entre requisições simultâneas', async () => {
    let falharam = 0;
    const chamadas = instalarAdaptador({
      '/hubs': (config) => {
        falharam += 1;
        return falharam <= 2
          ? falha(401)(config)
          : { status: 200, data: {}, config, headers: {} };
      },
      '/favorites': (config) => ({ status: 200, data: {}, config, headers: {} }),
      '/auth/refresh': { user: {} },
    });

    await Promise.all([api.get('/hubs'), api.get('/hubs')]);

    expect(chamadas.filter((url) => url === '/auth/refresh')).toHaveLength(1);
  });
});

describe('errorMessage', () => {
  it('usa a mensagem que a API mandou', () => {
    expect(errorMessage({ response: { data: { message: 'Setor não encontrado.' } } })).toBe(
      'Setor não encontrado.',
    );
  });

  it('cai na frase de reserva quando não há mensagem', () => {
    expect(errorMessage(new Error('rede'), 'Tente de novo.')).toBe('Tente de novo.');
  });
});
