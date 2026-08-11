import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { z } from 'zod';

// Carrega o .env da raiz do backend sem depender de flag de linha de comando,
// para que server, seed e testes enxerguem a mesma configuração.
const envFile = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../.env',
);
if (existsSync(envFile) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(envFile);
}

/**
 * Toda variável de ambiente é validada uma única vez, no boot. Se algo estiver
 * faltando ou malformado o processo morre imediatamente com uma mensagem clara,
 * em vez de falhar mais tarde no meio de um request.
 */
const booleanFromString = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  FRONTEND_ORIGIN: z.string().url(),

  DATABASE_URL: z.string().min(1),

  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET precisa ter ao menos 32 caracteres'),
  ACCESS_TOKEN_TTL_MIN: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_TTL_HOURS: z.coerce.number().int().positive().default(8),
  COOKIE_SECURE: booleanFromString.default('true'),

  PROTHEUS_BASE_URL: z.string().url(),
  PROTHEUS_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  PROTHEUS_DEFAULT_COMPANY: z.string().min(1),
  PROTHEUS_DEFAULT_BRANCH: z.string().min(1),

  ADMIN_USERNAMES: z
    .string()
    .default('')
    .transform((value) =>
      value
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
    ),
});

export function loadEnv(source = process.env) {
  const result = schema.safeParse(source);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Configuração de ambiente inválida:\n${details}`);
  }

  return result.data;
}

export const env = loadEnv();
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
