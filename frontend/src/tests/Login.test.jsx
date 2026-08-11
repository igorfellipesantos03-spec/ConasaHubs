import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const login = vi.fn();
let estadoDaAutenticacao = { user: null, carregando: false, login };

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => estadoDaAutenticacao,
}));

const { default: Login } = await import('../pages/Login');

function renderizar() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );
}

async function preencherEEnviar() {
  await userEvent.type(screen.getByLabelText('Usuário'), 'igor.fellipe');
  await userEvent.type(screen.getByLabelText('Senha'), 'senha');
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
}

beforeEach(() => {
  login.mockReset();
  estadoDaAutenticacao = { user: null, carregando: false, login };
});

describe('Login', () => {
  it('deixa o botão desabilitado até usuário e senha serem preenchidos', async () => {
    renderizar();

    const botao = screen.getByRole('button', { name: 'Entrar' });
    expect(botao).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Usuário'), 'igor.fellipe');
    expect(botao).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Senha'), 'senha');
    expect(botao).toBeEnabled();
  });

  it('envia as credenciais informadas', async () => {
    login.mockResolvedValue({});
    renderizar();

    await preencherEEnviar();

    expect(login).toHaveBeenCalledWith('igor.fellipe', 'senha');
  });

  it('mostra a mensagem da API quando a credencial está errada', async () => {
    login.mockRejectedValue({
      response: { status: 401, data: { message: 'Usuário ou senha incorretos.' } },
    });
    renderizar();

    await preencherEEnviar();

    expect(await screen.findByRole('alert')).toHaveTextContent('Usuário ou senha incorretos.');
  });

  it('distingue a queda do Protheus de uma senha errada', async () => {
    login.mockRejectedValue({ response: { status: 502, data: {} } });
    renderizar();

    await preencherEEnviar();

    const aviso = await screen.findByRole('alert');
    expect(aviso).toHaveTextContent(/Protheus está fora do ar/);
    expect(aviso).not.toHaveTextContent(/senha incorret/i);
  });

  it('libera o formulário para nova tentativa depois do erro', async () => {
    login.mockRejectedValue({ response: { status: 401, data: {} } });
    renderizar();

    await preencherEEnviar();
    await screen.findByRole('alert');

    expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled();
  });
});
