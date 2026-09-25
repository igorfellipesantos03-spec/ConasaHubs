import { ArrowUpRight, GripVertical, Lock, Pencil, Star, Trash2 } from 'lucide-react';
import { Icon } from '../../components/ui/Icon';
import { corNoEscuro } from '../../utils/texto';

/**
 * Card de link. O card inteiro é a área de clique; os controles ficam ocultos
 * até o hover ou o foco em telas grandes, onde o ponteiro existe. No toque
 * eles permanecem visíveis.
 */
export function LinkCard({
  link,
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
    'transition-opacity duration-200 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100';

  // Quem pode mexer neste link vem da API, link a link: o autor e os curadores
  // do setor. A tela só deixa de oferecer o que seria recusado no envio.
  const podeEditar = Boolean(link.canEdit && aoEditar);

  // Quem escolheu a cor mirava o card branco; no escuro ela é clareada sem
  // trocar de matiz, para o código de cores continuar valendo.
  const cor = corNoEscuro(link.color);

  return (
    <div
      ref={referencia}
      style={estilo}
      className="card group relative flex h-full flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift"
    >
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex flex-1 items-start gap-3.5 p-4 ${podeEditar ? 'pr-24' : 'pr-12'}`}
      >
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105"
          style={{
            background: `linear-gradient(140deg, ${cor}29, ${cor}12)`,
            color: cor,
          }}
        >
          <Icon name={link.icon} className="h-[22px] w-[22px]" strokeWidth={1.8} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-start gap-1.5">
            {/* `line-clamp` já define o display; um `block` junto anularia o
                corte e deixaria o texto vazar. */}
            <span className="line-clamp-2 text-[15px] font-bold leading-snug text-graphite">
              {link.title}
            </span>
            {link.visibility === 'HUB_ONLY' && (
              <Lock className="mt-1 h-3.5 w-3.5 shrink-0 text-muted" aria-label="Restrito ao setor" />
            )}
            <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-ink-400 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-tech" />
          </span>

          {link.description && (
            <span className="mt-1 line-clamp-2 text-[13.5px] leading-relaxed text-muted">
              {link.description}
            </span>
          )}

          {link.hubName && (
            <span className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-400">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: link.color }} />
              {link.hubName}
            </span>
          )}
        </span>
      </a>

      <div className="absolute right-2 top-2.5 flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => aoAlternarFavorito?.(link)}
          aria-label={link.isFavorite ? `Remover ${link.title} dos favoritos` : `Favoritar ${link.title}`}
          aria-pressed={Boolean(link.isFavorite)}
          className={`rounded-lg p-1.5 transition-colors ${
            link.isFavorite
              ? 'text-tech hover:bg-tech/15'
              : `text-ink-400 hover:bg-raised hover:text-muted ${revelavel}`
          }`}
        >
          <Star className="h-[18px] w-[18px]" fill={link.isFavorite ? 'currentColor' : 'none'} />
        </button>

        {podeEditar && (
          <>
            <button
              type="button"
              onClick={() => aoEditar(link)}
              aria-label={`Editar ${link.title}`}
              className={`rounded-lg p-1.5 text-ink-400 hover:bg-raised hover:text-graphite ${revelavel}`}
            >
              <Pencil className="h-[18px] w-[18px]" />
            </button>
            <button
              type="button"
              onClick={() => aoRemover(link)}
              aria-label={`Excluir ${link.title}`}
              className={`rounded-lg p-1.5 text-ink-400 hover:bg-danger/15 hover:text-danger-200 ${revelavel}`}
            >
              <Trash2 className="h-[18px] w-[18px]" />
            </button>
          </>
        )}
      </div>

      {arrastavel && (
        <button
          type="button"
          className={`absolute bottom-2 right-2 hidden cursor-grab rounded-lg p-1.5 text-ink-400 hover:bg-raised hover:text-muted active:cursor-grabbing sm:block ${revelavel}`}
          aria-label={`Reordenar ${link.title}`}
          {...atributosDeArraste}
          {...ouvintesDeArraste}
        >
          <GripVertical className="h-[18px] w-[18px]" />
        </button>
      )}
    </div>
  );
}
