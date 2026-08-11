import { z } from 'zod';

export const loginSchema = z.object({
  username: z
    .string({ required_error: 'Informe o usuário.' })
    .trim()
    .min(1, 'Informe o usuário.')
    .max(100),
  password: z
    .string({ required_error: 'Informe a senha.' })
    .min(1, 'Informe a senha.')
    .max(200),
});
