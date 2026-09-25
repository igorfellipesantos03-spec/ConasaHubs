import { prisma } from '../lib/prisma.js';
import { badRequest, notFound } from '../lib/errors.js';
import { recordAudit } from './auditService.js';
import { assertPodeAlterar } from './hubService.js';

/**
 * Garante que a pasta existe e está no ar.
 *
 * A pasta é da empresa, não do setor — qualquer setor arquiva em qualquer uma
 * delas —, então aqui não há dono a conferir: basta ela existir e não ter sido
 * desligada pela administração enquanto o formulário estava aberto.
 */
async function assertFolderIsUsable(tx, folderId) {
  if (!folderId) return;
  const folder = await tx.folder.findFirst({
    where: { id: folderId, active: true },
    select: { id: true },
  });
  if (!folder) throw badRequest('Pasta inválida ou fora do ar.');
}

export async function createLink(actor, hub, data, ip) {
  return prisma.$transaction(async (tx) => {
    await assertFolderIsUsable(tx, data.folderId);

    const order = await nextOrder(tx, hub.id, data.folderId ?? null);

    const link = await tx.link.create({
      data: {
        ...data,
        description: data.description || null,
        folderId: data.folderId ?? null,
        order,
        hubId: hub.id,
        createdById: actor.id,
      },
    });

    await recordAudit(tx, {
      actor,
      action: 'CREATE',
      entity: 'Link',
      entityId: link.id,
      entityLabel: `${hub.name} › ${link.title}`,
      after: link,
      ip,
    });

    return link;
  });
}

export async function updateLink(actor, hub, linkId, data, ip) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.link.findFirst({ where: { id: linkId, hubId: hub.id } });
    if (!before) throw notFound('Link não encontrado.');

    await assertPodeAlterar(tx, actor, hub.id, before, 'este link');

    if (data.folderId !== undefined) {
      await assertFolderIsUsable(tx, data.folderId);
    }

    const link = await tx.link.update({
      where: { id: linkId },
      data: {
        ...data,
        ...(data.description !== undefined ? { description: data.description || null } : {}),
      },
    });

    await recordAudit(tx, {
      actor,
      action: 'UPDATE',
      entity: 'Link',
      entityId: link.id,
      entityLabel: `${hub.name} › ${link.title}`,
      before,
      after: link,
      ip,
    });

    return link;
  });
}

export async function deleteLink(actor, hub, linkId, ip) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.link.findFirst({ where: { id: linkId, hubId: hub.id } });
    if (!before) throw notFound('Link não encontrado.');

    await assertPodeAlterar(tx, actor, hub.id, before, 'este link');

    await tx.link.delete({ where: { id: linkId } });

    await recordAudit(tx, {
      actor,
      action: 'DELETE',
      entity: 'Link',
      entityId: linkId,
      entityLabel: `${hub.name} › ${before.title}`,
      before,
      ip,
    });
  });
}

/**
 * Aplica a nova ordem (e a eventual troca de pasta) de uma vez só, para que o
 * arrastar-e-soltar do frontend gere um único request.
 */
export async function reorderLinks(actor, hub, items, ip) {
  return prisma.$transaction(async (tx) => {
    const ids = items.map((item) => item.id);
    const existing = await tx.link.findMany({
      where: { id: { in: ids }, hubId: hub.id },
      select: { id: true, folderId: true, order: true },
    });

    if (existing.length !== ids.length) {
      throw badRequest('Um ou mais links não pertencem a este setor.');
    }

    for (const item of items) {
      if (item.folderId !== undefined) {
        await assertFolderIsUsable(tx, item.folderId);
      }
      await tx.link.update({
        where: { id: item.id },
        data: {
          order: item.order,
          ...(item.folderId !== undefined ? { folderId: item.folderId } : {}),
        },
      });
    }

    await recordAudit(tx, {
      actor,
      action: 'UPDATE',
      entity: 'Link',
      entityId: hub.id,
      entityLabel: `${hub.name} › reordenação de ${items.length} link(s)`,
      before: { order: existing },
      after: { order: items },
      ip,
    });

    return tx.link.findMany({
      where: { hubId: hub.id },
      orderBy: [{ order: 'asc' }, { title: 'asc' }],
    });
  });
}

async function nextOrder(tx, hubId, folderId) {
  const last = await tx.link.findFirst({
    where: { hubId, folderId },
    orderBy: { order: 'desc' },
    select: { order: true },
  });
  return (last?.order ?? 0) + 1;
}
