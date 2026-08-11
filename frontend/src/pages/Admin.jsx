import { useState } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';
import { useHubs } from '../hooks/useHubs';
import {
  useAdicionarCurador,
  useAtualizarUsuario,
  useAuditoria,
  useCuradores,
  useMapeamentos,
  useRemoverCurador,
  useRemoverMapeamento,
  useSalvarMapeamento,
  useUsuarios,
} from '../hooks/useAdmin';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Field';
import { AvisoDeErro, CarregandoPagina, EstadoVazio, useToast } from '../components/ui/Feedback';
import { errorMessage } from '../services/api';

const ABAS = [
  { id: 'usuarios', rotulo: 'Usuários' },
  { id: 'curadores', rotulo: 'Curadores' },
  { id: 'departamentos', rotulo: 'Departamentos' },
  { id: 'auditoria', rotulo: 'Auditoria' },
];

export default function Admin() {
  const [aba, setAba] = useState('usuarios');

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[28px] font-extrabold text-ink">Administração</h1>
        <p className="mt-1.5 text-[15px] text-muted">
          Quem administra, quem cura cada setor e de onde vem o setor de cada pessoa.
        </p>
      </header>

      <div
        className="inline-flex gap-1 overflow-x-auto rounded-control bg-ground p-1"
        role="tablist"
      >
        {ABAS.map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={aba === item.id}
            onClick={() => setAba(item.id)}
            className={`whitespace-nowrap rounded-[9px] px-3.5 py-2 text-sm font-semibold transition-all ${
              aba === item.id
                ? 'bg-surface text-ink shadow-soft'
                : 'text-muted hover:text-graphite'
            }`}
          >
            {item.rotulo}
          </button>
        ))}
      </div>

      {aba === 'usuarios' && <AbaUsuarios />}
      {aba === 'curadores' && <AbaCuradores />}
      {aba === 'departamentos' && <AbaDepartamentos />}
      {aba === 'auditoria' && <AbaAuditoria />}
    </div>
  );
}

function AbaUsuarios() {
  const [busca, setBusca] = useState('');
  const { data, isLoading, isError, error } = useUsuarios(busca);
  const { data: hubs = [] } = useHubs();
  const atualizar = useAtualizarUsuario();
  const toast = useToast();

  async function salvar(usuario, mudanca, descricao) {
    try {
      await atualizar.mutateAsync({ id: usuario.id, ...mudanca });
      toast.sucesso(descricao);
    } catch (falha) {
      toast.erro(errorMessage(falha, 'Não foi possível atualizar o usuário.'));
    }
  }

  return (
    <section className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input
          value={busca}
          onChange={(evento) => setBusca(evento.target.value)}
          placeholder="Buscar por nome ou usuário"
          aria-label="Buscar usuário"
          className="w-full rounded-control border border-hairline bg-surface py-2.5 pl-10 pr-3 text-sm transition-colors focus:border-tech focus:outline-none focus:ring-4 focus:ring-tech/10"
        />
      </div>

      {isLoading && <CarregandoPagina rotulo="Carregando usuários" />}
      {isError && <AvisoDeErro>{errorMessage(error, 'Não foi possível carregar os usuários.')}</AvisoDeErro>}

      {data?.users?.length === 0 && (
        <EstadoVazio
          icone="Users"
          titulo="Nenhum usuário encontrado"
          descricao="Os usuários aparecem aqui depois do primeiro login no CentralHub."
        />
      )}

      {data?.users?.length > 0 && (
        <Tabela cabecalho={['Pessoa', 'Departamento (Protheus)', 'Setor', 'Papel', 'Situação']}>
          {data.users.map((usuario) => (
            <tr key={usuario.id} className="border-t border-hairline">
              <td className="px-4 py-3">
                <p className="font-medium text-graphite">{usuario.name}</p>
                <p className="text-xs text-muted">{usuario.username}</p>
              </td>
              <td className="px-4 py-3 text-muted">
                {usuario.protheusDeptName ?? '—'}
                {usuario.protheusDeptCode && (
                  <span className="ml-1 text-xs">({usuario.protheusDeptCode})</span>
                )}
              </td>
              <td className="px-4 py-3">
                <select
                  value={usuario.hubId ?? ''}
                  onChange={(evento) =>
                    salvar(
                      usuario,
                      { hubId: evento.target.value || null },
                      `Setor de ${usuario.name} atualizado.`,
                    )
                  }
                  className="w-full rounded-lg border border-hairline bg-surface px-2.5 py-2 text-sm transition-colors focus:border-tech focus:outline-none"
                >
                  <option value="">Sem setor</option>
                  {hubs.map((hub) => (
                    <option key={hub.id} value={hub.id}>
                      {hub.name}
                    </option>
                  ))}
                </select>
                {usuario.hubOverride && (
                  <span className="mt-1 block text-xs font-semibold text-ink-400">definido manualmente</span>
                )}
              </td>
              <td className="px-4 py-3">
                <select
                  value={usuario.role}
                  onChange={(evento) =>
                    salvar(usuario, { role: evento.target.value }, `Papel de ${usuario.name} atualizado.`)
                  }
                  className="rounded-lg border border-hairline bg-surface px-2.5 py-2 text-sm transition-colors focus:border-tech focus:outline-none"
                >
                  <option value="USER">Usuário</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={() =>
                    salvar(
                      usuario,
                      { active: !usuario.active },
                      usuario.active ? `${usuario.name} desativado.` : `${usuario.name} reativado.`,
                    )
                  }
                  className={`pill transition-colors ${
                    usuario.active
                      ? 'bg-success/10 text-success hover:bg-success/20'
                      : 'bg-danger/10 text-danger hover:bg-danger/20'
                  }`}
                >
                  {usuario.active ? 'ativo' : 'inativo'}
                </button>
              </td>
            </tr>
          ))}
        </Tabela>
      )}
    </section>
  );
}

