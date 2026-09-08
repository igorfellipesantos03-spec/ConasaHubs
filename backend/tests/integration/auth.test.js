import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createPrismaMock } from '../helpers/prismaMock.js';

const prisma = createPrismaMock();
vi.mock('../../src/lib/prisma.js', () => ({ prisma }));

const protheus = {
  autenticar: vi.fn(),
  buscarFuncionarioPorCpf: vi.fn(),
  extrairDadosDoFuncionario: vi.fn(),
  rotuloDoDepartamento: vi.fn(),
};
vi.mock('../../src/services/protheusService.js', () => protheus);

const { createApp } = await import('../../src/app.js');
const { unauthorized, badGateway, forbidden } = await import('../../src/lib/errors.js');
const sessionStore = await import('../../src/lib/sessionStore.js');

const app = createApp();

const funcionario = {
  name: 'IGOR FELLIPE SANTOS',
  cpf: '12345678900',
  departamentCode: '0001400',
  departmentDescription: 'TI - DIORGNY',
  costCenterDescription: 'TECNOLOGIA DA INFORMACAO',
  roleDescription: 'ASSISTENTE TECNICO - TI',
};

/** Quem ainda não passou pelo wizard: sem setor, sem cadastro do Protheus. */
const usuarioNovo = {
  id: '11111111-1111-1111-1111-111111111111',
  username: 'igor.fellipe',
  name: 'igor.fellipe',
  role: 'USER',
  active: true,
  hubId: null,
  hub: null,
  cpf: null,
  onboardingCompletedAt: null,
  curatorships: [],
};

const usuarioCadastrado = {
  ...usuarioNovo,
  name: 'IGOR FELLIPE SANTOS',
  cpf: '12345678900',
  empresaId: '07',
  filialId: '01',
  hubId: 'hub-ti',
  hub: { id: 'hub-ti', slug: 'ti', name: 'Tecnologia da Informação' },
  protheusDeptName: 'TI - DIORGNY',
  roleDescription: 'ASSISTENTE TECNICO - TI',
  onboardingCompletedAt: new Date('2026-08-01T12:00:00Z'),
  curatorships: [{ hubId: 'hub-ti' }],
};

function cookiesFrom(response) {
  const raw = response.headers['set-cookie'] ?? [];
  return Object.fromEntries(raw.map((cookie) => [cookie.split('=')[0], cookie]));
}

const login = (body = { username: 'igor.fellipe', password: 'senha' }) =>
  request(app).post('/api/auth/login').send(body);

beforeEach(() => {
  vi.clearAllMocks();
  sessionStore.del(usuarioNovo.id);

  protheus.autenticar.mockResolvedValue({ accessToken: 'protheus-token', expiresIn: 3600 });
  protheus.buscarFuncionarioPorCpf.mockResolvedValue([funcionario]);
  protheus.rotuloDoDepartamento.mockImplementation((nome) => nome?.split(' - ')[0] ?? null);
  protheus.extrairDadosDoFuncionario.mockReturnValue({
    name: 'IGOR FELLIPE SANTOS',
    cpf: '12345678900',
    protheusDeptCode: '0001400',
    protheusDeptName: 'TI - DIORGNY',
    roleCode: '33098',
    roleDescription: 'ASSISTENTE TECNICO - TI',
    costCenterCode: '07.01.08.07.001',
    costCenterDescription: 'TECNOLOGIA DA INFORMACAO',
  });

  prisma.user.upsert.mockResolvedValue(usuarioNovo);
  prisma.user.update.mockResolvedValue(usuarioCadastrado);
  prisma.refreshToken.create.mockImplementation(async ({ data }) => ({ id: 'refresh-1', ...data }));
});

