import { prisma } from '../lib/prisma.js';
import { notFound } from '../lib/errors.js';
import { recordAudit } from './auditService.js';

/**
 * Um link `HUB_ONLY` só aparece para quem pertence ao setor, para quem cura o
 * setor e para administradores.
 */
export function canSeeRestricted(user, hubId) {
  return (
    user.role === 'ADMIN' ||
    user.hubId === hubId ||
    (user.curatorOf ?? []).includes(hubId)
  );
}

/** Lista os setores para a home, com a contagem de links que o usuário enxerga. */
export async function listHubs(user) {
  const hubs = await prisma.hub.findMany({
    where: { active: true },
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
    include: {
      links: { where: { active: true }, select: { id: true, visibility: true } },
      _count: { select: { curators: true } },
    },
  });

  return hubs.map(({ links, _count, ...hub }) => ({
    ...hub,
    linkCount: links.filter(
      (link) => link.visibility === 'PUBLIC' || canSeeRestricted(user, hub.id),
    ).length,
    curatorCount: _count.curators,
    isMine: user.hubId === hub.id,
    canEdit: user.role === 'ADMIN' || (user.curatorOf ?? []).includes(hub.id),
  }));
}

/** Detalhe do setor: categorias com seus links, mais os links sem categoria. */
export async function getHubBySlug(user, slug) {
  const hub = await prisma.hub.findUnique({
    where: { slug },
    include: {
      categories: { orderBy: [{ order: 'asc' }, { name: 'asc' }] },
      links: {
        where: { active: true },
        orderBy: [{ order: 'asc' }, { title: 'asc' }],
      },
    },
  });

  if (!hub || !hub.active) throw notFound('Setor não encontrado.');

  const links = hub.links.filter(
    (link) => link.visibility === 'PUBLIC' || canSeeRestricted(user, hub.id),
  );

  const favorites = await prisma.favorite.findMany({
    where: { userId: user.id, linkId: { in: links.map((link) => link.id) } },
    select: { linkId: true },
  });
  const favoriteIds = new Set(favorites.map((item) => item.linkId));

  const decorate = (link) => ({ ...link, isFavorite: favoriteIds.has(link.id) });

  return {
    id: hub.id,
    slug: hub.slug,
    name: hub.name,
    description: hub.description,
    icon: hub.icon,
    color: hub.color,
    canEdit: user.role === 'ADMIN' || (user.curatorOf ?? []).includes(hub.id),
    categories: hub.categories.map((category) => ({
      ...category,
      links: links.filter((link) => link.categoryId === category.id).map(decorate),
    })),
    uncategorizedLinks: links.filter((link) => !link.categoryId).map(decorate),
  };
}

export async function createHub(actor, data, ip) {
  return prisma.$transaction(async (tx) => {
    const hub = await tx.hub.create({ data });
    await recordAudit(tx, {
      actor,
      action: 'CREATE',
      entity: 'Hub',
      entityId: hub.id,
      entityLabel: hub.name,
      after: hub,
      ip,
    });
    return hub;
  });
}

export async function updateHub(actor, hubId, data, ip) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.hub.findUnique({ where: { id: hubId } });
    if (!before) throw notFound('Setor não encontrado.');

    const hub = await tx.hub.update({ where: { id: hubId }, data });
    await recordAudit(tx, {
      actor,
      action: 'UPDATE',
      entity: 'Hub',
      entityId: hub.id,
      entityLabel: hub.name,
      before,
      after: hub,
      ip,
    });
    return hub;
  });
}

/**
 * Desativa o setor em vez de apagar: os links, a curadoria e o histórico de
 * auditoria continuam íntegros, e a operação é reversível.
 */
export async function deactivateHub(actor, hubId, ip) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.hub.findUnique({ where: { id: hubId } });
    if (!before) throw notFound('Setor não encontrado.');

    const hub = await tx.hub.update({ where: { id: hubId }, data: { active: false } });
    await recordAudit(tx, {
      actor,
      action: 'DELETE',
      entity: 'Hub',
      entityId: hub.id,
      entityLabel: hub.name,
      before,
      ip,
    });
    return hub;
  });
}

export async function createCategory(actor, hub, data, ip) {
  return prisma.$transaction(async (tx) => {
    const order =
      data.order ??
      (await tx.linkCategory.count({ where: { hubId: hub.id } })) + 1;

    const category = await tx.linkCategory.create({
      data: { hubId: hub.id, name: data.name, order },
    });

    await recordAudit(tx, {
      actor,
      action: 'CREATE',
      entity: 'LinkCategory',
      entityId: category.id,
      entityLabel: `${hub.name} › ${category.name}`,
      after: category,
      ip,
    });
    return category;
  });
}

export async function updateCategory(actor, hub, categoryId, data, ip) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.linkCategory.findFirst({
      where: { id: categoryId, hubId: hub.id },
    });
    if (!before) throw notFound('Seção não encontrada.');

    const category = await tx.linkCategory.update({ where: { id: categoryId }, data });
    await recordAudit(tx, {
      actor,
      action: 'UPDATE',
      entity: 'LinkCategory',
      entityId: category.id,
      entityLabel: `${hub.name} › ${category.name}`,
      before,
      after: category,
      ip,
    });
    return category;
  });
}

/** Remove a seção; os links dentro dela ficam sem categoria (onDelete: SetNull). */
export async function deleteCategory(actor, hub, categoryId, ip) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.linkCategory.findFirst({
      where: { id: categoryId, hubId: hub.id },
    });
    if (!before) throw notFound('Seção não encontrada.');

    await tx.linkCategory.delete({ where: { id: categoryId } });
    await recordAudit(tx, {
      actor,
      action: 'DELETE',
      entity: 'LinkCategory',
      entityId: categoryId,
      entityLabel: `${hub.name} › ${before.name}`,
      before,
      ip,
    });
  });
}
