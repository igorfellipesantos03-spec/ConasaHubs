import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useHubs } from '../hooks/useHubs';
import { useAuth } from '../contexts/AuthContext';
import { Icon } from '../components/ui/Icon';
import { AvisoDeErro, EsqueletoDeCards } from '../components/ui/Feedback';
import { errorMessage } from '../services/api';

export default function Setores() {
  const { data: hubs, isLoading, isError, error } = useHubs();
  const { user } = useAuth();

  return (
    <div className="space-y-7">
      <header>
        <h1 className="text-[28px] font-extrabold text-ink">Setores</h1>
        <p className="mt-1.5 text-[15px] text-muted">
          {user?.hubId
            ? 'Todos os hubs da empresa. O seu abre por padrão ao entrar.'
            : 'Seu setor ainda não foi atribuído — enquanto isso, navegue por todos.'}
        </p>
      </header>

      {isLoading && <EsqueletoDeCards />}
      {isError && (
        <AvisoDeErro>{errorMessage(error, 'Não foi possível carregar os setores.')}</AvisoDeErro>
      )}

      {hubs && (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,310px),1fr))]">
          {hubs.map((hub, indice) => (
            <Link
              key={hub.id}
              to={`/setor/${hub.slug}`}
              style={{ animationDelay: `${indice * 45}ms` }}
              className="card animate-rise group relative flex flex-col overflow-hidden p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift"
            >
              {/* Véu na cor do setor, revelado no hover. */}
              <span
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-24 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{ background: `linear-gradient(180deg, ${hub.color}12, transparent)` }}
              />

              <span className="relative flex items-start justify-between gap-3">
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-2xl transition-transform duration-200 group-hover:scale-105"
                  style={{
                    background: `linear-gradient(140deg, ${hub.color}24, ${hub.color}0f)`,
                    color: hub.color,
                  }}
                >
                  <Icon name={hub.icon} className="h-6 w-6" strokeWidth={1.7} />
                </span>

                {hub.isMine && <span className="pill bg-ink text-white">seu setor</span>}
              </span>

              <span className="relative mt-4 block">
                <span className="flex items-center gap-1.5">
                  <span className="text-[17px] font-bold text-graphite">{hub.name}</span>
                  <ArrowRight className="h-4 w-4 text-ink-200 transition-all duration-200 group-hover:translate-x-1 group-hover:text-tech" />
                </span>

                {hub.description && (
                  <span className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted">
                    {hub.description}
                  </span>
                )}
              </span>

              {/* `mt-auto` cola o rodapé no fundo, alinhando as contagens de
                  todos os cards da mesma linha. */}
              <span className="relative mt-auto flex items-center gap-2 border-t border-hairline pt-3.5 text-[13px] font-semibold text-muted">
                {hub.linkCount} {hub.linkCount === 1 ? 'link' : 'links'}
                {hub.canEdit && (
                  <>
                    <span className="h-1 w-1 rounded-full bg-ink-200" />
                    <span className="text-tech-600">você é curador</span>
                  </>
                )}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
