import { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Pencil, Trash2 } from 'lucide-react';
import {
  useAtualizarPasta,
  useCriarPasta,
  usePastasDoAdmin,
  useRemoverPasta,
  useReordenarPastas,
} from '../../hooks/useFolders';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Icon } from '../../components/ui/Icon';
import { CarregandoPagina, EstadoVazio, useToast } from '../../components/ui/Feedback';
import { corNoEscuro } from '../../utils/texto';
import { errorMessage } from '../../services/api';
import { PastaFormModal } from './PastaFormModal';

/**
 * Administração das pastas: o vocabulário de arquivamento da empresa.
 *
 * A ordem aqui é a ordem lá — a primeira da lista nasce logo à direita do setor
 * na órbita da home, e as demais seguem em sentido horário. Por isso a
 * reordenação é por setas, e não por um campo numérico: o admin move uma pasta
 * e vê para onde ela foi.
 */
export function AbaPastas() {
  const { data: pastas, isLoading } = usePastasDoAdmin();
  const criar = useCriarPasta();
  const atualizar = useAtualizarPasta();
  const remover = useRemoverPasta();
  const reordenar = useReordenarPastas();
  const toast = useToast();

  const [formularioAberto, setFormularioAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState(null);
  const [paraExcluir, setParaExcluir] = useState(null);

  function abrirNova() {
    setEmEdicao(null);
    setFormularioAberto(true);
  }

  function abrirEdicao(pasta) {
    setEmEdicao(pasta);
    setFormularioAberto(true);
  }

  async function salvar(dados) {
    if (emEdicao) {
      await atualizar.mutateAsync({ id: emEdicao.id, ...dados });
      toast.sucesso('Pasta atualizada.');
    } else {
      await criar.mutateAsync(dados);
      toast.sucesso('Pasta criada.');
    }
  }

  async function excluir() {
    try {
      await remover.mutateAsync(paraExcluir.id);
      toast.sucesso('Pasta excluída. Os links dela ficaram sem pasta.');
    } catch (falha) {
      toast.erro(errorMessage(falha, 'Não foi possível excluir a pasta.'));
    } finally {
      setParaExcluir(null);
    }
  }

  async function alternarSituacao(pasta) {
    try {
      await atualizar.mutateAsync({ id: pasta.id, active: !pasta.active });
      toast.sucesso(pasta.active ? 'Pasta tirada do ar.' : 'Pasta publicada na home.');
    } catch (falha) {
      toast.erro(errorMessage(falha, 'Não foi possível mudar a situação da pasta.'));
    }
  }

  /** Troca a pasta de lugar com a vizinha e regrava a ordem da lista inteira. */
  async function mover(indice, direcao) {
    const destino = indice + direcao;
    if (destino < 0 || destino >= pastas.length) return;

    const nova = [...pastas];
    [nova[indice], nova[destino]] = [nova[destino], nova[indice]];

    try {
      await reordenar.mutateAsync(nova.map((item, ordem) => ({ id: item.id, order: ordem })));
    } catch (falha) {
      toast.erro(errorMessage(falha, 'Não foi possível salvar a nova ordem.'));
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted">
          As pastas são o vocabulário de arquivamento da empresa inteira: elas orbitam a marca na
          tela inicial e organizam a página de todos os setores. Aqui se define{' '}
          <strong className="text-graphite">quais são</strong> — o que entra em cada uma é cada
          setor que cadastra, na própria página.
        </p>
        <Button onClick={abrirNova}>
          <Plus className="h-[18px] w-[18px]" />
          Nova pasta
        </Button>
      </div>

      {isLoading && <CarregandoPagina rotulo="Carregando as pastas" />}

      {pastas?.length === 0 && (
        <EstadoVazio
          icone="Folder"
          titulo="Nenhuma pasta cadastrada"
          descricao="Sem pastas, a home fica só com o setor de cada pessoa e os links do setor ficam todos numa lista só."
          acao={<Button onClick={abrirNova}>Criar a primeira pasta</Button>}
        />
      )}

      {pastas?.length > 0 && (
        <ul className="space-y-2.5">
          {pastas.map((pasta, indice) => (
            <li
              key={pasta.id}
              className={`card flex items-center gap-4 p-4 ${pasta.active ? '' : 'opacity-60'}`}
            >
              <div className="flex shrink-0 flex-col">
                <BotaoDeOrdem
                  rotulo={`Subir ${pasta.name}`}
                  onClick={() => mover(indice, -1)}
                  disabled={indice === 0 || reordenar.isPending}
                >
                  <ArrowUp className="h-4 w-4" />
                </BotaoDeOrdem>
                <BotaoDeOrdem
                  rotulo={`Descer ${pasta.name}`}
                  onClick={() => mover(indice, 1)}
                  disabled={indice === pastas.length - 1 || reordenar.isPending}
                >
                  <ArrowDown className="h-4 w-4" />
                </BotaoDeOrdem>
              </div>

              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-hairline bg-ground">
                {pasta.image ? (
                  <img src={pasta.image} alt="" className="h-10 w-10 object-contain" />
                ) : (
                  <Icon
                    name={pasta.icon}
                    className="h-6 w-6"
                    style={{ color: corNoEscuro(pasta.color) }}
                  />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-[15px] font-bold text-graphite">
                  {pasta.name}
                  <span className="pill bg-raised text-muted">
                    {pasta._count?.links ?? 0}{' '}
                    {(pasta._count?.links ?? 0) === 1 ? 'link' : 'links'}
                  </span>
                  {!pasta.image && <span className="pill bg-raised text-muted">sem imagem</span>}
                </p>
                {pasta.description && (
                  <p className="truncate text-[13px] text-muted">{pasta.description}</p>
                )}
                <p className="mt-0.5 font-mono text-[11.5px] text-ink-400">?pasta={pasta.slug}</p>
              </div>

              <button
                type="button"
                onClick={() => alternarSituacao(pasta)}
                className={`pill shrink-0 transition-colors ${
                  pasta.active
                    ? 'bg-success/15 text-success hover:bg-success/25'
                    : 'bg-raised text-muted hover:bg-hairline'
                }`}
              >
                {pasta.active ? 'na home' : 'fora do ar'}
              </button>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => abrirEdicao(pasta)}
                  aria-label={`Editar ${pasta.name}`}
                  className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-raised hover:text-graphite"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setParaExcluir(pasta)}
                  aria-label={`Excluir ${pasta.name}`}
                  className="rounded-lg p-2 text-ink-400 transition-colors hover:bg-danger/15 hover:text-danger-200"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <PastaFormModal
        aberto={formularioAberto}
        aoFechar={() => setFormularioAberto(false)}
        aoSalvar={salvar}
        pasta={emEdicao}
        salvando={criar.isPending || atualizar.isPending}
      />

      <Modal
        open={Boolean(paraExcluir)}
        onClose={() => setParaExcluir(null)}
        title="Excluir pasta"
        footer={
          <>
            <Button variant="ghost" onClick={() => setParaExcluir(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={excluir} disabled={remover.isPending}>
              Excluir
            </Button>
          </>
        }
      >
        <p className="text-sm text-graphite">
          <strong>{paraExcluir?.name}</strong> sai da home de toda a empresa. Os{' '}
          {paraExcluir?._count?.links ?? 0} link(s) guardados nela{' '}
          <strong>não são apagados</strong>: voltam para &ldquo;Sem pasta&rdquo; na página de cada
          setor. Para apenas tirá-la do ar por um tempo, use o botão <strong>na home</strong>.
        </p>
      </Modal>
    </section>
  );
}

function BotaoDeOrdem({ rotulo, children, ...rest }) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      className="rounded p-0.5 text-ink-400 transition-colors hover:bg-raised hover:text-graphite disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
      {...rest}
    >
      {children}
    </button>
  );
}
