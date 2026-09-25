import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

/**
 * Pastas: o vocabulário de arquivamento da empresa.
 *
 * Duas leituras da mesma coisa. A home e o formulário de link recebem só as
 * pastas no ar; a administração recebe todas — inclusive as desligadas, que
 * ela precisa enxergar para religar.
 */
export const chavesDePasta = {
  todas: ['folders'],
  admin: ['folders', 'admin'],
};

export function usePastas() {
  return useQuery({
    queryKey: chavesDePasta.todas,
    queryFn: async () => (await api.get('/folders')).data.folders,
    staleTime: 60_000,
  });
}

export function usePastasDoAdmin() {
  return useQuery({
    queryKey: chavesDePasta.admin,
    queryFn: async () => (await api.get('/admin/folders')).data.folders,
  });
}

/** Mexer na lista muda a home de todo mundo: as duas leituras caem juntas. */
function useInvalidarPastas() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: chavesDePasta.todas });
    queryClient.invalidateQueries({ queryKey: chavesDePasta.admin });
  };
}

export function useCriarPasta() {
  const invalidar = useInvalidarPastas();
  return useMutation({
    mutationFn: (dados) => api.post('/admin/folders', dados),
    onSuccess: invalidar,
  });
}

export function useAtualizarPasta() {
  const invalidar = useInvalidarPastas();
  return useMutation({
    mutationFn: ({ id, ...dados }) => api.patch(`/admin/folders/${id}`, dados),
    onSuccess: invalidar,
  });
}

export function useRemoverPasta() {
  const invalidar = useInvalidarPastas();
  return useMutation({
    mutationFn: (id) => api.delete(`/admin/folders/${id}`),
    onSuccess: invalidar,
  });
}

export function useReordenarPastas() {
  const invalidar = useInvalidarPastas();
  return useMutation({
    mutationFn: (items) => api.patch('/admin/folders/reorder', { items }),
    onSuccess: invalidar,
  });
}
