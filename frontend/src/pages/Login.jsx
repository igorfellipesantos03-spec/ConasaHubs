import { useId, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AlertCircle, ArrowRight, Eye, EyeOff, Lock, UserRound } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { CarregandoPagina, Spinner } from '../components/ui/Feedback';
import { FundoDeConstelacao } from '../components/ui/FundoDeConstelacao';
import { Logo } from '../components/ui/Logo';
import { NeonCheckbox } from '../components/ui/NeonCheckbox';
import { errorMessage } from '../services/api';

const CHAVE_DO_USUARIO = 'centralhub:usuario';

export default function Login() {
  const { user, carregando, login } = useAuth();
  const { state } = useLocation();
  const [lembrado] = useState(() => localStorage.getItem(CHAVE_DO_USUARIO) ?? '');
  const [credenciais, setCredenciais] = useState({ username: lembrado, password: '' });
  const [lembrar, setLembrar] = useState(Boolean(lembrado));
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  if (carregando) return <CarregandoPagina rotulo="Verificando sua sessão" />;
  if (user) return <Navigate to={state?.de ?? '/'} replace />;

  async function entrar(evento) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);

    if (lembrar) localStorage.setItem(CHAVE_DO_USUARIO, credenciais.username);
    else localStorage.removeItem(CHAVE_DO_USUARIO);

    try {
      await login(credenciais.username, credenciais.password);
    } catch (falha) {
      setErro(
        falha.response?.status === 502
          ? 'O Protheus está fora do ar. Tente novamente em alguns minutos ou avise a TI.'
          : errorMessage(falha, 'Não foi possível entrar. Tente novamente.'),
      );
      setEnviando(false);
    }
  }

  const atualizar = (campo) => (evento) =>
    setCredenciais((atual) => ({ ...atual, [campo]: evento.target.value }));

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-night px-5 py-16">
      <FundoDeConstelacao className="absolute inset-0 h-full w-full" />
      <Halo />

      <main className="relative w-full max-w-[420px]">
        <div className="animate-rise relative overflow-hidden rounded-[28px] border border-white/10 bg-deep/92 px-7 pb-8 pt-14 shadow-[0_40px_90px_-40px_rgba(0,0,0,0.95)] backdrop-blur-xl sm:px-8">
          <Ondas />

          <h1 className="relative text-center text-[26px] font-extrabold tracking-tight text-white">
            Central<span className="text-tech">Hub</span>
          </h1>
          <p className="relative mt-1.5 text-center text-[14px] text-white/55">
            Use o mesmo usuário e senha do Protheus.
          </p>

          <form onSubmit={entrar} className="relative mt-7 space-y-3.5" noValidate>
            {erro && <Aviso>{erro}</Aviso>}

            <Campo
              rotulo="Usuário"
              icone={UserRound}
              name="username"
              autoComplete="username"
              autoFocus
              required
              placeholder="nome.sobrenome"
              value={credenciais.username}
              onChange={atualizar('username')}
            />

            <Campo
              rotulo="Senha"
              icone={Lock}
              name="password"
              type={senhaVisivel ? 'text' : 'password'}
              autoComplete="current-password"
              required
              placeholder="Sua senha do Protheus"
              value={credenciais.password}
              onChange={atualizar('password')}
              acao={
                <button
                  type="button"
                  onClick={() => setSenhaVisivel((visivel) => !visivel)}
                  aria-label={senhaVisivel ? 'Ocultar senha' : 'Mostrar senha'}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white/45 transition-colors hover:bg-white/10 hover:text-white"
                >
                  {senhaVisivel ? (
                    <EyeOff className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
                  ) : (
                    <Eye className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
                  )}
                </button>
              }
            />

            <div className="flex items-center justify-between gap-3 pt-0.5">
              <label className="flex w-fit cursor-pointer select-none items-center gap-2.5 text-[13px] text-white/60 transition-colors hover:text-white/85">
                <NeonCheckbox
                  name="lembrar"
                  checked={lembrar}
                  onChange={(evento) => setLembrar(evento.target.checked)}
                />
                Lembrar usuário
              </label>
            </div>

            <button
              type="submit"
              disabled={enviando || !credenciais.username || !credenciais.password}
              className="flex h-12 w-full items-center justify-center gap-2.5 rounded-full bg-gradient-to-r from-ink-700 via-tech-600 to-tech text-[14px] font-bold uppercase tracking-[0.12em] text-white shadow-[0_14px_30px_-12px_rgba(0,168,204,0.8)] transition-all duration-150 hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:active:scale-100"
            >
              {enviando ? (
                <>
                  <Spinner className="h-4 w-4" /> Entrando
                </>
              ) : (
                <>
                  Entrar
                  <ArrowRight className="h-[18px] w-[18px]" strokeWidth={2.25} aria-hidden="true" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* A marca fica fora do card para poder montar sobre a borda de cima. */}
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
          <Logo
            className="h-[74px] w-[74px] shadow-[0_18px_40px_-18px_rgba(0,0,0,0.9)] ring-[6px] ring-night/80"
            arredondamento="rounded-full"
          />
        </div>

        <p className="relative mt-6 text-center text-[12.5px] text-white/35">
          Acesso restrito a colaboradores da Conasa
        </p>
      </main>
    </div>
  );
}

/** Clarão azul atrás do card: separa o cartão da malha de pontos. */
function Halo() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-1/2 h-[760px] w-[760px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(28,74,134,0.5)_0%,rgba(15,44,89,0.22)_45%,transparent_70%)]"
    />
  );
}

/**
 * As ondas da marca invadindo o card por dois cantos opostos — é o que o
 * laranja fazia no exemplo, aqui no azul institucional.
 */
function Ondas() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <div className="absolute -right-20 -top-20 h-40 w-72 rotate-[18deg] rounded-[50%] bg-gradient-to-br from-tech via-ink-700 to-ink opacity-80 blur-[22px]" />
      <div className="absolute -bottom-20 -left-20 h-36 w-64 rotate-[18deg] rounded-[50%] bg-gradient-to-tr from-tech-600 via-ink-700 to-ink opacity-70 blur-[22px]" />
    </div>
  );
}

/** Campo do formulário no tom escuro do card, com o ícone em selo à esquerda. */
function Campo({ rotulo, icone: Icone, acao, ...rest }) {
  const id = useId();

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-2.5 py-2 transition-colors focus-within:border-tech/60 focus-within:bg-white/[0.07] focus-within:ring-4 focus-within:ring-tech/10">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-tech/15 text-tech">
        <Icone className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
      </span>

      <label htmlFor={id} className="sr-only">
        {rotulo}
      </label>
      <input
        id={id}
        className="w-full bg-transparent text-[15px] text-white placeholder:text-white/35 focus:outline-none"
        {...rest}
      />

      {acao}
    </div>
  );
}

function Aviso({ children }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-2xl border border-danger/30 bg-danger/15 px-3.5 py-3 text-[13.5px] font-medium leading-relaxed text-red-200"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}
