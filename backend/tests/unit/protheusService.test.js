import { describe, it, expect, vi, beforeEach } from 'vitest';

const post = vi.fn();
const get = vi.fn();

vi.mock('axios', () => ({
  default: { create: () => ({ post, get }) },
}));

const { autenticar, buscarFuncionarioDoUsuario } = await import(
  '../../src/services/protheusService.js'
);

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

describe('buscarFuncionarioDoUsuario', () => {
  it('busca por CPF quando o login é um CPF', async () => {
    get.mockResolvedValue({ data: { items: [{ name: 'FULANO', RA_CIC: '12345678900' }] } });

    const funcionario = await buscarFuncionarioDoUsuario('token', '123.456.789-00');

    expect(funcionario).toMatchObject({ name: 'FULANO' });
    expect(get.mock.calls[0][1].params.filter).toBe("RA_CIC = '12345678900'");
  });

  it('busca pelo primeiro nome quando o login é nome.sobrenome', async () => {
    get.mockResolvedValue({ data: [{ name: 'IGOR FELLIPE SANTOS' }] });

    const funcionario = await buscarFuncionarioDoUsuario('token', 'igor.fellipe');

    expect(funcionario).toMatchObject({ name: 'IGOR FELLIPE SANTOS' });
    expect(get.mock.calls[0][1].params.filter).toBe("UPPER(RA_NOME) LIKE 'IGOR%'");
  });

  it('desempata homônimos usando todas as partes do login', async () => {
    get.mockResolvedValue({
      data: [{ name: 'IGOR SOUZA' }, { name: 'IGOR FELLIPE SANTOS' }],
    });

    await expect(buscarFuncionarioDoUsuario('token', 'igor.fellipe')).resolves.toMatchObject({
      name: 'IGOR FELLIPE SANTOS',
    });
  });

  it('devolve null quando os homônimos são indistinguíveis', async () => {
    get.mockResolvedValue({ data: [{ name: 'IGOR SOUZA' }, { name: 'IGOR PEREIRA' }] });

    await expect(buscarFuncionarioDoUsuario('token', 'igor.fellipe')).resolves.toBeNull();
  });

  it('devolve null — sem lançar — quando a consulta falha, para não derrubar o login', async () => {
    get.mockRejectedValue(httpError(500));

    await expect(buscarFuncionarioDoUsuario('token', 'igor.fellipe')).resolves.toBeNull();
  });

  it('não deixa o login injetar conteúdo na expressão de filtro', async () => {
    get.mockResolvedValue({ data: [] });

    await buscarFuncionarioDoUsuario('token', "ig'or--.fellipe");

    expect(get.mock.calls[0][1].params.filter).toBe("UPPER(RA_NOME) LIKE 'IGOR%'");
  });
});
