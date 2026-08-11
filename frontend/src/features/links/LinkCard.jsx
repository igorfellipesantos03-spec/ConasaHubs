import { ExternalLink, GripVertical, Lock, Pencil, Star, Trash2 } from 'lucide-react';
import { Icon } from '../../components/ui/Icon';

/**
 * Card de link. A barra vertical à esquerda usa a cor do próprio link e cresce
 * no hover — é o único movimento do card, para não competir com o conteúdo.
 *
 * Os controles ficam ocultos até o hover ou o foco em telas grandes: o título
 * é o que importa e precisa da largura. No toque, onde não existe hover, eles
 * ficam sempre visíveis.
 */
export function LinkCard({
  link,
  podeEditar,
  aoEditar,
  aoRemover,
  aoAlternarFavorito,
  arrastavel,
  atributosDeArraste,
  ouvintesDeArraste,
  estilo,
  referencia,
}) {
  const revelavel =
    'transition-opacity duration-150 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100';

  return (
    <div
      ref={referencia}
      style={estilo}
      className="card group relative flex h-full items-stretch overflow-hidden transition-shadow duration-150 hover:shadow-[0_6px_20px_-8px_rgba(15,44,89,0.28)]"
    >
      <span
        aria-hidden="true"
        className="w-1 shrink-0 transition-all duration-150 group-hover:w-1.5"
        style={{ backgroundColor: link.color }}
      />

      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        // O espaço à direita é reservado no padding: as ações ficam fora do
        // fluxo para não esticarem o card nem roubarem largura do título.
        className={`flex min-w-0 flex-1 items-start gap-3 py-3 pl-3.5 ${
          podeEditar ? 'pr-24' : 'pr-11'
        }`}
      >
        <span
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${link.color}14`, color: link.color }}
        >
          <Icon name={link.icon} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-start gap-1.5">
            <span className="line-clamp-2 font-medium leading-snug text-graphite">{link.title}</span>
            {link.visibility === 'HUB_ONLY' && (
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" aria-label="Restrito ao setor" />
            )}
            <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-hairline transition-colors group-hover:text-tech" />
          </span>
          {link.description && (
            <span className="mt-1 line-clamp-2 block text-sm leading-snug text-muted">
              {link.description}
            </span>
          )}
          {link.hubName && (
            <span className="plate-label mt-2 block text-ink-300">{link.hubName}</span>
          )}
        </span>
      </a>

      <div className="absolute right-1.5 top-2 flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => aoAlternarFavorito?.(link)}
          aria-label={link.isFavorite ? `Remover ${link.title} dos favoritos` : `Favoritar ${link.title}`}
          aria-pressed={Boolean(link.isFavorite)}
          className={`rounded-lg p-1.5 transition-colors ${
            link.isFavorite
              ? 'text-tech'
              : `text-muted/45 hover:bg-ground hover:text-muted ${revelavel}`
          }`}
        >
          <Star className="h-4 w-4" fill={link.isFavorite ? 'currentColor' : 'none'} />
        </button>

        {podeEditar && (
          <>
            <button
              type="button"
              onClick={() => aoEditar(link)}
              aria-label={`Editar ${link.title}`}
              className={`rounded-lg p-1.5 text-muted/45 hover:bg-ground hover:text-graphite ${revelavel}`}
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => aoRemover(link)}
              aria-label={`Excluir ${link.title}`}
              className={`rounded-lg p-1.5 text-muted/45 hover:bg-danger/5 hover:text-danger ${revelavel}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>

          </>
        )}
      </div>

      {/* A alça de arraste fica no canto oposto para não disputar espaço com o
          título nem com os botões de ação. */}
      {podeEditar && arrastavel && (
        <button
          type="button"
          className={`absolute bottom-2 right-1.5 hidden cursor-grab rounded-lg p-1.5 text-muted/45 hover:text-muted active:cursor-grabbing sm:block ${revelavel}`}
          aria-label={`Reordenar ${link.title}`}
          {...atributosDeArraste}
          {...ouvintesDeArraste}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
