import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import {
  useAtualizarLink,
  useCriarLink,
  useHub,
  useRemoverLink,
  useReordenarLinks,
} from '../hooks/useHubs';
import { useAlternarFavorito } from '../hooks/useFavorites';
import { HubHero } from '../features/hubs/HubHero';
import { LinkGrid } from '../features/links/LinkGrid';
import { LinkFormModal } from '../features/links/LinkFormModal';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Icon } from '../components/ui/Icon';
import { AvisoDeErro, EsqueletoDeCards, EstadoVazio, useToast } from '../components/ui/Feedback';
import { corNoEscuro } from '../utils/texto';
import { errorMessage } from '../services/api';

/**
 * Página de um setor: os links da equipe, arrumados nas pastas da empresa.
 *
 * As pastas não são criadas aqui — são as mesmas para todo mundo, definidas em
 * Administração › Pastas, e são elas que orbitam a tela inicial. O que esta
 * página faz é o outro lado do mesmo acordo: cada setor decide o que vai dentro
 * de cada pasta, sem limite de links.
 *
 * Quem chega clicando numa pasta da home traz `?pasta=<slug>` na URL. A tela
 * rola até ela e a contorna — é o "de onde eu vim" que evita a pessoa cair no
 * meio de uma página cheia sem saber onde procurar.
 */
