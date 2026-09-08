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
const CATEGORIA_ID = '55555555-5555-5555-5555-555555555555';

const EU = 'user-1';
const OUTRA_PESSOA = 'user-2';

const hubTi = { id: HUB_TI, slug: 'ti', name: 'Tecnologia da Informação', active: true };

function cookieFor({ role = 'USER', hubId = HUB_TI, curatorOf = [] } = {}) {
  const token = signAccessToken({
    sub: EU,
    username: 'igor.fellipe',
    name: 'Igor',
    role,
    hubId,
    curatorOf,
  });
  return [`access_token=${token}`];
}

/** Curadoria é sempre relida do banco — é o mock dela que manda, não o JWT. */
const comCuradoria = (tem) =>
  prisma.hubCurator.findUnique.mockResolvedValue(tem ? { userId: EU } : null);

const novoLink = {
  title: 'Documentação técnica',
  url: 'https://docs.conasa.com',
  icon: 'BookOpen',
  color: '#00A8CC',
};

const linkDe = (createdById) => ({ id: LINK_ID, hubId: HUB_TI, createdById, ...novoLink });

beforeEach(() => {
  vi.clearAllMocks();
  prisma.hub.findFirst.mockResolvedValue(hubTi);
  prisma.link.findFirst.mockResolvedValue(null);
  prisma.link.create.mockResolvedValue(linkDe(EU));
  prisma.link.update.mockResolvedValue(linkDe(EU));
  prisma.link.delete.mockResolvedValue(linkDe(EU));
  prisma.auditLog.create.mockResolvedValue({ id: 'audit-1' });
  comCuradoria(false);
});

