import { useMutation } from '@tanstack/react-query';
import { api } from '../services/api';

/**
 * Conclui o cadastro inicial. O backend confirma quem é a pessoa no Protheus,
 * vincula (ou cria) o hub do setor dela e devolve o usuário já completo.
 */
export function useConcluirCadastro() {
  return useMutation({
    mutationFn: async ({ companyId, branchId, cpf }) => {
      const { data } = await api.post('/onboarding/complete', { companyId, branchId, cpf });
      return data.user;
    },
  });
}
