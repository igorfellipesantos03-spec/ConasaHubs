import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createPrismaMock } from '../helpers/prismaMock.js';

const prisma = createPrismaMock();
vi.mock('../../src/lib/prisma.js', () => ({ prisma }));

const protheus = {
  autenticar: vi.fn(),
  buscarFuncionarioPorCpf: vi.fn(),
  extrairDadosDoFuncionario: vi.fn(),
  rotuloDoDepartamento: vi.fn((nome) => nome?.split(' - ')[0] ?? null),
};
vi.mock('../../src/services/protheusService.js', () => protheus);

const { createApp } = await import('../../src/app.js');
const { signAccessToken } = await import('../../src/lib/jwt.js');
const sessionStore = await import('../../src/lib/sessionStore.js');

const app = createApp();

const EU = '11111111-1111-1111-1111-111111111111';
const OUTRA_PESSOA = '99999999-9999-9999-9999-999999999999';
const HUB_TI = '22222222-2222-2222-2222-222222222222';

const CADASTRO = {
  companyId: '07',
  branchId: '01',
  cpf: '123.456.789-10',
};

/** O registro cru da SRA, do jeito que o Protheus devolve. */
const funcionario = {
  name: 'IGOR FELIPE DOS SANTOS GATO',
  companyKey: '07|01',
  departamentCode: '0001400',
  departmentDescription: 'TI - DIORGNY',
  costCenterCode: '07.01.08.07.001     ',
  costCenterDescription: 'TECNOLOGIA DA INFORMACAO',
  roleCode: '33098',
  roleDescription: 'ASSISTENTE TECNICO - TI',
};

const dadosExtraidos = {
  name: 'IGOR FELIPE DOS SANTOS GATO',
  cpf: '12345678910',
  protheusDeptCode: '0001400',
  protheusDeptName: 'TI - DIORGNY',
  costCenterCode: '07.01.08.07.001',
  costCenterDescription: 'TECNOLOGIA DA INFORMACAO',
  roleCode: '33098',
  roleDescription: 'ASSISTENTE TECNICO - TI',
};

const usuarioPendente = {
  id: EU,
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

function cookie() {
  const token = signAccessToken({
    sub: EU,
    username: 'igor.fellipe',
    name: 'igor.fellipe',
    role: 'USER',
    hubId: null,
    curatorOf: [],
  });
  return [`access_token=${token}`];
}

const concluir = (body = CADASTRO) =>
  request(app).post('/api/onboarding/complete').set('Cookie', cookie()).send(body);

/** Erro de índice único, do jeito que o Prisma o entrega. */
const conflitoEm = (campo) => Object.assign(new Error('unique'), { code: 'P2002', meta: { target: [campo] } });

beforeEach(() => {
  vi.clearAllMocks();
  sessionStore.set(EU, 'protheus-token');

  protheus.buscarFuncionarioPorCpf.mockResolvedValue([funcionario]);
  protheus.extrairDadosDoFuncionario.mockReturnValue(dadosExtraidos);
  protheus.rotuloDoDepartamento.mockImplementation((nome) => nome?.split(' - ')[0] ?? null);

  prisma.user.findUnique.mockImplementation(async ({ where }) =>
    where.id === EU ? usuarioPendente : null,
  );
  prisma.deptMapping.findUnique.mockResolvedValue(null);
  prisma.hub.findUnique.mockResolvedValue(null);
  prisma.hub.count.mockResolvedValue(5);
  prisma.hub.create.mockResolvedValue({ id: HUB_TI, slug: 'tecnologia-da-informacao', name: 'Tecnologia da Informacao' });
  prisma.deptMapping.create.mockResolvedValue({ id: 'map-1' });
  prisma.hubCurator.create.mockResolvedValue({ userId: EU, hubId: HUB_TI });
  prisma.auditLog.create.mockResolvedValue({ id: 'audit-1' });
  prisma.refreshToken.create.mockImplementation(async ({ data }) => ({ id: 'refresh-1', ...data }));
  prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });
  prisma.user.update.mockResolvedValue({
    ...usuarioPendente,
    ...dadosExtraidos,
    empresaId: '07',
    filialId: '01',
    hubId: HUB_TI,
    hub: { id: HUB_TI, slug: 'tecnologia-da-informacao', name: 'Tecnologia da Informacao' },
    onboardingCompletedAt: new Date(),
    curatorships: [{ hubId: HUB_TI }],
  });
});

