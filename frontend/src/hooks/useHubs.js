import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export const chavesDeHub = {
  lista: ['hubs'],
  detalhe: (slug) => ['hub', slug],
};

export function useHubs() {
  return useQuery({
    queryKey: chavesDeHub.lista,
    queryFn: async () => (await api.get('/hubs')).data.hubs,
    staleTime: 60_000,
  });
}

export function useHub(slug) {
  return useQuery({
    queryKey: chavesDeHub.detalhe(slug),
    queryFn: async () => (await api.get(`/hubs/${slug}`)).data.hub,
    enabled: Boolean(slug),
  });
}

/** Invalida tanto o setor aberto quanto a lista (as contagens mudam junto). */
function useInvalidarHub(slug) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: chavesDeHub.detalhe(slug) });
    queryClient.invalidateQueries({ queryKey: chavesDeHub.lista });
  };
}

export function useCriarLink(hub) {
  const invalidar = useInvalidarHub(hub?.slug);
  return useMutation({
    mutationFn: (dados) => api.post(`/hubs/${hub.id}/links`, dados),
    onSuccess: invalidar,
  });
}

export function useAtualizarLink(hub) {
  const invalidar = useInvalidarHub(hub?.slug);
  return useMutation({
    mutationFn: ({ id, ...dados }) => api.patch(`/hubs/${hub.id}/links/${id}`, dados),
    onSuccess: invalidar,
  });
}

export function useRemoverLink(hub) {
  const invalidar = useInvalidarHub(hub?.slug);
  return useMutation({
    mutationFn: (id) => api.delete(`/hubs/${hub.id}/links/${id}`),
    onSuccess: invalidar,
  });
}

export function useReordenarLinks(hub) {
  const invalidar = useInvalidarHub(hub?.slug);
  return useMutation({
    mutationFn: (items) => api.patch(`/hubs/${hub.id}/links/reorder`, { items }),
    onSuccess: invalidar,
  });
}
