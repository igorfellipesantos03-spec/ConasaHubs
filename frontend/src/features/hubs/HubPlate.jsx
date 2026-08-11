import { Icon } from '../../components/ui/Icon';

/**
 * A placa de identificação do setor — o elemento-assinatura do CentralHub.
 *
 * Lê como a plaqueta de identificação de um equipamento: bloco institucional,
 * código do setor e contagens em mono caixa-alta. Os dados na faixa inferior
 * são reais; nada ali é enfeite.
 */
export function HubPlate({ hub, quantidadeDeLinks, acoes }) {
  const codigo = hub.slug.toUpperCase();

  return (
    <section className="overflow-hidden rounded-card bg-ink text-white">
      {/* No celular as ações descem para a própria linha: o nome do setor tem
          prioridade sobre os botões. */}
      <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-start sm:px-6">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg"
            style={{
              backgroundColor: `${hub.color}26`,
              color: hub.color === '#0F2C59' ? '#00A8CC' : hub.color,
            }}
          >
            <Icon name={hub.icon} className="h-6 w-6" />
          </span>

          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{hub.name}</h1>
            {hub.description && (
              <p className="mt-1 max-w-2xl text-sm text-white/70">{hub.description}</p>
            )}
          </div>
        </div>

        {acoes && <div className="flex shrink-0 items-center gap-2">{acoes}</div>}
      </div>

      <dl className="flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-white/12 bg-black/12 px-5 py-2.5 sm:px-6">
        <Medida rotulo="Setor" valor={codigo} />
        <Medida rotulo="Links" valor={String(quantidadeDeLinks).padStart(2, '0')} />
        {hub.canEdit && <Medida rotulo="Seu papel" valor="Curador" />}
      </dl>
    </section>
  );
}

function Medida({ rotulo, valor }) {
  return (
    <div className="flex items-center gap-2">
      <dt className="plate-label text-white/45">{rotulo}</dt>
      <dd className="plate-label text-tech">{valor}</dd>
    </div>
  );
}