describe('POST /api/onboarding/complete', () => {
  it('exige sessão', async () => {
    const response = await request(app).post('/api/onboarding/complete').send(CADASTRO);
    expect(response.status).toBe(401);
  });

  it('consulta a SRA com o CPF informado, na empresa e filial escolhidas', async () => {
    await concluir();

    expect(protheus.buscarFuncionarioPorCpf).toHaveBeenCalledWith('protheus-token', '12345678910', {
      companyId: '07',
      branchId: '01',
    });
  });

  it('devolve o cadastro completo e uma sessão nova', async () => {
    const response = await concluir();

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({
      name: 'IGOR FELIPE DOS SANTOS GATO',
      department: 'TI',
      cargo: 'ASSISTENTE TECNICO - TI',
      hubSlug: 'tecnologia-da-informacao',
      onboardingCompleted: true,
      curatorOf: [HUB_TI],
    });
    expect(response.headers['set-cookie'].join()).toContain('access_token=');
  });

  it('grava a empresa e a filial que a pessoa escolheu, não as do registro do Protheus', async () => {
    await concluir({ ...CADASTRO, companyId: '23', branchId: '01' });

    const [{ data }] = prisma.user.update.mock.calls[0];
    expect(data).toMatchObject({ empresaId: '23', filialId: '01' });
  });
});

describe('primeira pessoa de um setor', () => {
  it('cria o hub com o nome do centro de custo', async () => {
    await concluir();

    expect(prisma.hub.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Tecnologia da Informacao',
          slug: 'tecnologia-da-informacao',
          costCenterCode: '07.01.08.07.001',
        }),
      }),
    );
  });

  it('amarra o hub ao código do departamento, não ao centro de custo', async () => {
    await concluir();

    expect(prisma.deptMapping.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ protheusDeptCode: '0001400', hubId: HUB_TI }),
      }),
    );
  });

  it('torna quem chegou primeiro curador do setor', async () => {
    await concluir();

    expect(prisma.hubCurator.create).toHaveBeenCalledWith({
      data: { userId: EU, hubId: HUB_TI },
    });
  });

  it('desvia o slug quando o endereço já está ocupado', async () => {
    prisma.hub.findUnique.mockImplementation(async ({ where }) =>
      where.slug === 'tecnologia-da-informacao' ? { id: 'outro-hub' } : null,
    );

    await concluir();

    expect(prisma.hub.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ slug: 'tecnologia-da-informacao-0001400' }),
      }),
    );
  });
});

describe('demais pessoas do mesmo setor', () => {
  beforeEach(() => {
    prisma.deptMapping.findUnique.mockResolvedValue({ hubId: HUB_TI });
    prisma.user.update.mockResolvedValue({
      ...usuarioPendente,
      ...dadosExtraidos,
      hubId: HUB_TI,
      hub: { id: HUB_TI, slug: 'ti', name: 'Tecnologia da Informacao' },
      onboardingCompletedAt: new Date(),
      curatorships: [],
    });
  });

  it('entra no hub que já existe, sem criar outro', async () => {
    const response = await concluir();

    expect(response.status).toBe(200);
    expect(prisma.hub.create).not.toHaveBeenCalled();
    expect(prisma.deptMapping.create).not.toHaveBeenCalled();
  });

  it('entra como membro comum, sem curadoria', async () => {
    const response = await concluir();

    expect(prisma.hubCurator.create).not.toHaveBeenCalled();
    expect(response.body.user.curatorOf).toEqual([]);
  });
});

