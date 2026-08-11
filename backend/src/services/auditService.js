import { prisma } from '../lib/prisma.js';

/**
 * Registra uma mutação na trilha de auditoria.
 *
 * Recebe o client do Prisma (`tx`) para participar da mesma transação da
 * operação auditada: ou grava os dois, ou nenhum dos dois.
 */
export function recordAudit(tx, { actor, action, entity, entityId, entityLabel, before, after, ip }) {
  return tx.auditLog.create({
    data: {
      userId: actor?.id ?? null,
      actorName: actor?.name ?? actor?.username ?? 'sistema',
      action,
      entity,
      entityId,
      entityLabel: entityLabel ?? null,
      before: before ?? undefined,
      after: after ?? undefined,
      ip: ip ?? null,
    },
  });
}

export async function listAudit({ page = 1, pageSize = 50, entity } = {}) {
  const where = entity ? { entity } : {};

  const [total, items] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { total, page, pageSize, items };
}
