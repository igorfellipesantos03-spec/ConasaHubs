import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPrismaMock } from '../helpers/prismaMock.js';

const prisma = createPrismaMock();
vi.mock('../../src/lib/prisma.js', () => ({ prisma }));

const { canSeeRestricted, getHubBySlug, listHubs } = await import(
  '../../src/services/hubService.js'
);

const HUB_TI = 'hub-ti';
const HUB_RH = 'hub-rh';

const publico = { id: 'link-pub', title: 'n8n', visibility: 'PUBLIC', categoryId: null };
const restrito = { id: 'link-restrito', title: 'Senhas', visibility: 'HUB_ONLY', categoryId: null };

const hubCompleto = {
  id: HUB_TI,
  slug: 'ti',
  name: 'TI',
  description: null,
  icon: 'Cpu',
  color: '#0F2C59',
  active: true,
  categories: [],
  links: [publico, restrito],
};

beforeEach(() => {
  vi.clearAllMocks();
  prisma.hub.findUnique.mockResolvedValue(hubCompleto);
  prisma.favorite.findMany.mockResolvedValue([]);
});

describe('canSeeRestricted', () => {
  it.each([
    ['membro do setor', { role: 'USER', hubId: HUB_TI, curatorOf: [] }, true],
    ['curador do setor', { role: 'USER', hubId: HUB_RH, curatorOf: [HUB_TI] }, true],
    ['administrador', { role: 'ADMIN', hubId: HUB_RH, curatorOf: [] }, true],
    ['pessoa de outro setor', { role: 'USER', hubId: HUB_RH, curatorOf: [] }, false],
    ['pessoa sem setor', { role: 'USER', hubId: null, curatorOf: [] }, false],
  ])('%s', (_, user, esperado) => {
    expect(canSeeRestricted(user, HUB_TI)).toBe(esperado);
  });
});

describe('getHubBySlug', () => {
  it('esconde links HUB_ONLY de quem é de outro setor', async () => {
    const hub = await getHubBySlug(
      { id: 'u1', role: 'USER', hubId: HUB_RH, curatorOf: [] },
      'ti',
    );

    const titulos = hub.uncategorizedLinks.map((link) => link.title);
    expect(titulos).toEqual(['n8n']);
    expect(hub.canEdit).toBe(false);
  });

  it('mostra links HUB_ONLY para quem é do setor', async () => {
    const hub = await getHubBySlug(
      { id: 'u1', role: 'USER', hubId: HUB_TI, curatorOf: [] },
      'ti',
    );

    expect(hub.uncategorizedLinks.map((link) => link.title)).toEqual(['n8n', 'Senhas']);
    expect(hub.canEdit).toBe(false);
  });

  it('marca canEdit para o curador do setor', async () => {
    const hub = await getHubBySlug(
      { id: 'u1', role: 'USER', hubId: HUB_RH, curatorOf: [HUB_TI] },
      'ti',
    );

    expect(hub.canEdit).toBe(true);
  });

  it('sinaliza os links favoritados do usuário', async () => {
    prisma.favorite.findMany.mockResolvedValue([{ linkId: 'link-pub' }]);

    const hub = await getHubBySlug({ id: 'u1', role: 'ADMIN', hubId: null, curatorOf: [] }, 'ti');

    expect(hub.uncategorizedLinks.find((link) => link.id === 'link-pub').isFavorite).toBe(true);
    expect(hub.uncategorizedLinks.find((link) => link.id === 'link-restrito').isFavorite).toBe(false);
  });

  it('trata setor desativado como inexistente', async () => {
    prisma.hub.findUnique.mockResolvedValue({ ...hubCompleto, active: false });

    await expect(
      getHubBySlug({ id: 'u1', role: 'USER', hubId: HUB_TI, curatorOf: [] }, 'ti'),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe('listHubs', () => {
  it('conta apenas os links que o usuário enxerga', async () => {
    prisma.hub.findMany.mockResolvedValue([
      { ...hubCompleto, _count: { curators: 2 } },
      {
        id: HUB_RH,
        slug: 'rh',
        name: 'RH',
        links: [{ id: 'l3', visibility: 'PUBLIC' }],
        _count: { curators: 0 },
      },
    ]);

    const hubs = await listHubs({ id: 'u1', role: 'USER', hubId: HUB_RH, curatorOf: [] });

    expect(hubs.find((hub) => hub.slug === 'ti')).toMatchObject({
      linkCount: 1,       // o HUB_ONLY da TI não conta para quem é do RH
      isMine: false,
      canEdit: false,
    });
    expect(hubs.find((hub) => hub.slug === 'rh')).toMatchObject({ isMine: true, linkCount: 1 });
  });
});
