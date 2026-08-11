import { vi } from 'vitest';

const MODELS = [
  'user',
  'hub',
  'deptMapping',
  'hubCurator',
  'linkCategory',
  'link',
  'favorite',
  'auditLog',
  'refreshToken',
];

const METHODS = [
  'findUnique',
  'findFirst',
  'findMany',
  'create',
  'update',
  'updateMany',
  'upsert',
  'delete',
  'deleteMany',
  'count',
];

/**
 * Prisma falso com todos os métodos usados pelos serviços.
 * `$transaction` executa o callback com o próprio mock, então o código sob
 * teste enxerga o mesmo objeto dentro e fora da transação.
 */
export function createPrismaMock() {
  const client = {};

  for (const model of MODELS) {
    client[model] = {};
    for (const method of METHODS) {
      client[model][method] = vi.fn();
    }
  }

  client.$transaction = vi.fn(async (arg) =>
    typeof arg === 'function' ? arg(client) : Promise.all(arg),
  );
  client.$queryRaw = vi.fn();
  client.$disconnect = vi.fn();

  return client;
}
