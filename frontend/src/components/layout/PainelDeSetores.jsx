import { useEffect, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ArrowRight, LayoutGrid, LogOut, Search, Settings, Star, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useHubs } from '../../hooks/useHubs';
import { Icon } from '../ui/Icon';
import { Logo } from '../ui/Logo';
import { corNoEscuro, normalizar } from '../../utils/texto';

/**
 * Painel de setores da home orbital, aberto pela marca no canto superior
 * esquerdo. Fica no tema escuro porque a home é escura — o menu claro do
 * AppShell continua servindo às páginas internas.
 *
 * O caminho curto — ir para o hub do próprio setor — abre o painel: é o que a
 * maioria das pessoas quer, e a lista completa vem logo abaixo.
 */
export function PainelDeSetores({ aberto, aoFechar }) {
  const { user, logout, ehAdmin } = useAuth();
  const { data: hubs = [] } = useHubs();
  const [busca, setBusca] = useState('');
  const painel = useRef(null);

  // Esc fecha, e o foco entra no painel para o teclado não continuar preso na
  // tela de trás.
  useEffect(() => {
    if (!aberto) return undefined;

    painel.current?.focus();
    const aoTeclar = (evento) => {
      if (evento.key === 'Escape') aoFechar();
    };

    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [aberto, aoFechar]);

  // Fechado, o painel some da árvore: nada de estado velho quando reabrir.
  useEffect(() => {
    if (!aberto) setBusca('');
  }, [aberto]);

  if (!aberto) return null;

  const termo = normalizar(busca);
  const encontrados = termo
    ? hubs.filter((hub) => normalizar(`${hub.name} ${hub.description ?? ''}`).includes(termo))
    : hubs;

  const meuSetor = hubs.find((hub) => hub.id === user?.hubId);

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Fechar o painel de setores"
        onClick={aoFechar}
        className="animate-surgir absolute inset-0 h-full w-full cursor-default bg-night/70 backdrop-blur-[3px]"
      />

      <aside
        ref={painel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Setores do CentralHub"
        className="animate-deslizar absolute inset-y-0 left-0 flex w-[330px] max-w-[86vw] flex-col border-r border-white/10 bg-deep/95 shadow-[0_0_80px_-10px_rgba(0,0,0,0.9)] backdrop-blur-xl focus:outline-none"
      >
        <header className="flex items-center gap-2.5 border-b border-white/10 px-5 py-4">
          <Logo className="h-9 w-9" />
          <span className="text-[17px] font-extrabold tracking-tight text-white">
            Central<span className="text-tech">Hub</span>
          </span>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="ml-auto rounded-xl p-1.5 text-white/45 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-5 py-5">
          <label className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 transition-colors focus-within:border-tech/60 focus-within:bg-white/[0.07]">
            <Search className="h-[17px] w-[17px] shrink-0 text-white/40" aria-hidden="true" />
            <span className="sr-only">Buscar setor</span>
            <input
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
              placeholder="Buscar setor"
              className="w-full bg-transparent text-[14px] text-white placeholder:text-white/35 focus:outline-none"
            />
          </label>

          {meuSetor && (
            <section>
              <p className="pb-2 text-[12px] font-semibold text-white/45">Meu setor</p>
              <Link
                to={`/setor/${meuSetor.slug}`}
                onClick={aoFechar}
                className="group flex items-center gap-3 rounded-2xl border border-tech/35 bg-tech/[0.08] px-3.5 py-3 transition-colors hover:border-tech/70 hover:bg-tech/15"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-tech/15 text-tech">
                  <Icon name={meuSetor.icon} className="h-[22px] w-[22px]" />
                </span>
                <span className="min-w-0 flex-1">
                  {/* Sem `truncate`: "Tecnologia da Informação" é o nome mais
                      longo do cadastro e este é o atalho principal do painel. */}
                  <span className="block text-[14.5px] font-bold leading-tight text-white">
                    {meuSetor.name}
                  </span>
                  <span className="block text-[12px] text-white/50">
                    {meuSetor.linkCount} {meuSetor.linkCount === 1 ? 'link' : 'links'}
                    {meuSetor.canEdit && ' · você é curador'}
                  </span>
                </span>
                <ArrowRight className="h-[18px] w-[18px] shrink-0 text-tech transition-transform group-hover:translate-x-0.5" />
              </Link>
            </section>
          )}

          <section>
            <p className="pb-2 text-[12px] font-semibold text-white/45">
              {termo ? 'Resultados' : 'Todos os setores'}
            </p>

            {encontrados.length === 0 ? (
              <p className="px-1 py-3 text-[13px] text-white/45">
                Nenhum setor com esse nome.
              </p>
            ) : (
              <ul className="space-y-0.5">
                {encontrados.map((hub) => (
                  <li key={hub.id}>
                    <ItemDeSetor hub={hub} aoNavegar={aoFechar} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <p className="pb-2 text-[12px] font-semibold text-white/45">Atalhos</p>
            <Atalho
              to="/favoritos"
              aoNavegar={aoFechar}
              icone={<Star className="h-[18px] w-[18px]" />}
              rotulo="Meus favoritos"
            />
            <Atalho
              to="/setores"
              aoNavegar={aoFechar}
              icone={<LayoutGrid className="h-[18px] w-[18px]" />}
              rotulo="Ver setores em lista"
            />
            {ehAdmin && (
              <Atalho
                to="/admin"
                aoNavegar={aoFechar}
                icone={<Settings className="h-[18px] w-[18px]" />}
                rotulo="Administração"
              />
            )}
          </section>
        </div>

        <footer className="flex items-center gap-3 border-t border-white/10 px-5 py-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tech/15 text-[12px] font-bold text-tech-100">
            {iniciais(user?.name)}
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-[13px] font-semibold text-white">
              {user?.name}
            </span>
            <span className="block truncate text-[11.5px] text-white/45">
              {user?.hubName ?? 'Sem setor'}
            </span>
          </span>
          <button
            type="button"
            onClick={logout}
            className="flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-[13px] font-medium text-white/50 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-[17px] w-[17px]" />
            Sair
          </button>
        </footer>
      </aside>
    </div>
  );
}

function ItemDeSetor({ hub, aoNavegar }) {
  return (
    <NavLink
      to={`/setor/${hub.slug}`}
      onClick={aoNavegar}
      className={({ isActive }) =>
        `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] transition-colors ${
          isActive ? 'bg-white/10 font-semibold text-white' : 'font-medium text-white/75 hover:bg-white/[0.07] hover:text-white'
        }`
      }
    >
      <Icon name={hub.icon} className="h-[18px] w-[18px] shrink-0" style={{ color: corNoEscuro(hub.color) }} />
      <span className="min-w-0 flex-1 truncate">{hub.name}</span>
      {hub.isMine ? (
        <span className="pill bg-tech/20 text-tech-100">seu</span>
      ) : (
        <span className="text-[12px] font-semibold text-white/35">{hub.linkCount}</span>
      )}
    </NavLink>
  );
}

function Atalho({ to, icone, rotulo, aoNavegar }) {
  return (
    <NavLink
      to={to}
      onClick={aoNavegar}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] transition-colors ${
          isActive ? 'bg-white/10 font-semibold text-white' : 'font-medium text-white/75 hover:bg-white/[0.07] hover:text-white'
        }`
      }
    >
      <span className="text-white/45">{icone}</span>
      {rotulo}
    </NavLink>
  );
}

function iniciais(nome) {
  return (nome ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toUpperCase();
}
