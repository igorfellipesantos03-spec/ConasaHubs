import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { conflict, notFound, unauthorized } from '../lib/errors.js';
import * as sessionStore from '../lib/sessionStore.js';
import * as protheus from './protheusService.js';
import { recordAudit } from './auditService.js';
import { issueSession, revokeAllForUser } from './sessionService.js';

const COM_VINCULOS = { curatorships: { select: { hubId: true } }, hub: true };

/** Palavras que ficam minúsculas no meio do nome de um setor. */
const CONECTORES = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);

/**
 * Conclui o cadastro: confirma quem é a pessoa no Protheus pelo CPF que ela
 * informou e a coloca no hub do seu departamento — criando esse hub, e
 * tornando-a curadora dele, se ela for a primeira do setor a chegar.
 */
export async function completeOnboarding(actor, { companyId, branchId, cpf }, context = {}) {
  const user = await prisma.user.findUnique({ where: { id: actor.id }, include: COM_VINCULOS });
  if (!user) throw unauthorized();

  if (user.onboardingCompletedAt) {
    throw conflict('Seu cadastro já foi concluído.', { code: 'ONBOARDING_ALREADY_DONE' });
  }

  const protheusToken = sessionStore.get(user.id);
  if (!protheusToken) {
    throw unauthorized('Sua sessão com o Protheus expirou. Entre novamente para continuar.', {
      code: 'PROTHEUS_TOKEN_EXPIRED',
    });
  }

  // Consulta de rede fica fora da transação: a transação do Prisma expira em 5s
  // e o Protheus tem até 15s para responder.
  const encontrados = await protheus.buscarFuncionarioPorCpf(protheusToken, cpf, {
    companyId,
    branchId,
  });

  if (!encontrados?.length) {
    throw notFound(
      'Não encontramos esse CPF como funcionário ativo nessa empresa e filial. Confira os dados.',
      { code: 'EMPLOYEE_NOT_FOUND' },
    );
  }

  if (encontrados.length > 1) {
    logger.warn(
      { username: user.username, total: encontrados.length },
      'CPF retornou mais de um funcionário na SRA; usando o primeiro',
    );
  }

  const dados = protheus.extrairDadosDoFuncionario(encontrados[0]);

  await recusarCpfDeOutraConta(user.id, dados.cpf);

  const resultado = await aplicarComRetentativa({ user, dados, companyId, branchId, ip: context.ip });

  sessionStore.del(user.id);

  // Hub e curadoria acabaram de mudar: derruba as sessões antigas e emite um
  // token novo, coerente com o que o usuário passou a poder fazer.
  await revokeAllForUser(user.id);

  const curatorHubIds = resultado.user.curatorships.map((item) => item.hubId);
  const session = await issueSession(resultado.user, curatorHubIds, context);

  return { user: resultado.user, curatorHubIds, session };
}

/** O CPF identifica o funcionário: dois logins não podem reivindicar o mesmo. */
async function recusarCpfDeOutraConta(userId, cpf) {
  if (!cpf) return;

  const dono = await prisma.user.findUnique({ where: { cpf }, select: { id: true } });
  if (dono && dono.id !== userId) {
    throw conflict('Este CPF já está vinculado a outra conta do CentralHub. Procure a TI.', {
      code: 'CPF_ALREADY_LINKED',
    });
  }
}

/**
 * Se duas pessoas do mesmo departamento novo concluírem o cadastro ao mesmo
 * tempo, uma das transações esbarra no índice único do mapeamento (ou do slug).
 * No Postgres não dá para seguir de dentro de uma transação abortada, então a
 * saída é repetir a transação inteira — na segunda volta o mapeamento da outra
 * pessoa já existe e o caminho vira o de "hub já criado".
 */
async function aplicarComRetentativa(params) {
  try {
    return await prisma.$transaction((tx) => aplicar(tx, params));
  } catch (error) {
    if (ehConflitoDe(error, 'cpf')) {
      throw conflict('Este CPF já está vinculado a outra conta do CentralHub. Procure a TI.', {
        code: 'CPF_ALREADY_LINKED',
      });
    }

    if (!ehConflitoDe(error, 'protheusDeptCode') && !ehConflitoDe(error, 'slug')) throw error;

    logger.info(
      { protheusDeptCode: params.dados.protheusDeptCode },
      'Outro cadastro criou o hub deste departamento primeiro; repetindo',
    );
    return prisma.$transaction((tx) => aplicar(tx, params));
  }
}