function AbaCuradores() {
  const { data: curadores, isLoading } = useCuradores();
  const { data: hubs = [] } = useHubs();
  const { data: usuarios } = useUsuarios('');
  const adicionar = useAdicionarCurador();
  const remover = useRemoverCurador();
  const toast = useToast();

  const [novo, setNovo] = useState({ userId: '', hubId: '' });

  async function conceder(evento) {
    evento.preventDefault();
    try {
      await adicionar.mutateAsync(novo);
      setNovo({ userId: '', hubId: '' });
      toast.sucesso('Curadoria concedida.');
    } catch (falha) {
      toast.erro(errorMessage(falha, 'Não foi possível conceder a curadoria.'));
    }
  }

  return (
    <section className="space-y-4">
      <form onSubmit={conceder} className="card flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[200px] flex-1">
          <Select
            label="Pessoa"
            value={novo.userId}
            onChange={(evento) => setNovo((atual) => ({ ...atual, userId: evento.target.value }))}
            required
          >
            <option value="">Selecione</option>
            {usuarios?.users?.map((usuario) => (
              <option key={usuario.id} value={usuario.id}>
                {usuario.name} ({usuario.username})
              </option>
            ))}
          </Select>
        </div>

        <div className="min-w-[180px] flex-1">
          <Select
            label="Setor"
            value={novo.hubId}
            onChange={(evento) => setNovo((atual) => ({ ...atual, hubId: evento.target.value }))}
            required
          >
            <option value="">Selecione</option>
            {hubs.map((hub) => (
              <option key={hub.id} value={hub.id}>
                {hub.name}
              </option>
            ))}
          </Select>
        </div>

        <Button type="submit" disabled={!novo.userId || !novo.hubId || adicionar.isPending}>
          <Plus className="h-4 w-4" />
          Conceder curadoria
        </Button>
      </form>

      {isLoading && <CarregandoPagina rotulo="Carregando curadores" />}

      {curadores?.length === 0 && (
        <EstadoVazio
          icone="ShieldCheck"
          titulo="Nenhum curador designado"
          descricao="Sem curadores, apenas administradores conseguem editar os links dos setores."
        />
      )}

      {curadores?.length > 0 && (
        <Tabela cabecalho={['Pessoa', 'Setor', 'Desde', '']}>
          {curadores.map((curador) => (
            <tr key={`${curador.userId}-${curador.hubId}`} className="border-t border-hairline">
              <td className="px-4 py-3">
                <p className="font-medium text-graphite">{curador.name}</p>
                <p className="text-xs text-muted">{curador.username}</p>
              </td>
              <td className="px-4 py-3 text-graphite">{curador.hubName}</td>
              <td className="px-4 py-3 text-xs text-muted">
                {new Date(curador.since).toLocaleDateString('pt-BR')}
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await remover.mutateAsync({ userId: curador.userId, hubId: curador.hubId });
                      toast.sucesso('Curadoria removida.');
                    } catch (falha) {
                      toast.erro(errorMessage(falha, 'Não foi possível remover a curadoria.'));
                    }
                  }}
                  aria-label={`Remover ${curador.name} da curadoria de ${curador.hubName}`}
                  className="rounded p-1.5 text-muted transition-colors hover:bg-danger/5 hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </Tabela>
      )}
    </section>
  );
}

