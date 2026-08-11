import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { signAccessToken } from '../lib/jwt.js';
import { unauthorized } from '../lib/errors.js';

export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';
export const REFRESH_COOKIE_PATH = '/api/auth/refresh';

const REFRESH_TTL_MS = () => env.REFRESH_TOKEN_TTL_HOURS * 60 * 60 * 1000;
const ACCESS_TTL_MS = () => env.ACCESS_TOKEN_TTL_MIN * 60 * 1000;

/**
 * O refresh token tem o formato `<id>.<segredo>`: o id localiza o registro em
 * uma única consulta e o segredo é conferido contra o HMAC guardado.
 * HMAC-SHA256 (e não um KDF lento) é adequado porque o segredo tem 384 bits de
 * entropia — não é uma senha adivinhável.
 */
function hashToken(secret) {
  return crypto.createHmac('sha256', env.JWT_SECRET).update(secret).digest('hex');
}

function timingSafeEqual(a, b) {
  const bufferA = Buffer.from(a, 'utf8');
  const bufferB = Buffer.from(b, 'utf8');
  if (bufferA.length !== bufferB.length) return false;
  return crypto.timingSafeEqual(bufferA, bufferB);
}

/** Monta o payload do JWT a partir do usuário e de suas curadorias. */
export function buildAccessPayload(user, curatorHubIds) {
  return {
    sub: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    hubId: user.hubId ?? null,
    curatorOf: curatorHubIds,
  };
}

/**
 * Emite o par access + refresh. `familyId` mantém a cadeia de rotações do mesmo
 * login: se um token já usado reaparecer, revogamos a família inteira.
 */
export async function issueSession(
  user,
  curatorHubIds,
  context = {},
  familyId = crypto.randomUUID(),
) {
  const accessToken = signAccessToken(buildAccessPayload(user, curatorHubIds));
  const secret = crypto.randomBytes(48).toString('base64url');

  const record = await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(secret),
      familyId,
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS()),
      userAgent: context.userAgent?.slice(0, 255) ?? null,
      ip: context.ip ?? null,
    },
  });

  return { accessToken, refreshToken: `${record.id}.${secret}`, familyId };
}

function parseRefreshToken(rawToken) {
  if (typeof rawToken !== 'string') return null;
  const separator = rawToken.indexOf('.');
  if (separator <= 0) return null;
  return {
    id: rawToken.slice(0, separator),
    secret: rawToken.slice(separator + 1),
  };
}

async function findValidToken(rawToken) {
  const parsed = parseRefreshToken(rawToken);
  if (!parsed) return null;

  const record = await prisma.refreshToken.findUnique({
    where: { id: parsed.id },
    include: { user: { include: { curatorships: { select: { hubId: true } } } } },
  });

  if (!record) return null;
  if (!timingSafeEqual(record.tokenHash, hashToken(parsed.secret))) return null;

  return record;
}

/**
 * Valida o refresh token recebido, revoga-o e emite um novo par (rotação).
 * Reuso de um token já revogado derruba todas as sessões daquela família.
 */
export async function rotateSession(rawToken, context = {}) {
  const record = await findValidToken(rawToken);
  if (!record) throw unauthorized();

  if (record.revokedAt) {
    logger.warn(
      { userId: record.userId, familyId: record.familyId },
      'Reuso de refresh token detectado — revogando a família',
    );
    await revokeFamily(record.familyId);
    throw unauthorized('Sessão inválida. Faça login novamente.', { code: 'TOKEN_REUSED' });
  }

  if (record.expiresAt <= new Date()) throw unauthorized();

  if (!record.user.active) {
    await revokeAllForUser(record.userId);
    throw unauthorized('Seu acesso foi desativado.', { code: 'USER_INACTIVE' });
  }

  await prisma.refreshToken.update({
    where: { id: record.id },
    data: { revokedAt: new Date() },
  });

  const curatorHubIds = record.user.curatorships.map((item) => item.hubId);
  const session = await issueSession(record.user, curatorHubIds, context, record.familyId);

  return { ...session, user: record.user, curatorHubIds };
}

export async function revokeFamily(familyId) {
  await prisma.refreshToken.updateMany({
    where: { familyId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllForUser(userId) {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Revoga a família do token apresentado — usado no logout. */
export async function revokeByRawToken(rawToken) {
  const record = await findValidToken(rawToken);
  if (record) await revokeFamily(record.familyId);
}

/** Higiene: remove tokens expirados há mais de um dia. */
export async function purgeExpiredTokens() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const { count } = await prisma.refreshToken.deleteMany({
    where: { expiresAt: { lt: cutoff } },
  });
  return count;
}

const baseCookie = () => ({
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  path: '/',
});

export function setSessionCookies(res, { accessToken, refreshToken }) {
  res.cookie(ACCESS_COOKIE, accessToken, {
    ...baseCookie(),
    sameSite: 'lax',
    maxAge: ACCESS_TTL_MS(),
  });
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...baseCookie(),
    sameSite: 'strict',
    path: REFRESH_COOKIE_PATH,
    maxAge: REFRESH_TTL_MS(),
  });
}

export function clearSessionCookies(res) {
  res.clearCookie(ACCESS_COOKIE, { ...baseCookie(), sameSite: 'lax' });
  res.clearCookie(REFRESH_COOKIE, {
    ...baseCookie(),
    sameSite: 'strict',
    path: REFRESH_COOKIE_PATH,
  });
}
