import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { chavesDeHub } from './useHubs';

export function useUsuarios(busca) {
  return useQuery({
    queryKey: ['admin', 'users', busca],
    queryFn: async () =>
      (await api.get('/admin/users', { params: { search: busca || undefined, pageSize: 50 } })).data,
  });
}

export function useAtualizarUsuario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dados }) => api.patch(`/admin/users/${id}`, dados),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useCuradores() {
  return useQuery({
    queryKey: ['admin', 'curators'],
    queryFn: async () => (await api.get('/admin/curators')).data.curators,
  });
}

function useInvalidarCuradoria() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'curators'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    queryClient.invalidateQueries({ queryKey: chavesDeHub.lista });
  };
}

export function useAdicionarCurador() {
  const invalidar = useInvalidarCuradoria();
  return useMutation({
    mutationFn: (dados) => api.post('/admin/curators', dados),
    onSuccess: invalidar,
  });
}

export function useRemoverCurador() {
  const invalidar = useInvalidarCuradoria();
  return useMutation({
    mutationFn: ({ userId, hubId }) => api.delete(`/admin/curators/${userId}/${hubId}`),
    onSuccess: invalidar,
  });
}

export function useMapeamentos() {
  return useQuery({
    queryKey: ['admin', 'dept-mappings'],
    queryFn: async () => (await api.get('/admin/dept-mappings')).data.mappings,
  });
}

export function useSalvarMapeamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dados) => api.put('/admin/dept-mappings', dados),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'dept-mappings'] }),
  });
}

export function useRemoverMapeamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete(`/admin/dept-mappings/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'dept-mappings'] }),
  });
}

export function useAuditoria(pagina = 1) {
  return useQuery({
    queryKey: ['admin', 'audit', pagina],
    queryFn: async () => (await api.get('/admin/audit', { params: { page: pagina, pageSize: 30 } })).data,
  });
}