describe('POST /api/auth/login', () => {
  it('autentica, provisiona o usuário e entrega os dois cookies de sessão', async () => {
    const response = await login({ username: 'Igor.Fellipe', password: 'senha' });

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({ username: 'igor.fellipe' });

    const cookies = cookiesFrom(response);
    expect(cookies.access_token).toContain('HttpOnly');
    expect(cookies.access_token).toContain('SameSite=Lax');
    expect(cookies.refresh_token).toContain('HttpOnly');
    expect(cookies.refresh_token).toContain('SameSite=Strict');
    expect(cookies.refresh_token).toContain('Path=/api/auth/refresh');
  });

  it('normaliza o username para minúsculas ao provisionar', async () => {
    await login({ username: '  Igor.Fellipe ', password: 'x' });

    expect(prisma.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { username: 'igor.fellipe' } }),
    );
  });

  it('entra sem setor no primeiro acesso: quem é a pessoa se resolve no onboarding', async () => {
    const response = await login();

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({ hubId: null, onboardingCompleted: false });
    expect(protheus.buscarFuncionarioPorCpf).not.toHaveBeenCalled();
  });

  it('retém o token do Protheus para o onboarding usar em seguida', async () => {
    await login();

    expect(sessionStore.get(usuarioNovo.id)).toBe('protheus-token');
  });

  it('atualiza o cadastro de quem já concluiu o onboarding, sem retomar o token', async () => {
    prisma.user.upsert.mockResolvedValue(usuarioCadastrado);

    const response = await login();

    expect(response.status).toBe(200);
    expect(protheus.buscarFuncionarioPorCpf).toHaveBeenCalledWith(
      'protheus-token',
      '12345678900',
      { companyId: '07', branchId: '01' },
    );
    expect(sessionStore.get(usuarioCadastrado.id)).toBeNull();
  });

  it('não mexe no setor de quem já está cadastrado — trocar de hub é decisão de admin', async () => {
    prisma.user.upsert.mockResolvedValue(usuarioCadastrado);

    await login();

    const [{ data }] = prisma.user.update.mock.calls[0];
    expect(data).not.toHaveProperty('hubId');
    expect(data).not.toHaveProperty('cpf');
    expect(data).toMatchObject({ name: 'IGOR FELLIPE SANTOS', protheusDeptCode: '0001400' });
  });

  it('mantém o cadastro anterior quando o Protheus não acha mais o funcionário', async () => {
    prisma.user.upsert.mockResolvedValue(usuarioCadastrado);
    protheus.buscarFuncionarioPorCpf.mockResolvedValue([]);

    const response = await login();

    expect(response.status).toBe(200);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('encurta o departamento para o rótulo do setor', async () => {
    prisma.user.upsert.mockResolvedValue(usuarioCadastrado);

    const response = await login();

    expect(response.body.user.department).toBe('TI');
    expect(response.body.user.cargo).toBe('ASSISTENTE TECNICO - TI');
  });

  it('nunca devolve o token do Protheus ao cliente', async () => {
    const response = await login();

    expect(JSON.stringify(response.body)).not.toContain('protheus-token');
    expect(response.headers['set-cookie'].join()).not.toContain('protheus-token');
  });

  it('devolve 401 quando o Protheus recusa as credenciais', async () => {
    protheus.autenticar.mockRejectedValue(
      unauthorized('Usuário ou senha incorretos.', { code: 'INVALID_CREDENTIALS' }),
    );

    const response = await login({ username: 'igor.fellipe', password: 'errada' });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Usuário ou senha incorretos.');
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('devolve 502 quando o Protheus está indisponível', async () => {
    protheus.autenticar.mockRejectedValue(badGateway('O Protheus está indisponível no momento.'));

    expect((await login()).status).toBe(502);
  });

  it('bloqueia usuário desativado no CentralHub', async () => {
    prisma.user.upsert.mockResolvedValue({ ...usuarioNovo, active: false });

    expect((await login()).status).toBe(403);
  });

  it('não retém o token do Protheus de um usuário desativado', async () => {
    prisma.user.upsert.mockResolvedValue({ ...usuarioNovo, active: false });

    await login();

    expect(sessionStore.get(usuarioNovo.id)).toBeNull();
  });

  it('rejeita payload sem senha antes de falar com o Protheus', async () => {
    const response = await request(app).post('/api/auth/login').send({ username: 'igor.fellipe' });

    expect(response.status).toBe(400);
    expect(protheus.autenticar).not.toHaveBeenCalled();
  });
});

describe('sessão', () => {
  it('GET /api/auth/me exige cookie de sessão', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
  });

  it('GET /api/auth/me devolve o perfil com o cookie válido', async () => {
    const cookies = (await login()).headers['set-cookie'];
    prisma.user.findUnique.mockResolvedValue(usuarioCadastrado);

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
