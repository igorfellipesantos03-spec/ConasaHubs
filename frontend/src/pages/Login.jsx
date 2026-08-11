import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Field';
import { AvisoDeErro, CarregandoPagina, Spinner } from '../components/ui/Feedback';
import { errorMessage } from '../services/api';

export default function Login() {
  const { user, carregando, login } = useAuth();
  const { state } = useLocation();
  const [credenciais, setCredenciais] = useState({ username: '', password: '' });
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  if (carregando) return <CarregandoPagina rotulo="Verificando sua sessão" />;
  if (user) return <Navigate to={state?.de ?? '/'} replace />;

  async function entrar(evento) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);

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
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <PainelInstitucional />

      <div className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="lg:hidden">
            <p className="plate-label text-tech">Conasa</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-ink">
              Central<span className="text-tech">Hub</span>
            </p>
          </div>

          <h1 className="mt-6 text-xl font-semibold text-graphite lg:mt-0">Entrar</h1>
          <p className="mt-1 text-sm text-muted">
            Use o mesmo usuário e senha do Protheus.
          </p>

          <form onSubmit={entrar} className="mt-6 space-y-4" noValidate>
            {erro && <AvisoDeErro>{erro}</AvisoDeErro>}

            <Input
              label="Usuário"
              name="username"
              autoComplete="username"
              autoFocus
              required
              value={credenciais.username}
              onChange={atualizar('username')}
              placeholder="nome.sobrenome"
            />

            <Input
              label="Senha"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={credenciais.password}
              onChange={atualizar('password')}
            />

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={enviando || !credenciais.username || !credenciais.password}
            >
              {enviando ? (
                <>
                  <Spinner className="h-4 w-4" /> Entrando
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>

          <p className="mt-6 text-sm text-muted">
            Esqueceu a senha? Ela é a mesma do Protheus — fale com a TI para redefinir.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Painel institucional: o azul da Conasa ocupando a maior parte da tela, com a
 * mesma leitura de fluxo da marca desenhada em grande escala.
 */
function PainelInstitucional() {
  return (
    <div className="relative hidden flex-col justify-between overflow-hidden bg-ink px-12 py-14 text-white lg:flex">
      <svg
        aria-hidden="true"
        viewBox="0 0 400 400"
        className="pointer-events-none absolute -bottom-24 -right-24 h-[520px] w-[520px] opacity-[0.16]"
      >
        {[0, 1, 2, 3].map((indice) => (
          <path
            key={indice}
            d={`M-40 ${250 + indice * 46}c70 0 70-92 160-92s90 92 160 92`}
            fill="none"
            stroke="#00A8CC"
            strokeWidth="2"
          />
        ))}
        <circle cx="200" cy="200" r="182" fill="none" stroke="#00A8CC" strokeWidth="2" />
      </svg>

      <div className="relative">
        <p className="plate-label text-tech">Conasa</p>
        <p className="mt-2 text-3xl font-semibold tracking-tight">
          Central<span className="text-tech">Hub</span>
        </p>
      </div>

      <div className="relative max-w-md">
        <h2 className="text-2xl font-semibold leading-snug tracking-tight">
          Todos os sistemas da empresa, organizados por setor.
        </h2>
        <p className="mt-3 text-white/70">
          Protheus, documentações, automações e o que mais a sua equipe usa no dia a dia — em um
          endereço só, mantido por quem trabalha nele.
        </p>
      </div>

      <p className="plate-label relative text-white/40">Acesso restrito a colaboradores</p>
    </div>
  );
}
