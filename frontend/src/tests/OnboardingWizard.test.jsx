import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const post = vi.fn();
vi.mock('../services/api', () => ({
  api: { post },
  errorMessage: (erro, reserva) => erro?.response?.data?.message ?? reserva,
}));

const atualizarUsuario = vi.fn();
let usuario = { id: 'u1', name: 'igor.fellipe', onboardingCompleted: false, curatorOf: [] };

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: usuario, atualizarUsuario }),
}));

const { OnboardingWizard } = await import('../features/onboarding/OnboardingWizard');

const CPF_VALIDO = '529.982.247-25';

function renderizar() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <OnboardingWizard />
    </QueryClientProvider>,
  );
}

/** Vai da primeira tela até o campo de CPF, escolhendo a empresa informada. */
async function avancarAteCpf(empresa = '07') {
  await userEvent.selectOptions(screen.getByLabelText('Empresa'), empresa);
  await userEvent.click(screen.getByRole('button', { name: /Continuar/ }));
}

beforeEach(() => {
  vi.clearAllMocks();
  usuario = { id: 'u1', name: 'igor.fellipe', onboardingCompleted: false, curatorOf: [] };
  post.mockResolvedValue({ data: { user: { ...usuario, onboardingCompleted: true } } });
});

describe('OnboardingWizard', () => {
  it('não deixa a pessoa escapar do cadastro pela metade', () => {
    renderizar();

    expect(screen.queryByRole('button', { name: 'Fechar' })).not.toBeInTheDocument();
  });

  it('assume a filial única nas empresas que só têm uma', async () => {
    renderizar();

    expect(screen.getByText(/a única desta empresa/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Filial')).not.toBeInTheDocument();
  });

  it.each([
    ['31', 'Urbeluz'],
    ['43', 'BR163'],
  ])('pede a filial na empresa %s, que tem mais de uma', async (empresa) => {
    renderizar();

    await userEvent.selectOptions(screen.getByLabelText('Empresa'), empresa);

    expect(screen.getByLabelText('Filial')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continuar/ })).toBeDisabled();
  });

  it('só libera prosseguir com um CPF válido', async () => {
    renderizar();
    await avancarAteCpf();

    const prosseguir = screen.getByRole('button', { name: /Prosseguir/ });
    expect(prosseguir).toBeDisabled();

    await userEvent.type(screen.getByLabelText('CPF'), '529.982.247-24'); // dígito errado
    expect(prosseguir).toBeDisabled();

    await userEvent.clear(screen.getByLabelText('CPF'));
    await userEvent.type(screen.getByLabelText('CPF'), CPF_VALIDO);
    expect(prosseguir).toBeEnabled();
  });

  it('envia empresa, filial e CPF sem máscara', async () => {
    renderizar();
    await avancarAteCpf('23');
    await userEvent.type(screen.getByLabelText('CPF'), CPF_VALIDO);
    await userEvent.click(screen.getByRole('button', { name: /Prosseguir/ }));

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith('/onboarding/complete', {
        companyId: '23',
        branchId: '01',
        cpf: '52998224725',
      }),
    );
  });

  it('mostra o carregamento enquanto consulta o Protheus', async () => {
    let concluir;
    post.mockReturnValue(new Promise((resolve) => { concluir = resolve; }));

    renderizar();
    await avancarAteCpf();
    await userEvent.type(screen.getByLabelText('CPF'), CPF_VALIDO);
    await userEvent.click(screen.getByRole('button', { name: /Prosseguir/ }));

    expect(await screen.findByText(/Consultando seus dados no Protheus/)).toBeInTheDocument();

    concluir({ data: { user: { ...usuario, onboardingCompleted: true } } });
  });

  /**
   * Entregar o usuário completo ao contexto tira o wizard da tela — quem
   * decide a hora disso é o clique no X, não a resposta da API. Segurar essa
   * ordem é o que mantém as boas-vindas visíveis.
   */
  it('só entrega o usuário ao contexto quando a pessoa fecha as boas-vindas', async () => {
    const completo = {
      ...usuario,
      name: 'IGOR FELIPE DOS SANTOS GATO',
      hubId: 'hub-ti',
      hubName: 'Tecnologia da Informacao',
      onboardingCompleted: true,
      curatorOf: ['hub-ti'],
    };
    post.mockResolvedValue({ data: { user: completo } });

    renderizar();
    await avancarAteCpf();
    await userEvent.type(screen.getByLabelText('CPF', { exact: true }), CPF_VALIDO);
    await userEvent.click(screen.getByRole('button', { name: /Prosseguir/ }));

    expect(await screen.findByText('Bem-vindo ao CentralHub')).toBeInTheDocument();
    expect(atualizarUsuario).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Fechar' }));

    expect(atualizarUsuario).toHaveBeenCalledWith(completo);
  });

  it('avisa quem virou responsável pelo setor recém-criado', async () => {
    post.mockResolvedValue({
      data: {
        user: { ...usuario, hubId: 'hub-ti', hubName: 'Tecnologia da Informacao', curatorOf: ['hub-ti'] },
      },
    });

    renderizar();
    await avancarAteCpf();
    await userEvent.type(screen.getByLabelText('CPF', { exact: true }), CPF_VALIDO);
    await userEvent.click(screen.getByRole('button', { name: /Prosseguir/ }));

    expect(await screen.findByText(/ficou responsável por ele/)).toBeInTheDocument();
  });

  it('não promete responsabilidade a quem entrou num setor que já existia', async () => {
    post.mockResolvedValue({
      data: {
        user: { ...usuario, hubId: 'hub-ti', hubName: 'Tecnologia da Informacao', curatorOf: [] },
      },
    });

    renderizar();
    await avancarAteCpf();
    await userEvent.type(screen.getByLabelText('CPF', { exact: true }), CPF_VALIDO);
    await userEvent.click(screen.getByRole('button', { name: /Prosseguir/ }));

    expect(await screen.findByText(/já pode adicionar links/)).toBeInTheDocument();
    expect(screen.queryByText(/ficou responsável por ele/)).not.toBeInTheDocument();
  });

  it('volta para o CPF com a mensagem da API quando o cadastro não é encontrado', async () => {
    post.mockRejectedValue({
      response: { status: 404, data: { message: 'Não encontramos esse CPF como funcionário ativo.' } },
    });

    renderizar();
    await avancarAteCpf();
    await userEvent.type(screen.getByLabelText('CPF'), CPF_VALIDO);
    await userEvent.click(screen.getByRole('button', { name: /Prosseguir/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não encontramos esse CPF como funcionário ativo.',
    );
    expect(screen.getByLabelText('CPF')).toHaveValue(CPF_VALIDO);
  });

  it('deixa voltar para corrigir a empresa', async () => {
    renderizar();
    await avancarAteCpf();

    await userEvent.click(screen.getByRole('button', { name: 'Voltar' }));

    expect(screen.getByLabelText('Empresa')).toBeInTheDocument();
  });
});
