import { prisma } from '../lib/prisma.js';
import { forbidden, notFound } from '../lib/errors.js';
import { canSeeRestricted } from './hubService.js';

/** Favoritos do usuário, já com o setor de origem para exibir na home. */
export async function listFavorites(user) {
  const favorites = await prisma.favorite.findMany({
    where: { userId: user.id, link: { active: true } },
    orderBy: { createdAt: 'asc' },
    include: { link: { include: { hub: { select: { slug: true, name: true } } } } },
  });

  return favorites
    .filter(
      ({ link }) => link.visibility === 'PUBLIC' || canSeeRestricted(user, link.hubId),
    )
    .map(({ link, createdAt }) => ({
      id: link.id,
      title: link.title,
      description: link.description,
      url: link.url,
      icon: link.icon,
      color: link.color,
      hubSlug: link.hub.slug,
      hubName: link.hub.name,
      favoritedAt: createdAt,
      isFavorite: true,
    }));
}

export async function addFavorite(user, linkId) {
  const link = await prisma.link.findFirst({
    where: { id: linkId, active: true },
    select: { id: true, hubId: true, visibility: true },
  });

  if (!link) throw notFound('Link não encontrado.');
  if (link.visibility === 'HUB_ONLY' && !canSeeRestricted(user, link.hubId)) {
    throw forbidden('Este link é restrito ao setor de origem.');
  }

  // Favoritar duas vezes é idempotente — o botão não deve dar erro.
  await prisma.favorite.upsert({
    where: { userId_linkId: { userId: user.id, linkId } },
    update: {},
    create: { userId: user.id, linkId },
  });
}

export async function removeFavorite(user, linkId) {
  await prisma.favorite.deleteMany({ where: { userId: user.id, linkId } });
}
