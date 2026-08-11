import { Link } from 'react-router-dom';
import { useHubs } from '../hooks/useHubs';
import { useAuth } from '../contexts/AuthContext';
import { Icon } from '../components/ui/Icon';
import { AvisoDeErro, EsqueletoDeCards } from '../components/ui/Feedback';
import { errorMessage } from '../services/api';

export default function Setores() {
  const { data: hubs, isLoading, isError, error } = useHubs();
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <header>
        <p className="plate-label text-tech">Conasa</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">Setores</h1>
        <p className="mt-1 text-muted">
          {user?.hubId
            ? 'Todos os hubs da empresa. O seu abre por padrão ao entrar.'
            : 'Seu setor ainda não foi atribuído — enquanto isso, navegue por todos.'}
        </p>
      </header>

      {isLoading && <EsqueletoDeCards />}
      {isError && <AvisoDeErro>{errorMessage(error, 'Não foi possível carregar os setores.')}</AvisoDeErro>}

      {hubs && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {hubs.map((hub, indice) => (
            <Link
              key={hub.id}
              to={`/setor/${hub.slug}`}
              style={{ animationDelay: `${indice * 30}ms` }}
              className="card animate-rise group relative flex items-start gap-3.5 overflow-hidden p-4 transition-shadow duration-150 hover:shadow-[0_6px_20px_-8px_rgba(15,44,89,0.28)]"
            >
              <span
                aria-hidden="true"
                className="absolute inset-y-0 left-0 w-1 transition-all duration-150 group-hover:w-1.5"
                style={{ backgroundColor: hub.color }}
              />

              <span
                className="ml-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${hub.color}14`, color: hub.color }}
              >
                <Icon name={hub.icon} className="h-5 w-5" />
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate font-medium text-graphite">{hub.name}</span>
                  {hub.isMine && (
                    <span className="plate-label rounded bg-ink px-1.5 py-0.5 text-[10px] text-white">
                      seu setor
                    </span>
                  )}
                </span>
                {hub.description && (
                  <span className="mt-0.5 line-clamp-2 block text-sm text-muted">
                    {hub.description}
                  </span>
                )}
                <span className="plate-label mt-2 block text-ink-300">
                  {String(hub.linkCount).padStart(2, '0')} links
                  {hub.canEdit && ' · você é curador'}
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
