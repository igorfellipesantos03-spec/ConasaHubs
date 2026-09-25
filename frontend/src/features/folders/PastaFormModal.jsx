import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Field, Input } from '../../components/ui/Field';
import { AvisoDeErro, Spinner } from '../../components/ui/Feedback';
import { Icon, ICONES_DISPONIVEIS } from '../../components/ui/Icon';
import { corNoEscuro } from '../../utils/texto';
import { ImagemInvalida, reduzirImagem } from '../../utils/imagem';
import { errorMessage } from '../../services/api';

const CORES = [
  { valor: '#00A8CC', nome: 'Azul técnico' },
  { valor: '#0F2C59', nome: 'Azul institucional' },
  { valor: '#067647', nome: 'Verde' },
  { valor: '#B54708', nome: 'Âmbar' },
  { valor: '#B42318', nome: 'Vermelho' },
  { valor: '#6941C6', nome: 'Roxo' },
  { valor: '#475467', nome: 'Grafite' },
];

const VAZIO = { name: '', description: '', image: '', icon: 'Folder', color: '#00A8CC' };

/**
 * Cadastro de uma pasta.
 *
 * A pasta não tem endereço: ela não leva a lugar nenhum por conta própria —
 * leva ao setor de quem clicou. O que se define aqui é a aparência dela na
 * órbita da home e nos títulos de seção da página do setor.
 *
 * A imagem é o diferencial deste formulário: o admin escolhe um arquivo
 * qualquer e o navegador o reduz antes de enviar (ver `utils/imagem`). Ícone e
 * cor continuam ali como reserva — é o que o nó mostra enquanto ninguém subiu
 * uma imagem, e o que sobra se ela for removida.
 */
export function PastaFormModal({ aberto, aoFechar, aoSalvar, pasta, salvando }) {
  const [dados, setDados] = useState(VAZIO);
  const [erro, setErro] = useState(null);
  const [processandoImagem, setProcessandoImagem] = useState(false);
  const arquivoRef = useRef(null);

  // Reabrir o formulário tem que mostrar o registro atual, não o anterior.
  useEffect(() => {
    if (!aberto) return;
    setErro(null);
    setDados(
      pasta
        ? {
            name: pasta.name ?? '',
            description: pasta.description ?? '',
            image: pasta.image ?? '',
            icon: pasta.icon ?? 'Folder',
            color: pasta.color ?? '#00A8CC',
          }
        : VAZIO,
    );
  }, [aberto, pasta]);

  const atualizar = (campo) => (valor) => setDados((atual) => ({ ...atual, [campo]: valor }));

  async function escolherImagem(evento) {
    const arquivo = evento.target.files?.[0];
    // Limpa o input para que escolher o mesmo arquivo de novo continue disparando.
    evento.target.value = '';
    if (!arquivo) return;

    setErro(null);
    setProcessandoImagem(true);
    try {
      atualizar('image')(await reduzirImagem(arquivo));
    } catch (falha) {
      setErro(
        falha instanceof ImagemInvalida ? falha.message : 'Não foi possível preparar a imagem.',
      );
    } finally {
      setProcessandoImagem(false);
    }
  }

  async function enviar(evento) {
    evento.preventDefault();
    setErro(null);
    try {
      await aoSalvar({
        ...dados,
        description: dados.description.trim(),
        // String vazia é como o formulário diz "sem imagem" — a API entende.
        image: dados.image || '',
      });
      aoFechar();
    } catch (falha) {
      setErro(errorMessage(falha, 'Não foi possível salvar a pasta.'));
    }
  }

  const cor = corNoEscuro(dados.color);

  return (
    <Modal
      open={aberto}
      onClose={aoFechar}
      title={pasta ? 'Editar pasta' : 'Nova pasta'}
      description="A pasta orbita a marca na home e organiza a página de todos os setores."
      footer={
        <>
          <Button variant="ghost" onClick={aoFechar}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="formulario-de-pasta"
            disabled={salvando || processandoImagem || !dados.name.trim()}
          >
            {salvando && <Spinner className="h-4 w-4" />}
            {pasta ? 'Salvar' : 'Criar pasta'}
          </Button>
        </>
      }
    >
      <form id="formulario-de-pasta" onSubmit={enviar} className="space-y-4" noValidate>
        {erro && <AvisoDeErro>{erro}</AvisoDeErro>}

        <Input
          label="Nome"
          value={dados.name}
          onChange={(evento) => atualizar('name')(evento.target.value)}
          maxLength={60}
          placeholder="Processos"
          hint={
            pasta
              ? 'Renomear não muda o endereço da pasta — links já compartilhados continuam valendo.'
              : undefined
          }
          required
        />

        <Input
          label="Descrição"
          value={dados.description}
          onChange={(evento) => atualizar('description')(evento.target.value)}
          maxLength={120}
          placeholder="Fluxos, procedimentos e como as coisas andam."
        />

        <Field
          label="Imagem"
          hint="PNG, JPG, WebP ou SVG. É reduzida para 256px antes de subir — não precisa se preocupar com o tamanho do arquivo."
        >
          <div className="flex items-center gap-4">
            <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-hairline bg-ground">
              {processandoImagem ? (
                <Spinner className="h-5 w-5 text-tech" />
              ) : dados.image ? (
                <img src={dados.image} alt="Prévia da imagem" className="h-14 w-14 object-contain" />
              ) : (
                <Icon name={dados.icon} className="h-8 w-8" style={{ color: cor }} />
              )}
            </span>

            <div className="flex flex-wrap gap-2">
              <input
                ref={arquivoRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                onChange={escolherImagem}
                className="sr-only"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => arquivoRef.current?.click()}
                disabled={processandoImagem}
              >
                <ImagePlus className="h-4 w-4" />
                {dados.image ? 'Trocar imagem' : 'Escolher imagem'}
              </Button>

              {dados.image && (
                <Button variant="ghost" size="sm" onClick={() => atualizar('image')('')}>
                  <Trash2 className="h-4 w-4" />
                  Remover
                </Button>
              )}
            </div>
          </div>
        </Field>

        <Field
          label="Ícone"
          hint="Aparece no lugar da imagem enquanto a pasta não tiver uma."
        >
          <div className="grid max-h-40 grid-cols-8 gap-1 overflow-y-auto rounded-lg border border-hairline p-2 sm:grid-cols-11">
            {ICONES_DISPONIVEIS.map((nome) => (
              <button
                key={nome}
                type="button"
                onClick={() => atualizar('icon')(nome)}
                aria-label={nome}
                aria-pressed={dados.icon === nome}
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                  dados.icon === nome
                    ? 'bg-tech/15 text-tech-100 ring-1 ring-tech'
                    : 'text-muted hover:bg-raised hover:text-graphite'
                }`}
              >
                <Icon name={nome} className="h-4 w-4" />
              </button>
            ))}
          </div>
        </Field>

        <Field label="Cor do ícone">
          <div className="flex flex-wrap gap-2">
            {CORES.map((opcao) => (
              <button
                key={opcao.valor}
                type="button"
                onClick={() => atualizar('color')(opcao.valor)}
                aria-label={opcao.nome}
                aria-pressed={dados.color === opcao.valor}
                className={`h-8 w-8 rounded-lg transition-transform ${
                  dados.color === opcao.valor
                    ? 'ring-2 ring-white ring-offset-2 ring-offset-surface'
                    : 'hover:scale-105'
                }`}
                style={{ backgroundColor: corNoEscuro(opcao.valor) }}
              />
            ))}
          </div>
        </Field>
      </form>
    </Modal>
  );
}
