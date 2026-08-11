import { verifyAccessToken } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';
import { asyncRoute } from '../lib/asyncRoute.js';
import { forbidden, notFound, unauthorized } from '../lib/errors.js';
import { ACCESS_COOKIE } from '../services/sessionService.js';

/**
 * Valida o JWT do cookie e popula `req.user`.
 * O CentralHub não conversa com o Protheus depois do login, então não há token
 * externo para recuperar aqui — a sessão é inteiramente local.
 */
export function requireAuth(req, res, next) {
  const token = req.cookies?.[ACCESS_COOKIE];
  if (!token) return next(unauthorized());

  const payload = verifyAccessToken(token);

  req.user = {
    id: payload.sub,
    username: payload.username,
    name: payload.name,
    role: payload.role,
    hubId: payload.hubId ?? null,
    curatorOf: payload.curatorOf ?? [],
  };

  return next();
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'ADMIN') return next(forbidden());
  return next();
}

/**
 * Autoriza a edição do conteúdo de um hub: admin sempre pode; os demais
 * precisam ser curadores daquele hub.
 *
 * A curadoria é conferida no banco, não no JWT: uma permissão revogada precisa
 * valer na hora, não em até 15 minutos.
 *
 * Aceita `:hubId` (uuid) ou `:slug` na rota e deixa o hub em `req.hub`.
 */
export const requireHubCurator = asyncRoute(async (req, res, next) => {
  const { hubId, slug } = req.params;

  const hub = await prisma.hub.findFirst({
    where: hubId ? { id: hubId } : { slug },
    select: { id: true, slug: true, name: true, active: true },
  });

  if (!hub) return next(notFound('Setor não encontrado.'));
  req.hub = hub;

  if (req.user.role === 'ADMIN') return next();

  const curatorship = await prisma.hubCurator.findUnique({
    where: { userId_hubId: { userId: req.user.id, hubId: hub.id } },
    select: { userId: true },
  });

  if (!curatorship) {
    return next(forbidden('Só curadores deste setor podem editar seus links.'));
  }

  return next();
});
