import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { LogOut, Menu, Settings, Star, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useHubs } from '../../hooks/useHubs';
import { Icon } from '../ui/Icon';

export function AppShell({ children }) {
  const [menuAberto, setMenuAberto] = useState(false);
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen">
      <Cabecalho aoAbrirMenu={() => setMenuAberto(true)} />

      <div className="mx-auto flex w-full max-w-[1440px]">
        <Navegacao
          aberta={menuAberto}
          aoFechar={() => setMenuAberto(false)}
          key={pathname} // fecha o menu móvel a cada navegação
        />
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

function Cabecalho({ aoAbrirMenu }) {
  const { user, logout, ehAdmin } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-ink text-white">
      <div className="mx-auto flex h-14 w-full max-w-[1440px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={aoAbrirMenu}
          className="-ml-1 rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Abrir menu de setores"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link to="/" className="flex items-center gap-2.5">
          <Marca />
        </Link>

        <div className="ml-auto flex items-center gap-1">
          {ehAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm transition-colors ${
                  isActive ? 'bg-white/15 text-white' : 'text-white/75 hover:bg-white/10'
                }`
              }
            >
              <Settings className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only">Administração</span>
            </NavLink>
          )}

          <div className="mx-1 hidden text-right sm:block">
            <p className="text-sm font-medium leading-tight">{user?.name}</p>
            <p className="plate-label text-white/55">{user?.hubName ?? 'sem setor'}</p>
          </div>

          <button
            type="button"
            onClick={logout}
            className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm text-white/75 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only">Sair</span>
          </button>
        </div>
      </div>
    </header>
  );
}

/**
 * Marca desenhada em vez de imagem: dois arcos concêntricos (a leitura de fluxo
 * do saneamento) sobre o azul institucional, sem depender de arquivo externo.
 */
function Marca() {
  return (
    <>
      <svg viewBox="0 0 28 28" className="h-7 w-7" aria-hidden="true">
        <circle cx="14" cy="14" r="13" fill="none" stroke="#00A8CC" strokeWidth="2" />
        <path d="M4 18c4 0 4-8 10-8s6 8 10 8" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className="text-[15px] font-semibold tracking-tight">
        Central<span className="text-tech">Hub</span>
      </span>
    </>
  );
}

function Navegacao({ aberta, aoFechar }) {
  const { data: hubs = [] } = useHubs();
  const { user } = useAuth();

  const conteudo = (
    <nav className="flex h-full flex-col gap-6 px-3 py-6">
      <section>
        <p className="plate-label px-2.5 pb-2 text-muted">Atalhos</p>
        <ItemDeMenu to="/favoritos" icone={<Star className="h-4 w-4" />} rotulo="Meus favoritos" />
        <ItemDeMenu to="/setores" icone={<Icon name="LayoutGrid" className="h-4 w-4" />} rotulo="Todos os setores" />
      </section>

      <section>
        <p className="plate-label px-2.5 pb-2 text-muted">Setores</p>
        <ul>
          {hubs.map((hub) => (
            <li key={hub.id}>
              <ItemDeMenu
                to={`/setor/${hub.slug}`}
                icone={<Icon name={hub.icon} className="h-4 w-4" />}
                rotulo={hub.name}
                contagem={hub.linkCount}
                destacado={hub.id === user?.hubId}
              />
            </li>
          ))}
        </ul>
      </section>
    </nav>
  );

  return (
    <>
      <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-64 shrink-0 overflow-y-auto border-r border-hairline bg-surface lg:block">
        {conteudo}
      </aside>

      {aberta && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={aoFechar} />
          <div className="animate-rise absolute inset-y-0 left-0 w-72 overflow-y-auto bg-surface">
            <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
              <span className="font-semibold text-ink">Navegação</span>
              <button type="button" onClick={aoFechar} aria-label="Fechar menu" className="p-1 text-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
            {conteudo}
          </div>
        </div>
      )}
    </>
  );
}

function ItemDeMenu({ to, icone, rotulo, contagem, destacado }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
          isActive
            ? 'bg-tech-50 font-medium text-ink'
            : 'text-graphite hover:bg-ground'
        }`
      }
    >
      <span className="text-muted group-hover:text-ink">{icone}</span>
      <span className="min-w-0 flex-1 truncate">{rotulo}</span>
      {destacado && (
        <span className="plate-label rounded bg-ink px-1.5 py-0.5 text-[10px] text-white">seu</span>
      )}
      {contagem !== undefined && !destacado && (
        <span className="font-mono text-xs text-muted">{contagem}</span>
      )}
    </NavLink>
  );
}
