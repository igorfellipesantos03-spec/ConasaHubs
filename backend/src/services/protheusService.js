import axios from 'axios';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { badGateway, unauthorized } from '../lib/errors.js';

const CREDENCIAIS_INVALIDAS = 'Usuário ou senha incorretos.';
const PROTHEUS_INDISPONIVEL =
  'O Protheus está indisponível no momento. Tente novamente em alguns instantes.';

const EMPLOYEE_FIELDS = [
  'companyKey',
  'branch',
  'code',
  'name',
  'id',
  'cpf',
  'RA_CIC',
  'departamentCode',
  'departmentDescription',
  'costCenterCode',
  'costCenterDescription',
  'demissionDate',
].join(',');

const http = axios.create({
  baseURL: env.PROTHEUS_BASE_URL,
  timeout: env.PROTHEUS_TIMEOUT_MS,
});

/**
 * Autentica no Protheus via OAuth2 (grant_type=password).
 *
 * @returns {Promise<{accessToken: string, expiresIn: number}>}
 * @throws {AppError} 401 para credencial inválida, 502 para indisponibilidade.
 */
export async function autenticar(username, password) {
  try {
    const body = new URLSearchParams({ username, password });

    const { data } = await http.post('/rest/api/oauth2/v1/token?grant_type=password', body, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (!data?.access_token) {
      logger.error('Protheus respondeu 200 sem access_token');
      throw badGateway(PROTHEUS_INDISPONIVEL);
    }

    return { accessToken: data.access_token, expiresIn: data.expires_in ?? null };
  } catch (error) {
    if (error.status) throw error; // já é AppError

    const status = error.response?.status;
    if (status === 401 || status === 403) {
      throw unauthorized(CREDENCIAIS_INVALIDAS, { code: 'INVALID_CREDENTIALS' });
    }

    logger.error(
      { status, code: error.code },
      'Falha ao obter token no Protheus',
    );
    throw badGateway(PROTHEUS_INDISPONIVEL, { code: 'PROTHEUS_UNAVAILABLE', cause: error });
  }
}

/**
 * Consulta a tabela SRA (`employeedatacontent`).
 *
 * @param {string} accessToken token do próprio usuário
 * @param {string} filter expressão AdvPL/SQL, ex.: `RA_CIC = '12345678900'`
 */
export async function consultarFuncionarios(accessToken, filter, { pageSize = 20 } = {}) {
  const companyId = env.PROTHEUS_DEFAULT_COMPANY;
  const branchId = env.PROTHEUS_DEFAULT_BRANCH;

  try {
    const { data } = await http.get('/rest/rh/v1/employeedatacontent/', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        tenantId: `${companyId},${branchId}`,
      },
      params: {
        product: 'PROTHEUS',
        companyId,
        branchId,
        fields: EMPLOYEE_FIELDS,
        filter,
        pageSize,
      },
    });

    return normalizarLista(data);
  } catch (error) {
    // Uma falha aqui não pode derrubar o login: o chamador decide o fallback.
    logger.warn(
      { status: error.response?.status, code: error.code },
      'Consulta de funcionário no Protheus falhou',
    );
    return null;
  }
}

/**
 * Tenta localizar o registro do usuário logado na SRA.
 *
 * O Protheus não expõe uma rota "quem sou eu", e o `username` do OAuth2 não é
 * necessariamente igual à chave do funcionário. Tentamos as estratégias abaixo
 * em ordem; se nenhuma funcionar, devolvemos `null` e o login segue sem o
 * departamento — o admin atribui o setor manualmente na tela de administração.
 *
 * IMPORTANTE: confirmar com a equipe do Protheus qual campo casa com o login e
 * simplificar esta função para a estratégia correta.
 */
export async function buscarFuncionarioDoUsuario(accessToken, username) {
  const somenteDigitos = username.replace(/\D/g, '');

  // 1. O login é o próprio CPF.
  if (somenteDigitos.length === 11) {
    const porCpf = await consultarFuncionarios(
      accessToken,
      `RA_CIC = '${somenteDigitos}'`,
      { pageSize: 1 },
    );
    if (porCpf?.length) return porCpf[0];
  }

  // 2. O login segue o padrão `nome.sobrenome`.
  const partes = username
    .split(/[._-]+/)
    .map((parte) => parte.trim())
    .filter(Boolean);

  if (partes.length > 0) {
    const primeiroNome = sanitizarParaFiltro(partes[0]).toUpperCase();
    if (primeiroNome.length >= 3) {
      const candidatos = await consultarFuncionarios(
        accessToken,
        `UPPER(RA_NOME) LIKE '${primeiroNome}%'`,
        { pageSize: 50 },
      );
      const escolhido = escolherCandidato(candidatos, partes);
      if (escolhido) return escolhido;
    }
  }

  return null;
}

/** Impede que o valor quebre ou injete conteúdo na expressão de filtro. */
function sanitizarParaFiltro(valor) {
  return valor.normalize('NFD').replace(/[^a-zA-Z0-9]/g, '');
}

/** Entre os homônimos, aceita apenas quem casa com todas as partes do login. */
function escolherCandidato(candidatos, partes) {
  if (!candidatos?.length) return null;
  if (candidatos.length === 1) return candidatos[0];

  const termos = partes.map((parte) => normalizar(parte)).filter((parte) => parte.length >= 3);

  const exatos = candidatos.filter((funcionario) => {
    const nome = normalizar(funcionario.name ?? '');
    return termos.every((termo) => nome.includes(termo));
  });

  return exatos.length === 1 ? exatos[0] : null;
}

function normalizar(valor) {
  return valor
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/** A API do Protheus varia o envelope da resposta conforme a versão. */
function normalizarLista(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.employees)) return data.employees;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}