describe('quando o cadastro não pode ser concluído', () => {
  it('recusa quem já concluiu — não dá para refazer o vínculo por fora', async () => {
    prisma.user.findUnique.mockResolvedValue({
      ...usuarioPendente,
      onboardingCompletedAt: new Date(),
    });

    const response = await concluir();

    expect(response.status).toBe(409);
    expect(protheus.buscarFuncionarioPorCpf).not.toHaveBeenCalled();
  });

  it('pede novo login quando a sessão com o Protheus expirou', async () => {
    sessionStore.del(EU);

    const response = await concluir();

    expect(response.status).toBe(401);
    expect(response.body.message).toMatch(/Protheus expirou/);
  });

  it('avisa quando o CPF não é de funcionário ativo daquela empresa', async () => {
    protheus.buscarFuncionarioPorCpf.mockResolvedValue([]);

    const response = await concluir();

    expect(response.status).toBe(404);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('recusa CPF já vinculado a outra conta', async () => {
    prisma.user.findUnique.mockImplementation(async ({ where }) => {
      if (where.id === EU) return usuarioPendente;
      if (where.cpf === '12345678910') return { id: OUTRA_PESSOA };
      return null;
    });

    const response = await concluir();

    expect(response.status).toBe(409);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it.each([
    ['CPF com menos de 11 dígitos', { ...CADASTRO, cpf: '1234' }],
    ['empresa fora do formato', { ...CADASTRO, companyId: '7' }],
    ['filial vazia', { ...CADASTRO, branchId: '' }],
  ])('recusa %s antes de falar com o Protheus', async (_, body) => {
    const response = await concluir(body);

    expect(response.status).toBe(400);
    expect(protheus.buscarFuncionarioPorCpf).not.toHaveBeenCalled();
  });

  it('conclui sem setor quando a SRA não traz o departamento', async () => {
    protheus.extrairDadosDoFuncionario.mockReturnValue({
      ...dadosExtraidos,
      protheusDeptCode: null,
    });
    prisma.user.update.mockResolvedValue({
      ...usuarioPendente,
      onboardingCompletedAt: new Date(),
      curatorships: [],
    });

    const response = await concluir();

    expect(response.status).toBe(200);
    expect(prisma.hub.create).not.toHaveBeenCalled();
    expect(response.body.user.hubId).toBeNull();
  });
});

describe('duas pessoas do mesmo setor concluindo ao mesmo tempo', () => {
  it('repete a transação e aproveita o hub que a outra criou', async () => {
    // A primeira volta encontra o caminho livre e esbarra no índice único; na
    // segunda, o mapeamento da outra pessoa já está lá.
    prisma.deptMapping.create
      .mockRejectedValueOnce(conflitoEm('protheusDeptCode'))
      .mockResolvedValue({ id: 'map-1' });
    prisma.deptMapping.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValue({ hubId: HUB_TI });

    const response = await concluir();

    expect(response.status).toBe(200);
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(prisma.user.update).toHaveBeenCalled();
  });

  it('traduz a corrida no CPF em mensagem de conflito, não em erro genérico', async () => {
    prisma.user.update.mockRejectedValue(conflitoEm('cpf'));

    const response = await concluir();

    expect(response.status).toBe(409);
    expect(response.body.message).toMatch(/CPF/);
  });
});

describe('token do Protheus', () => {
  it('é descartado assim que o cadastro conclui', async () => {
    await concluir();

    expect(sessionStore.get(EU)).toBeNull();
  });

  it('nunca aparece na resposta', async () => {
    const response = await concluir();

    expect(JSON.stringify(response.body)).not.toContain('protheus-token');
    expect(response.headers['set-cookie'].join()).not.toContain('protheus-token');
  });

  it('continua guardado quando a conclusão falha, para a pessoa tentar de novo', async () => {
    protheus.buscarFuncionarioPorCpf.mockResolvedValue([]);

    await concluir();

    expect(sessionStore.get(EU)).toBe('protheus-token');
  });
});
