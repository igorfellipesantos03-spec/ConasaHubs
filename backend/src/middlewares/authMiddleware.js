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
 * Carrega o hub de `:hubId` (uuid) ou `:slug` em `req.hub` e diz se quem está
 * pedindo cura aquele setor.
 *
 * A curadoria é conferida no banco, não no JWT: uma permissão revogada precisa
 * valer na hora, não em até 15 minutos.
 */
async function carregarHub(req) {
  const { hubId, slug } = req.params;

  const hub = await prisma.hub.findFirst({
    where: hubId ? { id: hubId } : { slug },
    select: { id: true, slug: true, name: true, active: true },
  });

  if (!hub) return { hub: null, ehCurador: false };

  req.hub = hub;

  if (req.user.role === 'ADMIN') return { hub, ehCurador: true };

  const curatorship = await prisma.hubCurator.findUnique({
    where: { userId_hubId: { userId: req.user.id, hubId: hub.id } },
    select: { userId: true },
  });

  return { hub, ehCurador: Boolean(curatorship) };
}

/** Ações que dizem respeito ao setor inteiro: renomear, organizar, reordenar. */
export const requireHubCurator = asyncRoute(async (req, res, next) => {
  const { hub, ehCurador } = await carregarHub(req);

  if (!hub) return next(notFound('Setor não encontrado.'));
  if (!ehCurador) return next(forbidden('Só curadores deste setor podem fazer isso.'));

  return next();
});

/**
 * Autoriza quem faz parte do setor: além do curador e do admin, qualquer pessoa
 * lotada no hub. Quem entra por aqui pode criar conteúdo; mexer no que é dos
 * outros ainda depende da checagem de autoria feita no service.
 */
export const requireHubMember = asyncRoute(async (req, res, next) => {
  const { hub, ehCurador } = await carregarHub(req);

  if (!hub) return next(notFound('Setor não encontrado.'));

  req.ehCuradorDoHub = ehCurador;

  if (!ehCurador && req.user.hubId !== hub.id) {
    return next(forbidden('Só quem faz parte deste setor pode adicionar conteúdo nele.'));
  }

  return next();
});
