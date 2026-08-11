import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { forbidden } from '../lib/errors.js';
import * as protheus from './protheusService.js';
import { issueSession } from './sessionService.js';

/**
 * Login: autentica no Protheus, provisiona o usuário localmente e abre a sessão
 * do CentralHub.
 *
 * O token do Protheus é usado apenas para ler os dados cadastrais e descartado
 * em seguida — o CentralHub não faz nenhuma outra chamada ao ERP.
 */
export async function login({ username, password, context = {} }) {
  const normalizedUsername = username.trim().toLowerCase();

  const { accessToken: protheusToken } = await protheus.autenticar(username.trim(), password);

  const employee = await protheus.buscarFuncionarioDoUsuario(protheusToken, normalizedUsername);

  if (!employee) {
    logger.warn(
      { username: normalizedUsername },
      'Funcionário não localizado na SRA; usuário entra sem setor definido',
    );
  }

  const user = await provisionUser(normalizedUsername, employee);

  if (!user.active) {
    throw forbidden('Seu acesso ao CentralHub está desativado. Procure a TI.');
  }

  const curatorHubIds = user.curatorships.map((item) => item.hubId);
  const session = await issueSession(user, curatorHubIds, context);

  return { user, curatorHubIds, session };
}

/**
 * Cria ou atualiza o usuário local a partir do cadastro do Protheus (JIT).
 *
 * O setor é resolvido pelo mapeamento departamento → hub, exceto quando o admin
 * fixou o hub manualmente (`hubOverride`), caso em que a escolha dele prevalece.
 */
async function provisionUser(username, employee) {
  const deptCode = employee?.departamentCode?.trim() || null;
  const deptName = employee?.departmentDescription?.trim() || null;
  const cpf = (employee?.cpf ?? employee?.RA_CIC ?? '').replace(/\D/g, '') || null;
  const name = employee?.name?.trim() || username;

  const existing = await prisma.user.findUnique({ where: { username } });
  const resolvedHubId = existing?.hubOverride
    ? existing.hubId
    : await resolveHubId(deptCode);

  const shouldBeAdmin = env.ADMIN_USERNAMES.includes(username);

  const data = {
    name,
    cpf,
    protheusDeptCode: deptCode,
    protheusDeptName: deptName,
    empresaId: employee?.companyKey?.trim() || env.PROTHEUS_DEFAULT_COMPANY,
    filialId: employee?.branch?.trim() || env.PROTHEUS_DEFAULT_BRANCH,
    hubId: resolvedHubId,
    lastLoginAt: new Date(),
  };

  return prisma.user.upsert({
    where: { username },
    update: data,
    create: {
      username,
      ...data,
      role: shouldBeAdmin ? 'ADMIN' : 'USER',
    },
    include: { curatorships: { select: { hubId: true } }, hub: true },
  });
}

async function resolveHubId(deptCode) {
  if (!deptCode) return null;
  const mapping = await prisma.deptMapping.findUnique({
    where: { protheusDeptCode: deptCode },
    select: { hubId: true },
  });
  return mapping?.hubId ?? null;
}

/** Formato do usuário devolvido ao frontend — sem nada sensível. */
export function toPublicUser(user, curatorHubIds = []) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    hubId: user.hubId ?? null,
    hubSlug: user.hub?.slug ?? null,
    hubName: user.hub?.name ?? null,
    department: user.protheusDeptName ?? null,
    curatorOf: curatorHubIds,
  };
}