function AbaDepartamentos() {
  const { data: mapeamentos, isLoading } = useMapeamentos();
  const { data: hubs = [] } = useHubs();
  const salvar = useSalvarMapeamento();
  const remover = useRemoverMapeamento();
  const toast = useToast();

  const [novo, setNovo] = useState({ protheusDeptCode: '', protheusDeptName: '', hubId: '' });

  async function criar(evento) {
    evento.preventDefault();
    try {
      await salvar.mutateAsync(novo);
      setNovo({ protheusDeptCode: '', protheusDeptName: '', hubId: '' });
      toast.sucesso('Mapeamento salvo.');
    } catch (falha) {
      toast.erro(errorMessage(falha, 'Não foi possível salvar o mapeamento.'));
    }
  }

  return (
    <section className="space-y-4">
      <p className="text-sm text-muted">
        No login, o departamento que vem do Protheus define o setor da pessoa. Cada código abaixo
        aponta para um hub; quem tem setor definido manualmente não é afetado.
      </p>

      <form onSubmit={criar} className="card flex flex-wrap items-end gap-3 p-4">
        <div className="w-32">
          <Input
            label="Código"
            value={novo.protheusDeptCode}
            onChange={(evento) =>
              setNovo((atual) => ({ ...atual, protheusDeptCode: evento.target.value }))
            }
            placeholder="001"
            required
          />
        </div>
        <div className="min-w-[180px] flex-1">
          <Input
            label="Nome no Protheus"
            value={novo.protheusDeptName}
            onChange={(evento) =>
              setNovo((atual) => ({ ...atual, protheusDeptName: evento.target.value }))
            }
            placeholder="TECNOLOGIA DA INFORMACAO"
          />
        </div>
        <div className="min-w-[180px] flex-1">
          <Select
            label="Setor no CentralHub"
            value={novo.hubId}
            onChange={(evento) => setNovo((atual) => ({ ...atual, hubId: evento.target.value }))}
            required
          >
            <option value="">Selecione</option>
            {hubs.map((hub) => (
              <option key={hub.id} value={hub.id}>
                {hub.name}
              </option>
            ))}
          </Select>
        </div>
        <Button type="submit" disabled={!novo.protheusDeptCode || !novo.hubId || salvar.isPending}>
          Salvar mapeamento
        </Button>
      </form>

      {isLoading && <CarregandoPagina rotulo="Carregando mapeamentos" />}

      {mapeamentos?.length === 0 && (
        <EstadoVazio
          icone="Map"
          titulo="Nenhum departamento mapeado"
          descricao="Sem mapeamento, as pessoas entram sem setor e você atribui manualmente na aba Usuários."
        />
      )}

      {mapeamentos?.length > 0 && (
        <Tabela cabecalho={['Código', 'Nome no Protheus', 'Setor', '']}>
          {mapeamentos.map((mapeamento) => (
            <tr key={mapeamento.id} className="border-t border-hairline">
              <td className="px-4 py-3 text-sm font-semibold text-graphite">
                {mapeamento.protheusDeptCode}
              </td>
              <td className="px-4 py-3 text-muted">{mapeamento.protheusDeptName ?? '—'}</td>
              <td className="px-4 py-3 text-graphite">{mapeamento.hub.name}</td>
              <td className="px-4 py-3 text-right">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await remover.mutateAsync(mapeamento.id);
                      toast.sucesso('Mapeamento removido.');
                    } catch (falha) {
                      toast.erro(errorMessage(falha, 'Não foi possível remover o mapeamento.'));
                    }
                  }}
                  aria-label={`Remover o mapeamento do código ${mapeamento.protheusDeptCode}`}
                  className="rounded p-1.5 text-muted transition-colors hover:bg-danger/5 hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </Tabela>
      )}
    </section>
  );
}

const ACOES = { CREATE: 'criou', UPDATE: 'alterou', DELETE: 'removeu' };
const ENTIDADES = {
  Link: 'link',
  Hub: 'setor',
  LinkCategory: 'seção',
  HubCurator: 'curadoria',
  DeptMapping: 'mapeamento',
  User: 'usuário',
};

function AbaAuditoria() {
  const [pagina, setPagina] = useState(1);
  const { data, isLoading } = useAuditoria(pagina);

  if (isLoading) return <CarregandoPagina rotulo="Carregando auditoria" />;
  if (!data?.items?.length) {
    return (
      <EstadoVazio
        icone="ClipboardList"
        titulo="Nada registrado ainda"
        descricao="Toda criação, alteração e exclusão passa a aparecer aqui."
      />
    );
  }

  const totalDePaginas = Math.ceil(data.total / data.pageSize);

  return (
    <section className="space-y-4">
      <Tabela cabecalho={['Quando', 'Quem', 'O quê', 'Origem']}>
        {data.items.map((registro) => (
          <tr key={registro.id} className="border-t border-hairline">
            <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">
              {new Date(registro.createdAt).toLocaleString('pt-BR')}
            </td>
            <td className="px-4 py-3 text-graphite">{registro.actorName}</td>
            <td className="px-4 py-3 text-graphite">
              {ACOES[registro.action]} {ENTIDADES[registro.entity] ?? registro.entity}
              {registro.entityLabel && (
                <span className="text-muted"> · {registro.entityLabel}</span>
              )}
            </td>
            <td className="px-4 py-3 text-xs text-muted">{registro.ip ?? '—'}</td>
          </tr>
        ))}
      </Tabela>

      {totalDePaginas > 1 && (
        <div className="flex items-center justify-between">
          <p className="eyebrow">
            Página {pagina} de {totalDePaginas}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={pagina === 1} onClick={() => setPagina((p) => p - 1)}>
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagina >= totalDePaginas}
              onClick={() => setPagina((p) => p + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

function Tabela({ cabecalho, children }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[680px] text-left text-sm">
        <thead>
          <tr className="bg-ground/70">
            {cabecalho.map((titulo, indice) => (
              <th key={indice} scope="col" className="px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-muted">
                {titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
