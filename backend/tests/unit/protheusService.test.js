import { describe, it, expect, vi, beforeEach } from 'vitest';

const post = vi.fn();
const get = vi.fn();

vi.mock('axios', () => ({
  default: { create: () => ({ post, get }) },
}));

const { autenticar, buscarFuncionarioPorCpf, extrairDadosDoFuncionario, rotuloDoDepartamento } =
  await import('../../src/services/protheusService.js');

const httpError = (status) => Object.assign(new Error('falha'), { response: { status } });

beforeEach(() => {
  post.mockReset();
  get.mockReset();
});

describe('autenticar', () => {
  it('devolve o access_token quando o Protheus aceita as credenciais', async () => {
    post.mockResolvedValue({ data: { access_token: 'token-123', expires_in: 3600 } });

    await expect(autenticar('usuario.conasa', 'senha')).resolves.toEqual({
      accessToken: 'token-123',
      expiresIn: 3600,
    });

    const [url, body, config] = post.mock.calls[0];
    expect(url).toContain('grant_type=password');
    expect(body.toString()).toBe('username=usuario.conasa&password=senha');
    expect(config.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
  });

  it.each([401, 403])('traduz %i do Protheus em 401 de credencial inválida', async (status) => {
    post.mockRejectedValue(httpError(status));

    await expect(autenticar('usuario', 'errada')).rejects.toMatchObject({
      status: 401,
      message: 'Usuário ou senha incorretos.',
      code: 'INVALID_CREDENTIALS',
    });
  });

  it.each([500, 503])('traduz %i do Protheus em 502', async (status) => {
    post.mockRejectedValue(httpError(status));

    await expect(autenticar('usuario', 'senha')).rejects.toMatchObject({
      status: 502,
      code: 'PROTHEUS_UNAVAILABLE',
    });
  });

  it('trata timeout de rede como indisponibilidade (502)', async () => {
    post.mockRejectedValue(Object.assign(new Error('timeout'), { code: 'ECONNABORTED' }));

    await expect(autenticar('usuario', 'senha')).rejects.toMatchObject({ status: 502 });
  });

  it('rejeita resposta 200 sem access_token', async () => {
    post.mockResolvedValue({ data: {} });

    await expect(autenticar('usuario', 'senha')).rejects.toMatchObject({ status: 502 });
  });
});

describe('buscarFuncionarioPorCpf', () => {
  it('filtra pelo CPF e descarta quem já foi desligado', async () => {
    get.mockResolvedValue({ data: { items: [{ name: 'FULANO', RA_CIC: '12345678900' }] } });

    const encontrados = await buscarFuncionarioPorCpf('token', '12345678900', {
      companyId: '07',
      branchId: '01',
    });

    expect(encontrados).toMatchObject([{ name: 'FULANO' }]);
    expect(get.mock.calls[0][1].params.filter).toBe(
      "RA_CIC LIKE '12345678900%' AND RA_DEMISSA = ''",
    );
  });

  it('consulta a empresa e a filial que o usuário escolheu', async () => {
    get.mockResolvedValue({ data: [] });

    await buscarFuncionarioPorCpf('token', '12345678900', { companyId: '43', branchId: '0007' });

    const [, config] = get.mock.calls[0];
    expect(config.headers.tenantId).toBe('43,0007');
    expect(config.params).toMatchObject({ companyId: '43', branchId: '0007' });
  });

  it('cai na empresa e filial padrão quando nenhuma é informada', async () => {
    get.mockResolvedValue({ data: [] });

    await buscarFuncionarioPorCpf('token', '12345678900');

    expect(get.mock.calls[0][1].headers.tenantId).toBe('07,01');
  });

  it('pede o cargo junto dos demais campos cadastrais', async () => {
    get.mockResolvedValue({ data: [] });

    await buscarFuncionarioPorCpf('token', '12345678900');

    expect(get.mock.calls[0][1].params.fields).toContain('roleCode,roleDescription');
  });

  it('não deixa o CPF digitado injetar conteúdo na expressão de filtro', async () => {
    get.mockResolvedValue({ data: [] });

    await buscarFuncionarioPorCpf('token', "123.456' OR '1'='1");

    expect(get.mock.calls[0][1].params.filter).toBe("RA_CIC LIKE '12345611%' AND RA_DEMISSA = ''");
  });

  it('devolve null — sem lançar — quando a consulta falha', async () => {
    get.mockRejectedValue(httpError(500));

    await expect(buscarFuncionarioPorCpf('token', '12345678900')).resolves.toBeNull();
  });
});

describe('extrairDadosDoFuncionario', () => {
  it('limpa o espaçamento que a SRA devolve nos campos de código', () => {
    const dados = extrairDadosDoFuncionario({
      name: 'IGOR FELIPE DOS SANTOS GATO',
      cpf: '123.456.789-10',
      departamentCode: '0001400',
      departmentDescription: 'TI - DIORGNY',
      costCenterCode: '07.01.08.07.001     ',
      costCenterDescription: 'TECNOLOGIA DA INFORMACAO',
      roleCode: '33098',
      roleDescription: 'ASSISTENTE TECNICO - TI',
    });

    expect(dados).toEqual({
      name: 'IGOR FELIPE DOS SANTOS GATO',
      cpf: '12345678910',
      protheusDeptCode: '0001400',
      protheusDeptName: 'TI - DIORGNY',
      costCenterCode: '07.01.08.07.001',
      costCenterDescription: 'TECNOLOGIA DA INFORMACAO',
      roleCode: '33098',
      roleDescription: 'ASSISTENTE TECNICO - TI',
    });
  });

  it('aceita RA_CIC quando o registro não traz o campo cpf', () => {
    expect(extrairDadosDoFuncionario({ RA_CIC: '98765432100' })).toMatchObject({
      cpf: '98765432100',
    });
  });

  it('devolve null no lugar de campo vazio, para não gravar string em branco', () => {
    expect(extrairDadosDoFuncionario({ name: '   ', roleDescription: '' })).toMatchObject({
      name: null,
      roleDescription: null,
      cpf: null,
    });
  });
});

describe('rotuloDoDepartamento', () => {
  it('descarta o nome do gestor que vem depois do hífen', () => {
    expect(rotuloDoDepartamento('TI - DIORGNY')).toBe('TI');
  });

  it('mantém o nome inteiro quando não há hífen', () => {
    expect(rotuloDoDepartamento('RECURSOS HUMANOS')).toBe('RECURSOS HUMANOS');
  });

  it('devolve null para departamento ausente', () => {
    expect(rotuloDoDepartamento(null)).toBeNull();
  });
});
