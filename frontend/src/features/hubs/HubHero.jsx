import { Icon } from '../../components/ui/Icon';
import { MarcaDagua } from '../../components/ui/Logo';

/**
 * Topo da página do setor. As próprias ondas da marca da Conasa entram como
 * textura, em escala grande e opacidade baixa — a identidade vira o gráfico,
 * dispensando ornamento inventado.
 */
export function HubHero({ hub, quantidadeDeLinks, acoes }) {
  return (
    <section className="relative overflow-hidden rounded-card bg-gradient-to-br from-ink via-ink-800 to-ink-700 text-white shadow-lift">
      <MarcaDagua className="absolute -right-10 -top-16 h-[280px] w-[280px] opacity-[0.07] sm:-right-4 sm:h-[340px] sm:w-[340px]" />

      <div className="relative flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="flex min-w-0 items-start gap-4">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-inset ring-white/15 backdrop-blur-sm"
            style={{ color: hub.color === '#0F2C59' ? '#7FD8EA' : hub.color }}
          >
            <Icon name={hub.icon} className="h-7 w-7" strokeWidth={1.6} />
          </span>

          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold sm:text-3xl">{hub.name}</h1>
            {hub.description && (
              <p className="mt-1.5 max-w-xl text-[15px] leading-relaxed text-white/70">
                {hub.description}
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="pill bg-white/10 text-white/85">
                {quantidadeDeLinks} {quantidadeDeLinks === 1 ? 'link' : 'links'}
              </span>
              {hub.canEdit && (
                <span className="pill bg-tech/20 text-tech-100">Você mantém este setor</span>
              )}
            </div>
          </div>
        </div>

        {acoes && <div className="flex shrink-0 items-center gap-2">{acoes}</div>}
      </div>
    </section>
  );
}
