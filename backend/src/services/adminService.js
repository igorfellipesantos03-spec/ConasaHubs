import { prisma } from '../lib/prisma.js';
import { badRequest, notFound } from '../lib/errors.js';
import { recordAudit } from './auditService.js';
import { revokeAllForUser } from './sessionService.js';

const userView = {
  id: true,
  username: true,
  name: true,
  role: true,
  active: true,
  hubId: true,
  hubOverride: true,
  protheusDeptCode: true,
  protheusDeptName: true,
  lastLoginAt: true,
  hub: { select: { id: true, slug: true, name: true } },
  curatorships: { select: { hubId: true } },
};

export async function listUsers({ search, page = 1, pageSize = 30 } = {}) {
  const where = search
    ? {
        OR: [
          { username: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
        ],
      }
    : {};

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: userView,
    }),
  ]);

  return {
    total,
    page,
    pageSize,
    users: users.map(({ curatorships, ...user }) => ({
      ...user,
      curatorOf: curatorships.map((item) => item.hubId),
    })),
  };
}

/**
 * Atualiza papel, setor e situação de um usuário.
 *
 * Definir o setor manualmente liga o `hubOverride`, para que o próximo login
 * não sobrescreva a decisão do admin com o departamento do Protheus.
 */
export async function updateUser(actor, userId, data, ip) {
  // Rede de segurança contra o clássico "me tirei do admin sem querer".
  if (userId === actor.id) {
    if (data.role === 'USER') throw badRequest('Você não pode remover o próprio acesso de administrador.');
    if (data.active === false) throw badRequest('Você não pode desativar a própria conta.');
  }

  return prisma.$transaction(async (tx) => {
    const before = await tx.user.findUnique({ where: { id: userId }, select: userView });
    if (!before) throw notFound('Usuário não encontrado.');

    if (data.hubId) {
      const hub = await tx.hub.findUnique({ where: { id: data.hubId }, select: { id: true } });
      if (!hub) throw badRequest('Setor inválido.');
    }

    const changes = {
      ...(data.role !== undefined ? { role: data.role } : {}),
      ...(data.active !== undefined ? { active: data.active } : {}),
      ...(data.hubId !== undefined ? { hubId: data.hubId, hubOverride: data.hubId !== null } : {}),
      ...(data.hubOverride !== undefined ? { hubOverride: data.hubOverride } : {}),
    };

    const user = await tx.user.update({
      where: { id: userId },
      data: changes,
      select: userView,
    });

    await recordAudit(tx, {
      actor,
      action: 'UPDATE',
      entity: 'User',
      entityId: user.id,
      entityLabel: user.username,
      before,
      after: user,
      ip,
    });

    return user;
  }).then(async (user) => {
    // Papel, setor ou desativação mudam o que o JWT afirma: encerra as sessões
    // para que o usuário receba um token coerente no próximo acesso.
    await revokeAllForUser(userId);
    return user;
  });
}

export async function listCurators(hubId) {
  const curators = await prisma.hubCurator.findMany({
    where: hubId ? { hubId } : {},
    include: {
      user: { select: { id: true, username: true, name: true } },
      hub: { select: { id: true, slug: true, name: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  return curators.map(({ user, hub, createdAt }) => ({
    userId: user.id,
    username: user.username,
    name: user.name,
    hubId: hub.id,
    hubSlug: hub.slug,
    hubName: hub.name,
    since: createdAt,
  }));
}

export async function addCurator(actor, { userId, hubId }, ip) {
  return prisma.$transaction(async (tx) => {
    const [user, hub] = await Promise.all([
      tx.user.findUnique({ where: { id: userId }, select: { id: true, username: true } }),
      tx.hub.findUnique({ where: { id: hubId }, select: { id: true, name: true } }),
    ]);

    if (!user) throw badRequest('Usuário inválido.');
    if (!hub) throw badRequest('Setor inválido.');

    const curator = await tx.hubCurator.upsert({
      where: { userId_hubId: { userId, hubId } },
      update: {},
      create: { userId, hubId, grantedById: actor.id },
    });

    await recordAudit(tx, {
      actor,
      action: 'CREATE',
      entity: 'HubCurator',
      entityId: `${userId}:${hubId}`,
      entityLabel: `${user.username} → ${hub.name}`,
      after: curator,
      ip,
    });

    return curator;
  }).then(async (curator) => {
    await revokeAllForUser(userId);
    return curator;
  });
}

export async function removeCurator(actor, { userId, hubId }, ip) {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.hubCurator.findUnique({
      where: { userId_hubId: { userId, hubId } },
      include: {
        user: { select: { username: true } },
        hub: { select: { name: true } },
      },
    });
    if (!existing) throw notFound('Curadoria não encontrada.');

    await tx.hubCurator.delete({ where: { userId_hubId: { userId, hubId } } });

    await recordAudit(tx, {
      actor,
      action: 'DELETE',
      entity: 'HubCurator',
      entityId: `${userId}:${hubId}`,
      entityLabel: `${existing.user.username} → ${existing.hub.name}`,
      before: { userId, hubId },
      ip,
    });
  });

  await revokeAllForUser(userId);
}

export function listDeptMappings() {
  return prisma.deptMapping.findMany({
    orderBy: { protheusDeptCode: 'asc' },
    include: { hub: { select: { id: true, slug: true, name: true } } },
  });
}

export async function upsertDeptMapping(actor, data, ip) {
  return prisma.$transaction(async (tx) => {
    const hub = await tx.hub.findUnique({ where: { id: data.hubId }, select: { id: true, name: true } });
    if (!hub) throw badRequest('Setor inválido.');

    const before = await tx.deptMapping.findUnique({
      where: { protheusDeptCode: data.protheusDeptCode },
    });

    const mapping = await tx.deptMapping.upsert({
      where: { protheusDeptCode: data.protheusDeptCode },
      update: { hubId: data.hubId, protheusDeptName: data.protheusDeptName ?? null },
      create: data,
    });

    await recordAudit(tx, {
      actor,
      action: before ? 'UPDATE' : 'CREATE',
      entity: 'DeptMapping',
      entityId: mapping.id,
      entityLabel: `${mapping.protheusDeptCode} → ${hub.name}`,
      before,
      after: mapping,
      ip,
    });

    return mapping;
  });
}

export async function deleteDeptMapping(actor, id, ip) {
  await prisma.$transaction(async (tx) => {
    const before = await tx.deptMapping.findUnique({ where: { id } });
    if (!before) throw notFound('Mapeamento não encontrado.');

    await tx.deptMapping.delete({ where: { id } });

    await recordAudit(tx, {
      actor,
      action: 'DELETE',
      entity: 'DeptMapping',
      entityId: id,
      entityLabel: before.protheusDeptCode,
      before,
      ip,
    });
  });
}
