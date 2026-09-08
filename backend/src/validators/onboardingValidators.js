import { z } from 'zod';

/**
 * O wizard manda empresa, filial e CPF — os três compõem a consulta na SRA
 * (`tenantId` + filtro), então nenhum deles pode chegar malformado.
 */
export const onboardingSchema = z.object({
  companyId: z
    .string({ required_error: 'Informe a empresa.' })
    .trim()
    .regex(/^\d{2}$/, 'Empresa inválida.'),
  branchId: z
    .string({ required_error: 'Informe a filial.' })
    .trim()
    .regex(/^\d{1,4}$/, 'Filial inválida.'),
  cpf: z
    .string({ required_error: 'Informe o CPF.' })
    .transform((valor) => valor.replace(/\D/g, ''))
    .refine((valor) => /^\d{11}$/.test(valor), 'CPF inválido.'),
});
