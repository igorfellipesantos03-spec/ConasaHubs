import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { FolderPlus, Plus, Trash2 } from 'lucide-react';
import {
  useAtualizarLink,
  useCriarLink,
  useCriarSecao,
  useHub,
  useRemoverLink,
  useRemoverSecao,
  useReordenarLinks,
} from '../hooks/useHubs';
import { useAlternarFavorito } from '../hooks/useFavorites';
import { HubHero } from '../features/hubs/HubHero';
import { LinkGrid } from '../features/links/LinkGrid';
import { LinkFormModal } from '../features/links/LinkFormModal';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Field';
import { AvisoDeErro, EsqueletoDeCards, EstadoVazio, useToast } from '../components/ui/Feedback';
import { errorMessage } from '../services/api';

export default function HubPage() {
  const { slug } = useParams();
  const { data: hub, isLoading, isError, error } = useHub(slug);
  const toast = useToast();

  const [linkEmEdicao, setLinkEmEdicao] = useState(null);
  const [formularioAberto, setFormularioAberto] = useState(false);
  const [secaoAberta, setSecaoAberta] = useState(false);
  const [linkParaExcluir, setLinkParaExcluir] = useState(null);

  const criarLink = useCriarLink(hub);
  const atualizarLink = useAtualizarLink(hub);
  const removerLink = useRemoverLink(hub);
  const reordenarLinks = useReordenarLinks(hub);
  const criarSecao = useCriarSecao(hub);
  const removerSecao = useRemoverSecao(hub);
  const alternarFavorito = useAlternarFavorito(slug);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-28 animate-pulse rounded-card bg-ink/10" />
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
    hub.categories.reduce((soma, secao) => soma + secao.links.length, 0);

  const abrirNovoLink = () => {
    setLinkEmEdicao(null);
    setFormularioAberto(true);
  };

  const abrirEdicao = (link) => {
    setLinkEmEdicao(link);
    setFormularioAberto(true);
  };

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

  return (
    <div className="space-y-6">
      <HubHero
        hub={hub}
        quantidadeDeLinks={totalDeLinks}
        acoes={
          hub.canContribute && (
            <>
              <Button variant="translucido" onClick={() => setSecaoAberta(true)}>
                <FolderPlus className="h-[18px] w-[18px]" />
                Nova seção
              </Button>
              <Button onClick={abrirNovoLink}>
                <Plus className="h-[18px] w-[18px]" />
                Novo link
              </Button>
            </>
          )
        }
      />

      {totalDeLinks === 0 ? (
        <EstadoVazio
          icone={hub.icon}
          titulo="Nenhum link por aqui ainda"
          descricao={
            hub.canContribute
              ? 'Comece adicionando os sistemas que a sua equipe usa todo dia.'
              : 'Este setor ainda não cadastrou links.'
          }
          acao={
            hub.canContribute && <Button onClick={abrirNovoLink}>Adicionar o primeiro link</Button>
          }
        />
      ) : (
        <div className="space-y-8">
          {hub.uncategorizedLinks.length > 0 && (
            <LinkGrid links={hub.uncategorizedLinks} {...propriedadesDaGrade} />
          )}

          {hub.categories
            .filter((secao) => secao.links.length > 0 || hub.canContribute)
            .map((secao) => (
              <section key={secao.id}>
                <div className="group/secao mb-3.5 flex items-center gap-2.5">
                  <h2 className="text-[15px] font-bold text-graphite">{secao.name}</h2>
                  <span className="pill bg-ground text-muted">{secao.links.length}</span>
                  {secao.canEdit && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await removerSecao.mutateAsync(secao.id);
                          toast.sucesso('Seção removida. Os links dela ficaram sem seção.');
                        } catch (falha) {
                          toast.erro(errorMessage(falha, 'Não foi possível remover a seção.'));
                        }
                      }}
                      aria-label={`Remover a seção ${secao.name}`}
                      className="rounded-lg p-1.5 text-ink-200 transition-all hover:bg-danger/8 hover:text-danger lg:opacity-0 lg:group-hover/secao:opacity-100 lg:group-focus-within/secao:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  <span className="h-px flex-1 bg-hairline" />
                </div>

                {secao.links.length > 0 ? (
                  <LinkGrid links={secao.links} {...propriedadesDaGrade} />
                ) : (
                  <p className="text-sm text-muted">Seção vazia.</p>
                )}
              </section>
            ))}
        </div>
      )}

      <LinkFormModal
        aberto={formularioAberto}
        aoFechar={() => setFormularioAberto(false)}
        aoSalvar={salvarLink}
        link={linkEmEdicao}
        secoes={hub.categories}
        salvando={criarLink.isPending || atualizarLink.isPending}
      />

      <NovaSecaoModal
        aberto={secaoAberta}
        aoFechar={() => setSecaoAberta(false)}
        aoCriar={async (name) => {
          await criarSecao.mutateAsync({ name });
          toast.sucesso('Seção criada.');
        }}
        salvando={criarSecao.isPending}
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

function NovaSecaoModal({ aberto, aoFechar, aoCriar, salvando }) {
  const [nome, setNome] = useState('');
  const [erro, setErro] = useState(null);

  async function criar(evento) {
    evento.preventDefault();
    setErro(null);
    try {
      await aoCriar(nome.trim());
      setNome('');
      aoFechar();
    } catch (falha) {
      setErro(errorMessage(falha, 'Não foi possível criar a seção.'));
    }
  }

  return (
    <Modal
      open={aberto}
      onClose={aoFechar}
      title="Nova seção"
      description="Agrupe os links por assunto, como Sistemas ou Documentação."
      footer={
        <>
          <Button variant="ghost" onClick={aoFechar}>
            Cancelar
          </Button>
          <Button type="submit" form="formulario-de-secao" disabled={salvando || !nome.trim()}>
            Criar seção
          </Button>
        </>
      }
    >
      <form id="formulario-de-secao" onSubmit={criar} className="space-y-4" noValidate>
        {erro && <AvisoDeErro>{erro}</AvisoDeErro>}
        <Input
          label="Nome da seção"
          value={nome}
          maxLength={60}
          onChange={(evento) => setNome(evento.target.value)}
          placeholder="Sistemas"
          required
        />
      </form>
    </Modal>
  );
}
