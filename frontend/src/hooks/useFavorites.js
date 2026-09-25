import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export const chaveDeFavoritos = ['favorites'];

export function useFavoritos() {
  return useQuery({
    queryKey: chaveDeFavoritos,
    queryFn: async () => (await api.get('/favorites')).data.favorites,
    staleTime: 30_000,
  });
}

/**
 * A estrela responde na hora: o estado do link é atualizado no cache antes da
 * resposta do servidor e revertido se a chamada falhar.
 */
export function useAlternarFavorito(hubSlug) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ linkId, favoritado }) =>
      favoritado ? api.delete(`/favorites/${linkId}`) : api.post('/favorites', { linkId }),

    onMutate: async ({ linkId, favoritado }) => {
      const chaveDoHub = ['hub', hubSlug];
      await queryClient.cancelQueries({ queryKey: chaveDoHub });
      const anterior = queryClient.getQueryData(chaveDoHub);

      queryClient.setQueryData(chaveDoHub, (hub) => {
        if (!hub) return hub;
        const alternar = (link) =>
          link.id === linkId ? { ...link, isFavorite: !favoritado } : link;
        return {
          ...hub,
          folders: hub.folders.map((pasta) => ({
            ...pasta,
            links: pasta.links.map(alternar),
          })),
          uncategorizedLinks: hub.uncategorizedLinks.map(alternar),
        };
      });

      return { anterior, chaveDoHub };
    },

    onError: (_erro, _variaveis, contexto) => {
      if (contexto?.anterior) {
        queryClient.setQueryData(contexto.chaveDoHub, contexto.anterior);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: chaveDeFavoritos });
    },
  });
}
