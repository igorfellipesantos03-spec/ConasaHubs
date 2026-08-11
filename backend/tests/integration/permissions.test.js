import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createPrismaMock } from '../helpers/prismaMock.js';

const prisma = createPrismaMock();
vi.mock('../../src/lib/prisma.js', () => ({ prisma }));

const { createApp } = await import('../../src/app.js');
const { signAccessToken } = await import('../../src/lib/jwt.js');

const app = createApp();

const HUB_TI = '22222222-2222-2222-2222-222222222222';
const HUB_RH = '33333333-3333-3333-3333-333333333333';
const LINK_ID = '44444444-4444-4444-4444-444444444444';

const hubTi = { id: HUB_TI, slug: 'ti', name: 'Tecnologia da Informação', active: true };

function cookieFor({ role = 'USER', hubId = HUB_TI, curatorOf = [] } = {}) {
  const token = signAccessToken({
    sub: 'user-1',
    username: 'igor.fellipe',
    name: 'Igor',
    role,
    hubId,
    curatorOf,
  });
  return [`access_token=${token}`];
}

const novoLink = {
  title: 'Documentação técnica',
  url: 'https://docs.conasa.com',
  icon: 'BookOpen',
  color: '#00A8CC',
};

beforeEach(() => {
  vi.clearAllMocks();
  prisma.hub.findFirst.mockResolvedValue(hubTi);
  prisma.link.findFirst.mockResolvedValue(null);
  prisma.link.create.mockResolvedValue({ id: LINK_ID, hubId: HUB_TI, ...novoLink });
  prisma.auditLog.create.mockResolvedValue({ id: 'audit-1' });
});

describe('quem pode editar os links de um setor', () => {
  it('recusa usuário sem sessão', async () => {
    const response = await request(app).post(`/api/hubs/${HUB_TI}/links`).send(novoLink);
    expect(response.status).toBe(401);
  });

  it('recusa membro comum do próprio setor', async () => {
    prisma.hubCurator.findUnique.mockResolvedValue(null);

    const response = await request(app)
      .post(`/api/hubs/${HUB_TI}/links`)
      .set('Cookie', cookieFor())
      .send(novoLink);

    expect(response.status).toBe(403);
    expect(prisma.link.create).not.toHaveBeenCalled();
  });

  it('aceita curador do setor', async () => {
    prisma.hubCurator.findUnique.mockResolvedValue({ userId: 'user-1' });

    const response = await request(app)
      .post(`/api/hubs/${HUB_TI}/links`)
      .set('Cookie', cookieFor({ curatorOf: [HUB_TI] }))
      .send(novoLink);

    expect(response.status).toBe(201);
    expect(prisma.link.create).toHaveBeenCalled();
  });

  it('recusa curador de outro setor', async () => {
    prisma.hubCurator.findUnique.mockResolvedValue(null);

    const response = await request(app)
      .post(`/api/hubs/${HUB_TI}/links`)
      .set('Cookie', cookieFor({ hubId: HUB_RH, curatorOf: [HUB_RH] }))
      .send(novoLink);

    expect(response.status).toBe(403);
  });

  it('confere a curadoria no banco, e não no JWT — permissão revogada vale na hora', async () => {
    prisma.hubCurator.findUnique.mockResolvedValue(null);

    const response = await request(app)
      .post(`/api/hubs/${HUB_TI}/links`)
      .set('Cookie', cookieFor({ curatorOf: [HUB_TI] })) // token ainda afirma que é curador
      .send(novoLink);

    expect(response.status).toBe(403);
  });

  it('aceita administrador sem exigir curadoria', async () => {
    const response = await request(app)
      .post(`/api/hubs/${HUB_TI}/links`)
      .set('Cookie', cookieFor({ role: 'ADMIN', curatorOf: [] }))
      .send(novoLink);

    expect(response.status).toBe(201);
    expect(prisma.hubCurator.findUnique).not.toHaveBeenCalled();
  });

  it('devolve 404 para setor inexistente', async () => {
    prisma.hub.findFirst.mockResolvedValue(null);

    const response = await request(app)
      .post(`/api/hubs/${HUB_TI}/links`)
      .set('Cookie', cookieFor({ role: 'ADMIN' }))
      .send(novoLink);

    expect(response.status).toBe(404);
  });
});

describe('validação de link', () => {
  const comoCurador = () => {
    prisma.hubCurator.findUnique.mockResolvedValue({ userId: 'user-1' });
    return cookieFor({ curatorOf: [HUB_TI] });
  };

  it.each([
    ['javascript:alert(1)', 'javascript:'],
    ['data:text/html,<script>alert(1)</script>', 'data:'],
    ['file:///c:/windows', 'file:'],
    ['docs.conasa.com', 'sem protocolo'],
  ])('recusa URL %s (%s)', async (url) => {
    const response = await request(app)
      .post(`/api/hubs/${HUB_TI}/links`)
      .set('Cookie', comoCurador())
      .send({ ...novoLink, url });

    expect(response.status).toBe(400);
    expect(prisma.link.create).not.toHaveBeenCalled();
  });

  it('aceita http e https', async () => {
    const response = await request(app)
      .post(`/api/hubs/${HUB_TI}/links`)
      .set('Cookie', comoCurador())
      .send({ ...novoLink, url: 'http://intranet.conasa.local/sistema' });

    expect(response.status).toBe(201);
  });

  it('recusa link sem título', async () => {
    const response = await request(app)
      .post(`/api/hubs/${HUB_TI}/links`)
      .set('Cookie', comoCurador())
      .send({ url: 'https://ok.com' });

    expect(response.status).toBe(400);
  });

  it('impede vincular o link a uma seção de outro setor', async () => {
    prisma.linkCategory.findFirst.mockResolvedValue(null);

    const response = await request(app)
      .post(`/api/hubs/${HUB_TI}/links`)
      .set('Cookie', comoCurador())
      .send({ ...novoLink, categoryId: '55555555-5555-5555-5555-555555555555' });

    expect(response.status).toBe(400);
  });
});

describe('rotas administrativas', () => {
  it('recusa usuário comum', async () => {
    const response = await request(app).get('/api/admin/users').set('Cookie', cookieFor());
    expect(response.status).toBe(403);
  });

  it('recusa curador que não é admin', async () => {
    const response = await request(app)
      .get('/api/admin/audit')
      .set('Cookie', cookieFor({ curatorOf: [HUB_TI] }));
    expect(response.status).toBe(403);
  });

  it('aceita administrador', async () => {
    prisma.user.count.mockResolvedValue(0);
    prisma.user.findMany.mockResolvedValue([]);

    const response = await request(app)
      .get('/api/admin/users')
      .set('Cookie', cookieFor({ role: 'ADMIN' }));

    expect(response.status).toBe(200);
  });

  it('impede o admin de remover o próprio acesso de administrador', async () => {
    const token = signAccessToken({
      sub: 'user-1',
      username: 'admin.ti',
      name: 'Admin',
      role: 'ADMIN',
      hubId: null,
      curatorOf: [],
    });

    const response = await request(app)
      .patch('/api/admin/users/user-1')
      .set('Cookie', [`access_token=${token}`])
      .send({ role: 'USER' });

    expect(response.status).toBe(400);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
