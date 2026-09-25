import { useEffect, useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Field, Input, Select, Textarea } from '../../components/ui/Field';
import { AvisoDeErro, Spinner } from '../../components/ui/Feedback';
import { Icon, ICONES_DISPONIVEIS } from '../../components/ui/Icon';
import { corNoEscuro } from '../../utils/texto';
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

const VAZIO = {
  title: '',
  description: '',
  url: '',
  icon: 'Link',
  color: '#00A8CC',
  folderId: '',
  visibility: 'PUBLIC',
};

export function LinkFormModal({
  aberto,
  aoFechar,
  aoSalvar,
  link,
  pastas = [],
  pastaInicial = '',
  salvando,
}) {
  const [dados, setDados] = useState(VAZIO);
  const [erro, setErro] = useState(null);

  const editando = Boolean(link);

  useEffect(() => {
    if (!aberto) return;
    setErro(null);
    setDados(
      link
        ? {
            title: link.title,
            description: link.description ?? '',
            url: link.url,
            icon: link.icon,
            color: link.color,
            folderId: link.folderId ?? '',
            visibility: link.visibility,
          }
        // Quem clicou em "Adicionar" no título de uma pasta já disse onde
        // quer o link; repetir a escolha no formulário seria trabalho à toa.
        : { ...VAZIO, folderId: pastaInicial },
    );
  }, [aberto, link, pastaInicial]);

  const atualizar = (campo) => (evento) =>
    setDados((atual) => ({ ...atual, [campo]: evento.target.value }));

  async function salvar(evento) {
    evento.preventDefault();
    setErro(null);

    try {
      await aoSalvar({
        ...dados,
        description: dados.description.trim(),
        folderId: dados.folderId || null,
      });
      aoFechar();
    } catch (falha) {
      setErro(errorMessage(falha, 'Não foi possível salvar o link.'));
    }
  }

  return (
    <Modal
      open={aberto}
      onClose={aoFechar}
      title={editando ? 'Editar link' : 'Novo link'}
      description={editando ? link.title : 'O link aparece para toda a empresa, salvo se restrito.'}
      footer={
        <>
          <Button variant="ghost" onClick={aoFechar}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="formulario-de-link"
            disabled={salvando || !dados.title.trim() || !dados.url.trim()}
          >
            {salvando ? <Spinner className="h-4 w-4" /> : null}
            {editando ? 'Salvar alterações' : 'Adicionar link'}
          </Button>
        </>
      }
    >
      <form id="formulario-de-link" onSubmit={salvar} className="space-y-4" noValidate>
        {erro && <AvisoDeErro>{erro}</AvisoDeErro>}

        <Input
          label="Título"
          required
          maxLength={80}
          value={dados.title}
          onChange={atualizar('title')}
          placeholder="Protheus"
        />

        <Input
          label="Endereço"
          required
          inputMode="url"
          value={dados.url}
          onChange={atualizar('url')}
          placeholder="https://protheus.conasa.com"
          hint="Comece com http:// ou https://"
        />

        <Textarea
          label="Descrição"
          maxLength={200}
          value={dados.description}
          onChange={atualizar('description')}
          placeholder="Para que serve, em uma linha."
        />

        <div className="grid gap-4 sm:grid-cols-2">
          {/* A pasta é a mesma para a empresa inteira: é ela que orbita a
              home, e quem chega de lá espera achar o link aqui dentro. */}
          <Select label="Pasta" value={dados.folderId} onChange={atualizar('folderId')}>
            <option value="">Sem pasta</option>
            {pastas.map((pasta) => (
              <option key={pasta.id} value={pasta.id}>
                {pasta.name}
              </option>
            ))}
          </Select>

          <Select label="Quem vê" value={dados.visibility} onChange={atualizar('visibility')}>
            <option value="PUBLIC">Toda a empresa</option>
            <option value="HUB_ONLY">Somente este setor</option>
          </Select>
        </div>

        <Field label="Cor">
          <div className="flex flex-wrap gap-2">
            {CORES.map((cor) => (
              <button
                key={cor.valor}
                type="button"
                onClick={() => setDados((atual) => ({ ...atual, color: cor.valor }))}
                aria-label={cor.nome}
                aria-pressed={dados.color === cor.valor}
                className={`h-8 w-8 rounded-lg transition-transform ${
                  dados.color === cor.valor
                    ? 'ring-2 ring-white ring-offset-2 ring-offset-surface'
                    : 'hover:scale-105'
                }`}
                // A amostra mostra a cor como ela vai aparecer no card escuro,
                // não o hexadecimal cru que fica guardado no banco.
                style={{ backgroundColor: corNoEscuro(cor.valor) }}
              />
            ))}
          </div>
        </Field>

        <Field label="Ícone">
          <div className="grid max-h-40 grid-cols-8 gap-1 overflow-y-auto rounded-lg border border-hairline p-2 sm:grid-cols-11">
            {ICONES_DISPONIVEIS.map((nome) => (
              <button
                key={nome}
                type="button"
                onClick={() => setDados((atual) => ({ ...atual, icon: nome }))}
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

        <div className="rounded-lg border border-hairline bg-ground/60 p-3">
          <p className="eyebrow mb-2">Prévia</p>
          <div className="flex items-center gap-3">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{
                backgroundColor: `${corNoEscuro(dados.color)}1f`,
                color: corNoEscuro(dados.color),
              }}
            >
              <Icon name={dados.icon} />
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium text-graphite">{dados.title || 'Título do link'}</p>
              <p className="truncate text-sm text-muted">
                {dados.description || dados.url || 'Descrição'}
              </p>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}
