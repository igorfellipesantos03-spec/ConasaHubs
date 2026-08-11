import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { LogOut, Menu, Settings, Star, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useHubs } from '../../hooks/useHubs';
import { Icon } from '../ui/Icon';
import { LogoComNome } from '../ui/Logo';

export function AppShell({ children }) {
  const [menuAberto, setMenuAberto] = useState(false);
  const { pathname } = useLocation();

  // Navegar fecha o menu do celular.
  useEffect(() => setMenuAberto(false), [pathname]);

  return (
    <div className="min-h-screen">
      <Cabecalho aoAbrirMenu={() => setMenuAberto(true)} />

      <div className="flex">
        <Navegacao aberta={menuAberto} aoFechar={() => setMenuAberto(false)} />

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}

/**
 * Cabeçalho claro: o azul institucional fica reservado para a marca e para o
 * topo de cada setor, em vez de uma faixa maciça atravessando a tela.
 */
function Cabecalho({ aoAbrirMenu }) {
  const { user, logout, ehAdmin } = useAuth();

  const iniciais = (user?.name ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-surface/85 backdrop-blur-md">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={aoAbrirMenu}
          className="-ml-1 rounded-xl p-2 text-muted transition-colors hover:bg-ground hover:text-ink lg:hidden"
          aria-label="Abrir menu de setores"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link to="/" className="rounded-xl">
          <LogoComNome />
        </Link>

        <div className="ml-auto flex items-center gap-1.5">
          {ehAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium transition-colors ${
                  isActive ? 'bg-tech-50 text-ink' : 'text-muted hover:bg-ground hover:text-graphite'
                }`
              }
            >
              <Settings className="h-[18px] w-[18px]" />
              <span className="sr-only sm:not-sr-only">Administração</span>
            </NavLink>
          )}

          <div className="mx-1 hidden items-center gap-2.5 sm:flex">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-tech-50 text-[13px] font-bold text-ink">
              {iniciais}
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-semibold text-graphite">{user?.name}</span>
              <span className="block text-xs text-muted">{user?.hubName ?? 'Sem setor'}</span>
            </span>
          </div>

          <button
            type="button"
            onClick={logout}
            className="flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-muted transition-colors hover:bg-ground hover:text-graphite"
          >
            <LogOut className="h-[18px] w-[18px]" />
            <span className="sr-only sm:not-sr-only">Sair</span>
          </button>
        </div>
      </div>
    </header>
  );
}

function Navegacao({ aberta, aoFechar }) {
  const { data: hubs = [] } = useHubs();
  const { user } = useAuth();

  const conteudo = (
    <nav className="flex h-full flex-col gap-7 px-3 py-6">
      <section>
        <p className="eyebrow px-3 pb-2">Atalhos</p>
        <ItemDeMenu to="/favoritos" icone={<Star className="h-[18px] w-[18px]" />} rotulo="Meus favoritos" />
        <ItemDeMenu
          to="/setores"
          icone={<Icon name="LayoutGrid" className="h-[18px] w-[18px]" />}
          rotulo="Todos os setores"
        />
      </section>

      <section>
        <p className="eyebrow px-3 pb-2">Setores</p>
        <ul className="space-y-0.5">
          {hubs.map((hub) => (
            <li key={hub.id}>
              <ItemDeMenu
                to={`/setor/${hub.slug}`}
                icone={<Icon name={hub.icon} className="h-[18px] w-[18px]" />}
                cor={hub.color}
                rotulo={hub.name}
                contagem={hub.linkCount}
                ehMeuSetor={hub.id === user?.hubId}
              />
            </li>
          ))}
        </ul>
      </section>
    </nav>
  );

  return (
    <>
      <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-[264px] shrink-0 overflow-y-auto border-r border-hairline bg-surface/60 lg:block">
        {conteudo}
      </aside>

      {aberta && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={aoFechar} />
          <div className="animate-rise absolute inset-y-0 left-0 w-[280px] overflow-y-auto bg-surface shadow-lift">
            <div className="flex items-center justify-between border-b border-hairline px-4 py-3.5">
              <LogoComNome />
              <button
                type="button"
                onClick={aoFechar}
                aria-label="Fechar menu"
                className="rounded-xl p-1.5 text-muted hover:bg-ground"
              >
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

function ItemDeMenu({ to, icone, rotulo, contagem, ehMeuSetor, cor }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-150 ${
          isActive
            ? 'bg-ink font-semibold text-white shadow-soft'
            : 'font-medium text-graphite hover:bg-ground'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={isActive ? 'text-tech' : 'text-muted transition-colors group-hover:text-ink'}
            style={!isActive && cor ? { color: cor } : undefined}
          >
            {icone}
          </span>

          <span className="min-w-0 flex-1 truncate">{rotulo}</span>

          {ehMeuSetor ? (
            <span
              className={`pill ${
                isActive ? 'bg-white/15 text-white' : 'bg-tech-50 text-ink'
              }`}
            >
              seu
            </span>
          ) : (
            contagem !== undefined && (
              <span
                className={`text-xs font-semibold ${isActive ? 'text-white/60' : 'text-muted'}`}
              >
                {contagem}
              </span>
            )
          )}
        </>
      )}
    </NavLink>
  );
}
