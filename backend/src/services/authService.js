import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { forbidden } from '../lib/errors.js';
import * as sessionStore from '../lib/sessionStore.js';
import * as protheus from './protheusService.js';
import { issueSession } from './sessionService.js';

const COM_VINCULOS = { curatorships: { select: { hubId: true } }, hub: true };

/**
 * Login: autentica no Protheus, provisiona o usuário localmente e abre a sessão
 * do CentralHub.
 *
 * Quem ainda não passou pelo wizard de onboarding entra sem setor — quem é a
 * pessoa no Protheus se descobre lá, com o CPF que ela mesma informa, e não por
 * um palpite em cima do `username`.
 */
export async function login({ username, password, context = {} }) {
  const normalizedUsername = username.trim().toLowerCase();

  const { accessToken: protheusToken } = await protheus.autenticar(username.trim(), password);

  let user = await provisionUser(normalizedUsername);

  if (!user.active) {
    throw forbidden('Seu acesso ao CentralHub está desativado. Procure a TI.');
  }

  if (user.onboardingCompletedAt) {
    user = await atualizarCadastro(user, protheusToken);
  } else {
    // O onboarding vai precisar deste token para consultar a SRA. Ele fica no
    // backend, com prazo curto, e some assim que o wizard termina.
    sessionStore.set(user.id, protheusToken);
  }

  const curatorHubIds = user.curatorships.map((item) => item.hubId);
  const session = await issueSession(user, curatorHubIds, context);

  return { user, curatorHubIds, session };
}

/**
 * Cria ou atualiza o usuário local (JIT). No primeiro login só existe o que o
 * OAuth2 garante: o `username`. Nome, setor e cargo chegam no onboarding.
 */
function provisionUser(username) {
  return prisma.user.upsert({
    where: { username },
    update: { lastLoginAt: new Date() },
    create: {
      username,
      name: username,
      lastLoginAt: new Date(),
      role: env.ADMIN_USERNAMES.includes(username) ? 'ADMIN' : 'USER',
    },
    include: COM_VINCULOS,
  });
}

/**
 * Reconsulta a SRA com o CPF e a empresa/filial já confirmados no onboarding e
 * atualiza nome, departamento, cargo e centro de custo.
 *
 * O hub não é tocado: mudar alguém de setor depois do onboarding é decisão de
 * administração (tela /admin), não efeito colateral de um login. Falhar aqui
 * também não derruba o login — o cadastro anterior continua valendo.
 */
async function atualizarCadastro(user, protheusToken) {
  if (!user.cpf) return user;

  const encontrados = await protheus.buscarFuncionarioPorCpf(protheusToken, user.cpf, {
    companyId: user.empresaId ?? undefined,
    branchId: user.filialId ?? undefined,
  });

  const employee = encontrados?.[0];
  if (!employee) {
    logger.warn(
      { username: user.username },
      'Funcionário não localizado na SRA neste login; cadastro anterior mantido',
    );
    return user;
  }

  // O CPF fica de fora: ele é a chave da consulta e foi confirmado no
  // onboarding — reescrevê-lo só arriscaria colidir com o índice único.
  const { cpf, ...dados } = protheus.extrairDadosDoFuncionario(employee);
  const mudancas = Object.fromEntries(
    Object.entries(dados).filter(([, valor]) => valor !== null),
  );

  if (Object.keys(mudancas).length === 0) return user;

  return prisma.user.update({
    where: { id: user.id },
    data: mudancas,
    include: COM_VINCULOS,
  });
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
    department: protheus.rotuloDoDepartamento(user.protheusDeptName),
    cargo: user.roleDescription ?? null,
    onboardingCompleted: Boolean(user.onboardingCompletedAt),
    curatorOf: curatorHubIds,
  };
}
