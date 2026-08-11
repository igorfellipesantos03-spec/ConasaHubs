import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPrismaMock } from '../helpers/prismaMock.js';

const prisma = createPrismaMock();
vi.mock('../../src/lib/prisma.js', () => ({ prisma }));

const { issueSession, rotateSession, revokeByRawToken } = await import(
  '../../src/services/sessionService.js'
);

const user = { id: 'user-1', username: 'igor.fellipe', name: 'Igor', role: 'USER', hubId: 'hub-ti' };

const daquiUmaHora = () => new Date(Date.now() + 60 * 60 * 1000);

/** Reproduz o registro que o banco devolveria para o token emitido. */
function registroDoToken(rawToken, overrides = {}) {
  const [id] = rawToken.split('.');
  const { data } = prisma.refreshToken.create.mock.calls.at(-1)[0];
  return {
    id,
    userId: user.id,
    tokenHash: data.tokenHash,
    familyId: data.familyId,
    expiresAt: daquiUmaHora(),
    revokedAt: null,
    user: { ...user, active: true, curatorships: [{ hubId: 'hub-ti' }] },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  prisma.refreshToken.create.mockImplementation(async ({ data }) => ({ id: 'refresh-1', ...data }));
});

describe('issueSession', () => {
  it('emite o refresh token no formato <id>.<segredo> e guarda apenas o hash', async () => {
    const { refreshToken } = await issueSession(user, ['hub-ti']);

    const [id, secret] = refreshToken.split('.');
    expect(id).toBe('refresh-1');
    expect(secret.length).toBeGreaterThan(40);

    const { data } = prisma.refreshToken.create.mock.calls[0][0];
    expect(data.tokenHash).not.toContain(secret);
    expect(data.tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('rotateSession', () => {
  it('revoga o token usado e emite um novo par mantendo a família', async () => {
    const { refreshToken, familyId } = await issueSession(user, ['hub-ti']);
    prisma.refreshToken.findUnique.mockResolvedValue(registroDoToken(refreshToken));

    const rotated = await rotateSession(refreshToken);

    expect(prisma.refreshToken.update).toHaveBeenCalledWith({
      where: { id: 'refresh-1' },
      data: { revokedAt: expect.any(Date) },
    });
    expect(rotated.familyId).toBe(familyId);
    expect(rotated.refreshToken).not.toBe(refreshToken);
    expect(rotated.accessToken).toBeTruthy();
  });

  it('detecta reuso de token já revogado e derruba a família inteira', async () => {
    const { refreshToken, familyId } = await issueSession(user, []);
    prisma.refreshToken.findUnique.mockResolvedValue(
      registroDoToken(refreshToken, { revokedAt: new Date() }),
    );

    await expect(rotateSession(refreshToken)).rejects.toMatchObject({
      status: 401,
      code: 'TOKEN_REUSED',
    });

    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { familyId, revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it('recusa um segredo adulterado para um id válido', async () => {
    const { refreshToken } = await issueSession(user, []);
    prisma.refreshToken.findUnique.mockResolvedValue(registroDoToken(refreshToken));

    await expect(rotateSession('refresh-1.segredo-errado')).rejects.toMatchObject({ status: 401 });
    expect(prisma.refreshToken.update).not.toHaveBeenCalled();
  });

  it('recusa token expirado', async () => {
    const { refreshToken } = await issueSession(user, []);
    prisma.refreshToken.findUnique.mockResolvedValue(
      registroDoToken(refreshToken, { expiresAt: new Date(Date.now() - 1000) }),
    );

    await expect(rotateSession(refreshToken)).rejects.toMatchObject({ status: 401 });
  });

  it('recusa e limpa as sessões de usuário desativado', async () => {
    const { refreshToken } = await issueSession(user, []);
    prisma.refreshToken.findUnique.mockResolvedValue(
      registroDoToken(refreshToken, {
        user: { ...user, active: false, curatorships: [] },
      }),
    );

    await expect(rotateSession(refreshToken)).rejects.toMatchObject({ code: 'USER_INACTIVE' });
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it.each([undefined, '', 'sem-separador', '.só-segredo'])(
    'recusa token malformado (%s)',
    async (token) => {
      await expect(rotateSession(token)).rejects.toMatchObject({ status: 401 });
    },
  );
});

describe('revokeByRawToken', () => {
  it('revoga a família do token no logout', async () => {
    const { refreshToken, familyId } = await issueSession(user, []);
    prisma.refreshToken.findUnique.mockResolvedValue(registroDoToken(refreshToken));

    await revokeByRawToken(refreshToken);

    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { familyId, revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it('ignora silenciosamente um token desconhecido', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue(null);

    await expect(revokeByRawToken('inexistente.abc')).resolves.toBeUndefined();
    expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
  });
});