describe('quem pode publicar num setor', () => {
  it('recusa usuário sem sessão', async () => {
    const response = await request(app).post(`/api/hubs/${HUB_TI}/links`).send(novoLink);
    expect(response.status).toBe(401);
  });

  it('aceita membro comum do próprio setor', async () => {
    const response = await request(app)
      .post(`/api/hubs/${HUB_TI}/links`)
      .set('Cookie', cookieFor())
      .send(novoLink);

    expect(response.status).toBe(201);
    expect(prisma.link.create).toHaveBeenCalled();
  });

  it('registra quem publicou o link', async () => {
    await request(app).post(`/api/hubs/${HUB_TI}/links`).set('Cookie', cookieFor()).send(novoLink);

    expect(prisma.link.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ createdById: EU }) }),
    );
  });

  it('aceita curador do setor', async () => {
    comCuradoria(true);

    const response = await request(app)
      .post(`/api/hubs/${HUB_TI}/links`)
      .set('Cookie', cookieFor({ curatorOf: [HUB_TI] }))
      .send(novoLink);

    expect(response.status).toBe(201);
  });

  it('recusa quem é de outro setor e não cura este', async () => {
    const response = await request(app)
      .post(`/api/hubs/${HUB_TI}/links`)
      .set('Cookie', cookieFor({ hubId: HUB_RH, curatorOf: [HUB_RH] }))
      .send(novoLink);

    expect(response.status).toBe(403);
    expect(prisma.link.create).not.toHaveBeenCalled();
  });

  it('confere a curadoria no banco, e não no JWT — permissão revogada vale na hora', async () => {
    const response = await request(app)
      .post(`/api/hubs/${HUB_TI}/links`)
      .set('Cookie', cookieFor({ hubId: HUB_RH, curatorOf: [HUB_TI] })) // token ainda afirma curadoria
      .send(novoLink);

    expect(response.status).toBe(403);
  });

  it('aceita administrador sem exigir curadoria', async () => {
    const response = await request(app)
      .post(`/api/hubs/${HUB_TI}/links`)
      .set('Cookie', cookieFor({ role: 'ADMIN', hubId: null }))
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

describe('quem pode mexer no que já foi publicado', () => {
  it('deixa o autor editar o próprio link', async () => {
    prisma.link.findFirst.mockResolvedValue(linkDe(EU));

    const response = await request(app)
      .patch(`/api/hubs/${HUB_TI}/links/${LINK_ID}`)
      .set('Cookie', cookieFor())
      .send({ title: 'Documentação nova' });

    expect(response.status).toBe(200);
    expect(prisma.link.update).toHaveBeenCalled();
  });

  it('impede membro comum de editar link de outra pessoa do setor', async () => {
    prisma.link.findFirst.mockResolvedValue(linkDe(OUTRA_PESSOA));

    const response = await request(app)
      .patch(`/api/hubs/${HUB_TI}/links/${LINK_ID}`)
      .set('Cookie', cookieFor())
      .send({ title: 'Sequestrando o link alheio' });

    expect(response.status).toBe(403);
    expect(prisma.link.update).not.toHaveBeenCalled();
  });

  it('impede membro comum de excluir link de outra pessoa do setor', async () => {
    prisma.link.findFirst.mockResolvedValue(linkDe(OUTRA_PESSOA));

    const response = await request(app)
      .delete(`/api/hubs/${HUB_TI}/links/${LINK_ID}`)
      .set('Cookie', cookieFor());

    expect(response.status).toBe(403);
    expect(prisma.link.delete).not.toHaveBeenCalled();
  });

  it('deixa o curador editar o link de qualquer pessoa do setor', async () => {
    prisma.link.findFirst.mockResolvedValue(linkDe(OUTRA_PESSOA));
    comCuradoria(true);

    const response = await request(app)
      .patch(`/api/hubs/${HUB_TI}/links/${LINK_ID}`)
      .set('Cookie', cookieFor({ curatorOf: [HUB_TI] }))
      .send({ title: 'Ajuste do curador' });

    expect(response.status).toBe(200);
  });

  it('deixa o admin editar o link de qualquer pessoa', async () => {
    prisma.link.findFirst.mockResolvedValue(linkDe(OUTRA_PESSOA));

    const response = await request(app)
      .patch(`/api/hubs/${HUB_TI}/links/${LINK_ID}`)
      .set('Cookie', cookieFor({ role: 'ADMIN' }))
      .send({ title: 'Ajuste do admin' });

    expect(response.status).toBe(200);
  });

  it('reordenar o mural continua sendo do curador: mexe no que é dos outros', async () => {
    const response = await request(app)
      .patch(`/api/hubs/${HUB_TI}/links/reorder`)
      .set('Cookie', cookieFor())
      .send({ items: [{ id: LINK_ID, order: 1 }] });

    expect(response.status).toBe(403);
  });
});

describe('seções do setor', () => {
  beforeEach(() => {
    prisma.linkCategory.count.mockResolvedValue(0);
    prisma.linkCategory.create.mockResolvedValue({
      id: CATEGORIA_ID,
      hubId: HUB_TI,
      name: 'Sistemas',
      createdById: EU,
    });
    prisma.linkCategory.update.mockResolvedValue({ id: CATEGORIA_ID, name: 'Sistemas' });
    prisma.linkCategory.delete.mockResolvedValue({ id: CATEGORIA_ID });
  });

  it('deixa membro comum criar seção e registra a autoria', async () => {
    const response = await request(app)
      .post(`/api/hubs/${HUB_TI}/categories`)
      .set('Cookie', cookieFor())
      .send({ name: 'Sistemas' });

    expect(response.status).toBe(201);
    expect(prisma.linkCategory.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ createdById: EU }) }),
    );
  });

  it('impede membro comum de excluir seção de outra pessoa', async () => {
    prisma.linkCategory.findFirst.mockResolvedValue({
      id: CATEGORIA_ID,
      hubId: HUB_TI,
      name: 'Sistemas',
      createdById: OUTRA_PESSOA,
    });

    const response = await request(app)
      .delete(`/api/hubs/${HUB_TI}/categories/${CATEGORIA_ID}`)
      .set('Cookie', cookieFor());

    expect(response.status).toBe(403);
    expect(prisma.linkCategory.delete).not.toHaveBeenCalled();
  });

  it('deixa o curador excluir seção de qualquer pessoa do setor', async () => {
    prisma.linkCategory.findFirst.mockResolvedValue({
      id: CATEGORIA_ID,
      hubId: HUB_TI,
      name: 'Sistemas',
      createdById: OUTRA_PESSOA,
    });
    comCuradoria(true);

    const response = await request(app)
      .delete(`/api/hubs/${HUB_TI}/categories/${CATEGORIA_ID}`)
      .set('Cookie', cookieFor({ curatorOf: [HUB_TI] }));

    expect(response.status).toBe(204);
  });
});

