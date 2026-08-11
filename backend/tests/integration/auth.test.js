import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createPrismaMock } from '../helpers/prismaMock.js';

const prisma = createPrismaMock();
vi.mock('../../src/lib/prisma.js', () => ({ prisma }));

const protheus = {
  autenticar: vi.fn(),
  buscarFuncionarioDoUsuario: vi.fn(),
};
vi.mock('../../src/services/protheusService.js', () => protheus);

const { createApp } = await import('../../src/app.js');
const { unauthorized, badGateway, forbidden } = await import('../../src/lib/errors.js');

const app = createApp();

const funcionario = {
  name: 'IGOR FELLIPE SANTOS',
  cpf: '12345678900',
  departamentCode: '001',
  departmentDescription: 'TECNOLOGIA DA INFORMACAO',
  companyKey: '07',
  branch: '01',
};

const usuarioSalvo = {
  id: '11111111-1111-1111-1111-111111111111',
  username: 'igor.fellipe',
  name: 'IGOR FELLIPE SANTOS',
  role: 'USER',
  active: true,
  hubId: 'hub-ti',
  hub: { id: 'hub-ti', slug: 'ti', name: 'Tecnologia da Informação' },
  protheusDeptName: 'TECNOLOGIA DA INFORMACAO',
  curatorships: [{ hubId: 'hub-ti' }],
};

function cookiesFrom(response) {
  const raw = response.headers['set-cookie'] ?? [];
  return Object.fromEntries(raw.map((cookie) => [cookie.split('=')[0], cookie]));
}

beforeEach(() => {
  vi.clearAllMocks();
  protheus.autenticar.mockResolvedValue({ accessToken: 'protheus-token', expiresIn: 3600 });
  protheus.buscarFuncionarioDoUsuario.mockResolvedValue(funcionario);
  prisma.user.findUnique.mockResolvedValue(null);
  prisma.deptMapping.findUnique.mockResolvedValue({ hubId: 'hub-ti' });
  prisma.user.upsert.mockResolvedValue(usuarioSalvo);
  prisma.refreshToken.create.mockImplementation(async ({ data }) => ({
    id: 'refresh-1',
    ...data,
  }));
});

describe('POST /api/auth/login', () => {
  it('autentica, provisiona o usuário e entrega os dois cookies de sessão', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'Igor.Fellipe', password: 'senha' });

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({
      username: 'igor.fellipe',
      hubSlug: 'ti',
      curatorOf: ['hub-ti'],
    });

    const cookies = cookiesFrom(response);
    expect(cookies.access_token).toContain('HttpOnly');
    expect(cookies.access_token).toContain('SameSite=Lax');
    expect(cookies.refresh_token).toContain('HttpOnly');
    expect(cookies.refresh_token).toContain('SameSite=Strict');
    expect(cookies.refresh_token).toContain('Path=/api/auth/refresh');
  });

  it('normaliza o username para minúsculas ao provisionar', async () => {
    await request(app).post('/api/auth/login').send({ username: '  Igor.Fellipe ', password: 'x' });

    expect(prisma.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { username: 'igor.fellipe' } }),
    );
  });

  it('nunca devolve o token do Protheus ao cliente', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'igor.fellipe', password: 'senha' });

    expect(JSON.stringify(response.body)).not.toContain('protheus-token');
    expect(response.headers['set-cookie'].join()).not.toContain('protheus-token');
  });

  it('devolve 401 quando o Protheus recusa as credenciais', async () => {
    protheus.autenticar.mockRejectedValue(
      unauthorized('Usuário ou senha incorretos.', { code: 'INVALID_CREDENTIALS' }),
    );

    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'igor.fellipe', password: 'errada' });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Usuário ou senha incorretos.');
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('devolve 502 quando o Protheus está indisponível', async () => {
    protheus.autenticar.mockRejectedValue(badGateway('O Protheus está indisponível no momento.'));

    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'igor.fellipe', password: 'senha' });

    expect(response.status).toBe(502);
  });

  it('entra sem setor quando o funcionário não é encontrado na SRA', async () => {
    protheus.buscarFuncionarioDoUsuario.mockResolvedValue(null);
    prisma.user.upsert.mockResolvedValue({ ...usuarioSalvo, hubId: null, hub: null });

    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'igor.fellipe', password: 'senha' });

    expect(response.status).toBe(200);
    expect(response.body.user.hubId).toBeNull();
  });

  it('respeita o setor fixado pelo admin (hubOverride) em vez do departamento do Protheus', async () => {
    prisma.user.findUnique.mockResolvedValue({ hubOverride: true, hubId: 'hub-escolhido' });

    await request(app).post('/api/auth/login').send({ username: 'igor.fellipe', password: 'x' });

    expect(prisma.deptMapping.findUnique).not.toHaveBeenCalled();
    expect(prisma.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ hubId: 'hub-escolhido' }),
      }),
    );
  });

  it('bloqueia usuário desativado no CentralHub', async () => {
    prisma.user.upsert.mockResolvedValue({ ...usuarioSalvo, active: false });

    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'igor.fellipe', password: 'senha' });

    expect(response.status).toBe(403);
  });

  it('rejeita payload sem senha antes de falar com o Protheus', async () => {
    const response = await request(app).post('/api/auth/login').send({ username: 'igor.fellipe' });

    expect(response.status).toBe(400);
    expect(protheus.autenticar).not.toHaveBeenCalled();
  });
});

describe('sessão', () => {
  async function login() {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'igor.fellipe', password: 'senha' });
    return response.headers['set-cookie'];
  }

  it('GET /api/auth/me exige cookie de sessão', async () => {
    const response = await request(app).get('/api/auth/me');
    expect(response.status).toBe(401);
  });

  it('GET /api/auth/me devolve o perfil com o cookie válido', async () => {
    const cookies = await login();
    prisma.user.findUnique.mockResolvedValue(usuarioSalvo);

    const response = await request(app).get('/api/auth/me').set('Cookie', cookies);

    expect(response.status).toBe(200);
    expect(response.body.user.username).toBe('igor.fellipe');
  });

  it('recusa um access token assinado com outro segredo', async () => {
    const jwt = (await import('jsonwebtoken')).default;
    const forjado = jwt.sign({ sub: 'x', role: 'ADMIN' }, 'outro-segredo', { issuer: 'centralhub' });

    const response = await request(app)
      .get('/api/auth/me')
      .set('Cookie', [`access_token=${forjado}`]);

    expect(response.status).toBe(401);
  });
});

describe('proteção CSRF por Origin', () => {
  it('recusa mutação vinda de outra origem', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .set('Origin', 'https://site-malicioso.com')
      .send({ username: 'igor.fellipe', password: 'senha' });

    expect(response.status).toBe(403);
    expect(protheus.autenticar).not.toHaveBeenCalled();
  });

  it('aceita mutação vinda do frontend configurado', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .set('Origin', 'http://localhost:5173')
      .send({ username: 'igor.fellipe', password: 'senha' });

    expect(response.status).toBe(200);
  });
});

describe('erros do domínio', () => {
  it('propaga 403 do serviço de autenticação', () => {
    expect(forbidden('sem permissão')).toMatchObject({ status: 403 });
  });
});
