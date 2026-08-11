import { prisma } from '../lib/prisma.js';
import { unauthorized } from '../lib/errors.js';
import { loginSchema } from '../validators/authValidators.js';
import { login as loginService, toPublicUser } from '../services/authService.js';
import {
  REFRESH_COOKIE,
  clearSessionCookies,
  revokeByRawToken,
  rotateSession,
  setSessionCookies,
} from '../services/sessionService.js';

const requestContext = (req) => ({
  ip: req.ip,
  userAgent: req.get('user-agent') ?? undefined,
});

export async function login(req, res) {
  const { username, password } = loginSchema.parse(req.body);

  const { user, curatorHubIds, session } = await loginService({
    username,
    password,
    context: requestContext(req),
  });

  setSessionCookies(res, session);
  res.json({ user: toPublicUser(user, curatorHubIds) });
}

export async function refresh(req, res) {
  const { user, curatorHubIds, ...session } = await rotateSession(
    req.cookies?.[REFRESH_COOKIE],
    requestContext(req),
  );

  setSessionCookies(res, session);

  const withHub = await prisma.user.findUnique({
    where: { id: user.id },
    include: { hub: true },
  });

  res.json({ user: toPublicUser(withHub ?? user, curatorHubIds) });
}

export async function logout(req, res) {
  await revokeByRawToken(req.cookies?.[REFRESH_COOKIE]);
  clearSessionCookies(res);
  res.status(204).end();
}

export async function me(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { hub: true, curatorships: { select: { hubId: true } } },
  });

  if (!user || !user.active) throw unauthorized();

  res.json({ user: toPublicUser(user, user.curatorships.map((item) => item.hubId)) });
}