describe('quem pode reapresentar o setor', () => {
  beforeEach(() => {
    prisma.hub.findUnique.mockResolvedValue(hubTi);
    prisma.hub.update.mockResolvedValue({ ...hubTi, name: 'TI Corporativa' });
  });

  it('deixa o curador renomear o próprio setor', async () => {
    comCuradoria(true);

    const response = await request(app)
      .patch(`/api/hubs/${HUB_TI}`)
      .set('Cookie', cookieFor({ curatorOf: [HUB_TI] }))
      .send({ name: 'TI Corporativa' });

    expect(response.status).toBe(200);
    expect(prisma.hub.update).toHaveBeenCalled();
  });

  it('recusa membro comum: renomear o setor é do curador', async () => {
    const response = await request(app)
      .patch(`/api/hubs/${HUB_TI}`)
      .set('Cookie', cookieFor())
      .send({ name: 'TI da galera' });

    expect(response.status).toBe(403);
    expect(prisma.hub.update).not.toHaveBeenCalled();
  });

  it('impede o curador de mexer no endereço e na visibilidade do setor', async () => {
    comCuradoria(true);

    const response = await request(app)
      .patch(`/api/hubs/${HUB_TI}`)
      .set('Cookie', cookieFor({ curatorOf: [HUB_TI] }))
      .send({ name: 'TI', slug: 'outro-endereco', active: false });

    expect(response.status).toBe(400);
    expect(prisma.hub.update).not.toHaveBeenCalled();
  });

  it('deixa o admin mexer em tudo, inclusive no endereço', async () => {
    const response = await request(app)
      .patch(`/api/hubs/${HUB_TI}`)
      .set('Cookie', cookieFor({ role: 'ADMIN' }))
      .send({ slug: 'ti-corporativa' });

    expect(response.status).toBe(200);
  });

  it('criar e desativar setor continua sendo só do admin', async () => {
    comCuradoria(true);

    const criar = await request(app)
      .post('/api/hubs')
      .set('Cookie', cookieFor({ curatorOf: [HUB_TI] }))
      .send({ slug: 'novo', name: 'Novo setor' });

    const desativar = await request(app)
      .delete(`/api/hubs/${HUB_TI}`)
      .set('Cookie', cookieFor({ curatorOf: [HUB_TI] }));

    expect(criar.status).toBe(403);
    expect(desativar.status).toBe(403);
  });
});

describe('validação de link', () => {
  it.each([
    ['javascript:alert(1)', 'javascript:'],
    ['data:text/html,<script>alert(1)</script>', 'data:'],
    ['file:///c:/windows', 'file:'],
    ['docs.conasa.com', 'sem protocolo'],
  ])('recusa URL %s (%s)', async (url) => {
    const response = await request(app)
      .post(`/api/hubs/${HUB_TI}/links`)
      .set('Cookie', cookieFor())
      .send({ ...novoLink, url });

    expect(response.status).toBe(400);
    expect(prisma.link.create).not.toHaveBeenCalled();
  });

  it('aceita http e https', async () => {
    const response = await request(app)
      .post(`/api/hubs/${HUB_TI}/links`)
      .set('Cookie', cookieFor())
      .send({ ...novoLink, url: 'http://intranet.conasa.local/sistema' });

    expect(response.status).toBe(201);
  });

  it('recusa link sem título', async () => {
    const response = await request(app)
      .post(`/api/hubs/${HUB_TI}/links`)
      .set('Cookie', cookieFor())
      .send({ url: 'https://ok.com' });

    expect(response.status).toBe(400);
  });

  it('impede vincular o link a uma seção de outro setor', async () => {
    prisma.linkCategory.findFirst.mockResolvedValue(null);

    const response = await request(app)
      .post(`/api/hubs/${HUB_TI}/links`)
      .set('Cookie', cookieFor())
      .send({ ...novoLink, categoryId: CATEGORIA_ID });

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
    const response = await request(app)
      .patch(`/api/admin/users/${EU}`)
      .set('Cookie', cookieFor({ role: 'ADMIN', hubId: null }))
      .send({ role: 'USER' });

    expect(response.status).toBe(400);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