export default function HubPage() {
  const { slug } = useParams();
  const [parametros, setParametros] = useSearchParams();
  const { data: hub, isLoading, isError, error } = useHub(slug);
  const toast = useToast();

  const pastaDestacada = parametros.get('pasta');

  const [linkEmEdicao, setLinkEmEdicao] = useState(null);
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [pastaDoNovoLink, setPastaDoNovoLink] = useState('');
  const [linkParaExcluir, setLinkParaExcluir] = useState(null);

  const criarLink = useCriarLink(hub);
  const atualizarLink = useAtualizarLink(hub);
  const removerLink = useRemoverLink(hub);
  const reordenarLinks = useReordenarLinks(hub);
  const alternarFavorito = useAlternarFavorito(slug);

  // Rolar depende do conteúdo já estar na tela, então o efeito espera o setor
  // carregar. `hub?.id` na lista de dependências cobre a troca de setor sem
  // recarregar a página.
  useEffect(() => {
    if (!hub || !pastaDestacada) return;
    document
      .getElementById(`pasta-${pastaDestacada}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [hub?.id, pastaDestacada]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-28 animate-pulse rounded-card bg-surface" />
        <EsqueletoDeCards />
      </div>
    );
  }

  if (isError) {
    return (
      <AvisoDeErro>
        {error?.response?.status === 404
          ? 'Este setor não existe ou foi desativado.'
          : errorMessage(error, 'Não foi possível carregar o setor.')}
      </AvisoDeErro>
    );
  }

  const totalDeLinks =
    hub.uncategorizedLinks.length +
    hub.folders.reduce((soma, pasta) => soma + pasta.links.length, 0);

  function abrirNovoLink(folderId = '') {
    setLinkEmEdicao(null);
    setPastaDoNovoLink(folderId);
    setFormularioAberto(true);
  }

  const abrirEdicao = (link) => {
    setLinkEmEdicao(link);
    setFormularioAberto(true);
  };

  function limparDestaque() {
    const restante = new URLSearchParams(parametros);
    restante.delete('pasta');
    setParametros(restante, { replace: true });
  }

  async function salvarLink(dados) {
    if (linkEmEdicao) {
      await atualizarLink.mutateAsync({ id: linkEmEdicao.id, ...dados });
      toast.sucesso('Link atualizado.');
    } else {
      await criarLink.mutateAsync(dados);
      toast.sucesso('Link adicionado.');
    }
  }

  async function excluirLink() {
    try {
      await removerLink.mutateAsync(linkParaExcluir.id);
      toast.sucesso('Link excluído.');
    } catch (falha) {
      toast.erro(errorMessage(falha, 'Não foi possível excluir o link.'));
    } finally {
      setLinkParaExcluir(null);
    }
  }

  async function reordenar(items) {
    try {
      await reordenarLinks.mutateAsync(items);
    } catch (falha) {
      toast.erro(errorMessage(falha, 'Não foi possível salvar a nova ordem.'));
    }
  }

  const propriedadesDaGrade = {
    // Publicar é de quem é do setor; mexer no que já está lá, de quem publicou.
    // Cada link traz o próprio `canEdit`, calculado pela API com essa regra.
    aoEditar: abrirEdicao,
    aoRemover: setLinkParaExcluir,
    aoAlternarFavorito: (link) =>
      alternarFavorito.mutate({ linkId: link.id, favoritado: link.isFavorite }),
    aoReordenar: hub.canEdit ? reordenar : undefined,
  };

  // Pasta vazia só aparece para quem pode preenchê-la — e para quem veio da
  // home clicando justamente nela, que precisa ver a resposta "ainda não tem
  // nada aqui" em vez de não encontrar a pasta.
  const pastasVisiveis = hub.folders.filter(
    (pasta) => pasta.links.length > 0 || hub.canContribute || pasta.slug === pastaDestacada,
  );

  return (
    <div className="space-y-6">
      <HubHero
        hub={hub}
        quantidadeDeLinks={totalDeLinks}
        acoes={
          hub.canContribute && (
            <Button onClick={() => abrirNovoLink()}>
              <Plus className="h-[18px] w-[18px]" />
              Novo link
            </Button>
          )
        }
      />

      {totalDeLinks === 0 && !hub.canContribute ? (
        <EstadoVazio
          icone={hub.icon}
          titulo="Nenhum link por aqui ainda"
          descricao="Este setor ainda não cadastrou links."
        />
      ) : (
        <div className="space-y-8">
          {hub.uncategorizedLinks.length > 0 && (
            <SecaoDaPasta
              titulo="Sem pasta"
              icone="Files"
              cor="#475467"
              quantidade={hub.uncategorizedLinks.length}
            >
              <LinkGrid links={hub.uncategorizedLinks} {...propriedadesDaGrade} />
            </SecaoDaPasta>
          )}

          {pastasVisiveis.map((pasta) => (
            <SecaoDaPasta
              key={pasta.id}
              id={`pasta-${pasta.slug}`}
              titulo={pasta.name}
              descricao={pasta.description}
              icone={pasta.icon}
              cor={pasta.color}
              quantidade={pasta.links.length}
              destacada={pasta.slug === pastaDestacada}
              aoLimparDestaque={limparDestaque}
              aoAdicionar={hub.canContribute ? () => abrirNovoLink(pasta.id) : undefined}
            >
              {pasta.links.length > 0 ? (
                <LinkGrid links={pasta.links} {...propriedadesDaGrade} />
              ) : (
                <p className="text-sm text-muted">
                  {hub.canContribute
                    ? 'Nenhum link nesta pasta ainda. Use "Adicionar" no título para começar.'
                    : 'Este setor ainda não guardou nada nesta pasta.'}
                </p>
              )}
            </SecaoDaPasta>
          ))}
        </div>
      )}

      <LinkFormModal
        aberto={formularioAberto}
        aoFechar={() => setFormularioAberto(false)}
        aoSalvar={salvarLink}
        link={linkEmEdicao}
        pastas={hub.folders}
        pastaInicial={pastaDoNovoLink}
        salvando={criarLink.isPending || atualizarLink.isPending}
      />

      <Modal
        open={Boolean(linkParaExcluir)}
        onClose={() => setLinkParaExcluir(null)}
        title="Excluir link"
        footer={
          <>
            <Button variant="ghost" onClick={() => setLinkParaExcluir(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={excluirLink} disabled={removerLink.isPending}>
              Excluir
            </Button>
          </>
        }
      >
        <p className="text-sm text-graphite">
          O link <strong>{linkParaExcluir?.title}</strong> sai do setor para todo mundo. A ação fica
          registrada na auditoria.
        </p>
      </Modal>
    </div>
  );
}

/**
 * Um bloco de links sob o nome da pasta.
 *
 * `scroll-mt-24` existe por causa do cabeçalho fixo do AppShell: sem essa
 * margem de rolagem, quem chega da home para na pasta certa com o título
 * escondido atrás da barra.
 */
function SecaoDaPasta({
  id,
  titulo,
  descricao,
  icone,
  cor,
  quantidade,
  destacada,
  aoLimparDestaque,
  aoAdicionar,
  children,
}) {
  return (
    <section
      id={id}
      className={`scroll-mt-24 transition-colors ${
        destacada ? 'rounded-card bg-tech/[0.05] p-4 ring-1 ring-tech/40 sm:p-5' : ''
      }`}
    >
      <div className="group/pasta mb-3.5 flex flex-wrap items-center gap-2.5">
        <Icon
          name={icone}
          className="h-[18px] w-[18px] shrink-0"
          style={{ color: corNoEscuro(cor) }}
        />
        <h2 className="text-[15px] font-bold text-graphite">{titulo}</h2>
        <span className="pill bg-raised text-muted">{quantidade}</span>

        {destacada && (
          <button
            type="button"
            onClick={aoLimparDestaque}
            className="pill flex items-center gap-1 bg-tech/15 text-tech-100 transition-colors hover:bg-tech/25"
          >
            da tela inicial
            <X className="h-3 w-3" aria-hidden="true" />
            <span className="sr-only">Tirar o destaque desta pasta</span>
          </button>
        )}

        {aoAdicionar && (
          <button
            type="button"
            onClick={aoAdicionar}
            className={`pill flex items-center gap-1 bg-raised text-muted transition-all hover:bg-hairline hover:text-graphite ${
              // Numa pasta cheia o botão só atrapalharia a leitura dos títulos;
              // numa pasta vazia ele é a única coisa a fazer ali.
              quantidade === 0
                ? ''
                : 'lg:opacity-0 lg:group-hover/pasta:opacity-100 lg:group-focus-within/pasta:opacity-100'
            }`}
          >
            <Plus className="h-3 w-3" aria-hidden="true" />
            Adicionar
            <span className="sr-only">um link em {titulo}</span>
          </button>
        )}

        <span className="h-px flex-1 bg-hairline" />
      </div>

      {descricao && <p className="mb-3.5 -mt-1.5 text-[13px] text-muted">{descricao}</p>}

      {children}
    </section>
  );
}
