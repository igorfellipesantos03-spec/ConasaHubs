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
  'roleCode',
  'roleDescription',
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
 * @param {{pageSize?: number, companyId?: string, branchId?: string}} [options]
 *   `companyId`/`branchId` default para a empresa/filial fixas do `.env`, mas o
 *   onboarding passa a empresa/filial que a pessoa escolheu no wizard.
 */
export async function consultarFuncionarios(
  accessToken,
  filter,
  {
    pageSize = 20,
    companyId = env.PROTHEUS_DEFAULT_COMPANY,
    branchId = env.PROTHEUS_DEFAULT_BRANCH,
  } = {},
) {
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
 * Localiza o funcionário pelo CPF, dentro da empresa/filial informadas.
 *
 * O CPF vem do próprio usuário (wizard de onboarding) ou do cadastro já
 * confirmado antes — nunca de um palpite sobre o `username`, como era feito
 * antes. `RA_DEMISSA = ''` descarta quem já foi desligado.
 *
 * @param {string} cpf apenas dígitos
 */
export function buscarFuncionarioPorCpf(accessToken, cpf, { companyId, branchId } = {}) {
  const somenteDigitos = String(cpf).replace(/\D/g, '');

  return consultarFuncionarios(
    accessToken,
    `RA_CIC LIKE '${somenteDigitos}%' AND RA_DEMISSA = ''`,
    { pageSize: 5, companyId, branchId },
  );
}

/**
 * Traduz o registro cru da SRA para os campos do nosso `User`. Concentra aqui o
 * conhecimento sobre os nomes de campo do Protheus, que não são óbvios
 * (`departamentCode` sem o "n", `RA_CIC` como alternativa a `cpf`).
 */
export function extrairDadosDoFuncionario(employee) {
  const texto = (valor) => (typeof valor === 'string' ? valor.trim() : '') || null;

  return {
    name: texto(employee.name),
    cpf: String(employee.cpf ?? employee.RA_CIC ?? '').replace(/\D/g, '') || null,
    protheusDeptCode: texto(employee.departamentCode),
    protheusDeptName: texto(employee.departmentDescription),
    roleCode: texto(employee.roleCode),
    roleDescription: texto(employee.roleDescription),
    costCenterCode: texto(employee.costCenterCode),
    costCenterDescription: texto(employee.costCenterDescription),
  };
}

/**
 * "TI - DIORGNY" → "TI". O que vem depois do hífen identifica o gestor da
 * equipe, não o setor.
 */
export function rotuloDoDepartamento(nome) {
  if (!nome) return null;
  return nome.split(' - ')[0].trim() || null;
}

/** A API do Protheus varia o envelope da resposta conforme a versão. */
function normalizarLista(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.employees)) return data.employees;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}
