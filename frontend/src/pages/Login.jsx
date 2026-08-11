import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Field';
import { AvisoDeErro, CarregandoPagina, Spinner } from '../components/ui/Feedback';
import { LogoComNome, MarcaDagua } from '../components/ui/Logo';
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
    <div className="grid min-h-screen bg-surface lg:grid-cols-[1.05fr_1fr]">
      <PainelInstitucional />

      <div className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-[380px]">
          <div className="lg:hidden">
            <LogoComNome />
          </div>

          <h1 className="mt-8 text-[28px] font-extrabold text-ink lg:mt-0">Entrar</h1>
          <p className="mt-1.5 text-[15px] text-muted">Use o mesmo usuário e senha do Protheus.</p>

          <form onSubmit={entrar} className="mt-7 space-y-4" noValidate>
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

          <p className="mt-7 text-[13px] leading-relaxed text-muted">
            Esqueceu a senha? Ela é a mesma do Protheus — fale com a TI para redefinir.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Painel institucional: o azul da Conasa com as próprias ondas da marca em
 * escala grande, saindo pela borda inferior.
 */
function PainelInstitucional() {
  return (
    <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-ink via-ink-800 to-ink-700 p-12 text-white lg:flex">
      <MarcaDagua className="absolute -bottom-24 -right-20 h-[560px] w-[560px] opacity-[0.09]" />

      <LogoComNome tom="claro" className="relative" />

      <div className="relative max-w-md">
        <h2 className="text-[34px] font-extrabold leading-[1.15]">
          Todos os sistemas da empresa, organizados por setor.
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-white/65">
          Protheus, documentações, automações e o que mais a sua equipe usa no dia a dia — em um
          endereço só, mantido por quem trabalha nele.
        </p>
      </div>

      <p className="relative text-[13px] font-medium text-white/40">
        Acesso restrito a colaboradores
      </p>
    </div>
  );
}