async function aplicar(tx, { user, dados, companyId, branchId, ip }) {
  const hubId = await resolverHub(tx, user, dados, ip);

  const atualizado = await tx.user.update({
    where: { id: user.id },
    data: {
      ...dados,
      name: dados.name ?? user.name,
      empresaId: companyId,
      filialId: branchId,
      hubId,
      onboardingCompletedAt: new Date(),
    },
    include: COM_VINCULOS,
  });

  return { user: atualizado };
}

/**
 * Devolve o hub do departamento, criando-o na primeira pessoa do setor.
 *
 * Sem código de departamento não há o que resolver: a pessoa entra sem setor e
 * um admin a encaixa manualmente depois.
 */
async function resolverHub(tx, user, dados, ip) {
  if (!dados.protheusDeptCode) {
    logger.warn(
      { username: user.username },
      'Funcionário sem código de departamento na SRA; cadastro concluído sem setor',
    );
    return null;
  }

  const mapping = await tx.deptMapping.findUnique({
    where: { protheusDeptCode: dados.protheusDeptCode },
    select: { hubId: true },
  });

  if (mapping) return mapping.hubId;

  return criarHubDoSetor(tx, user, dados, ip);
}

async function criarHubDoSetor(tx, user, dados, ip) {
  // O nome vem do centro de custo porque ele é legível ("TECNOLOGIA DA
  // INFORMACAO"); o código do departamento é que dá a identidade única, já que
  // um mesmo setor pode ter mais de um centro de custo.
  const nome =
    tituloDeSetor(dados.costCenterDescription) ||
    tituloDeSetor(protheus.rotuloDoDepartamento(dados.protheusDeptName)) ||
    `Setor ${dados.protheusDeptCode}`;

  const [slug, total] = await Promise.all([
    slugDisponivel(tx, nome, dados.protheusDeptCode),
    tx.hub.count(),
  ]);

  const hub = await tx.hub.create({
    data: {
      slug,
      name: nome,
      costCenterCode: dados.costCenterCode,
      order: total + 1,
    },
  });

  await tx.deptMapping.create({
    data: {
      protheusDeptCode: dados.protheusDeptCode,
      protheusDeptName: dados.protheusDeptName,
      hubId: hub.id,
    },
  });

  // `grantedById` nulo: a curadoria foi concedida pelo próprio sistema, por ter
  // sido esta a primeira pessoa do setor a entrar.
  await tx.hubCurator.create({ data: { userId: user.id, hubId: hub.id } });

  await recordAudit(tx, {
    actor: user,
    action: 'CREATE',
    entity: 'Hub',
    entityId: hub.id,
    entityLabel: hub.name,
    after: hub,
    ip,
  });

  await recordAudit(tx, {
    actor: user,
    action: 'CREATE',
    entity: 'HubCurator',
    entityId: `${user.id}:${hub.id}`,
    entityLabel: `${user.username} → ${hub.name}`,
    after: { userId: user.id, hubId: hub.id, origem: 'onboarding' },
    ip,
  });

  return hub.id;
}

/** Procura um slug livre: o nome, depois o nome + código do setor, depois -2, -3… */
async function slugDisponivel(tx, nome, deptCode) {
  const base = slugificar(nome) || 'setor';
  const candidatos = [base, `${base}-${slugificar(deptCode)}`];

  for (let sufixo = 2; sufixo <= 20; sufixo += 1) candidatos.push(`${base}-${sufixo}`);

  for (const candidato of candidatos) {
    const existe = await tx.hub.findUnique({ where: { slug: candidato }, select: { id: true } });
    if (!existe) return candidato;
  }

  // Improvável a ponto de não valer uma estratégia melhor, mas não pode colidir.
  return `${base}-${Date.now().toString(36)}`.slice(0, 40);
}

function slugificar(texto) {
  return semAcento(String(texto ?? ''))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 36)
    .replace(/-+$/g, '');
}

/** "TECNOLOGIA DA INFORMACAO" → "Tecnologia da Informacao". */
function tituloDeSetor(texto) {
  if (!texto) return null;

  const nome = texto
    .trim()
    .toLocaleLowerCase('pt-BR')
    .split(/\s+/)
    .filter(Boolean)
    .map((palavra, indice) =>
      indice > 0 && CONECTORES.has(palavra)
        ? palavra
        : palavra.charAt(0).toLocaleUpperCase('pt-BR') + palavra.slice(1),
    )
    .join(' ');

  return nome.slice(0, 80) || null;
}

function semAcento(texto) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Identifica em qual índice único a escrita esbarrou. */
function ehConflitoDe(error, campo) {
  if (error?.code !== 'P2002') return false;

  const alvo = error?.meta?.target;
  const alvos = Array.isArray(alvo) ? alvo : [alvo];
  return alvos.some((item) => String(item ?? '').includes(campo));
}
