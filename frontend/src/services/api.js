import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 20000,
});

/** Extrai a mensagem que a API mandou, com uma frase de reserva utilizável. */
export function errorMessage(error, fallback = 'Não foi possível concluir a ação.') {
  return error?.response?.data?.message ?? fallback;
}

const ROTAS_SEM_RENOVACAO = ['/auth/login', '/auth/refresh', '/auth/logout'];

let renovacaoEmCurso = null;
let aoPerderSessao = () => {};

/** O AuthContext registra aqui o que fazer quando a sessão acabar de vez. */
export function onSessionLost(handler) {
  aoPerderSessao = handler;
}

/**
 * Renovação silenciosa: no primeiro 401, tenta trocar o refresh token por um
 * novo par e repete a requisição uma única vez. Chamadas concorrentes esperam
 * a mesma renovação, para não dispararem várias rotações em paralelo.
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const ehRotaDeSessao = ROTAS_SEM_RENOVACAO.some((rota) => original?.url?.includes(rota));

    if (error.response?.status !== 401 || original?._jaTentou || ehRotaDeSessao) {
      return Promise.reject(error);
    }

    original._jaTentou = true;

    try {
      renovacaoEmCurso ??= api.post('/auth/refresh').finally(() => {
        renovacaoEmCurso = null;
      });
      await renovacaoEmCurso;
      return api(original);
    } catch (falhaNaRenovacao) {
      aoPerderSessao();
      return Promise.reject(falhaNaRenovacao);
    }
  },
);
