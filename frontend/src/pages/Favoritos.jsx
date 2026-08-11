import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useFavoritos, chaveDeFavoritos } from '../hooks/useFavorites';
import { api, errorMessage } from '../services/api';
import { LinkCard } from '../features/links/LinkCard';
import { AvisoDeErro, EsqueletoDeCards, EstadoVazio, useToast } from '../components/ui/Feedback';

export default function Favoritos() {
  const { data: favoritos, isLoading, isError, error } = useFavoritos();
  const queryClient = useQueryClient();
  const toast = useToast();

  async function desfavoritar(link) {
    try {
      await api.delete(`/favorites/${link.id}`);
      queryClient.invalidateQueries({ queryKey: chaveDeFavoritos });
      queryClient.invalidateQueries({ queryKey: ['hub', link.hubSlug] });
      toast.sucesso(`${link.title} saiu dos favoritos.`);
    } catch (falha) {
      toast.erro(errorMessage(falha, 'Não foi possível remover o favorito.'));
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow text-tech">Atalhos</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">Meus favoritos</h1>
        <p className="mt-1 text-muted">Os links que você marcou com estrela, de qualquer setor.</p>
      </header>

      {isLoading && <EsqueletoDeCards quantidade={3} />}
      {isError && <AvisoDeErro>{errorMessage(error, 'Não foi possível carregar seus favoritos.')}</AvisoDeErro>}

      {favoritos &&
        (favoritos.length === 0 ? (
          <EstadoVazio
            icone="Star"
            titulo="Nenhum favorito ainda"
            descricao="Marque a estrela em qualquer link e ele aparece aqui."
            acao={
              <Link
                to="/setores"
                className="inline-flex h-10 items-center rounded-lg border border-hairline bg-surface px-4 text-sm font-medium text-graphite transition-colors hover:border-ink-300 hover:bg-ground"
              >
                Ver os setores
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {favoritos.map((link, indice) => (
              <div key={link.id} className="animate-rise" style={{ animationDelay: `${indice * 24}ms` }}>
                <LinkCard link={link} aoAlternarFavorito={desfavoritar} />
              </div>
            ))}
          </div>
        ))}
    </div>
  );
}
