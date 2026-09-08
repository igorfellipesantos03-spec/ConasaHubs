import { z } from 'zod';

/**
 * URLs de link são clicadas por toda a empresa: só http(s), nunca `javascript:`
 * ou `data:`. A validação acontece na entrada, não na renderização.
 */
export const urlSchema = z
  .string({ required_error: 'Informe o endereço do link.' })
  .trim()
  .min(1, 'Informe o endereço do link.')
  .max(2048, 'Endereço muito longo.')
  .refine((value) => {
    try {
      const { protocol } = new URL(value);
      return protocol === 'http:' || protocol === 'https:';
    } catch {
      return false;
    }
  }, 'Endereço inválido. Use um endereço começando com http:// ou https://');

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida. Use o formato #RRGGBB.');

/** Nome de ícone da biblioteca lucide-react, em PascalCase. */
const iconName = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .regex(/^[A-Z][A-Za-z0-9]*$/, 'Ícone inválido.');

export const createLinkSchema = z.object({
  title: z.string().trim().min(1, 'Informe o título.').max(80),
  description: z.string().trim().max(200).optional().or(z.literal('')),
  url: urlSchema,
  icon: iconName.default('Link'),
  color: hexColor.default('#00A8CC'),
  categoryId: z.string().uuid().nullable().optional(),
  visibility: z.enum(['PUBLIC', 'HUB_ONLY']).default('PUBLIC'),
});

export const updateLinkSchema = createLinkSchema.partial().extend({
  active: z.boolean().optional(),
});

export const reorderSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().uuid(),
        order: z.number().int().min(0),
        categoryId: z.string().uuid().nullable().optional(),
      }),
    )
    .min(1, 'Nada para reordenar.')
    .max(200),
});

export const categorySchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome da seção.').max(60),
  order: z.number().int().min(0).optional(),
});

export const hubSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, 'Informe o identificador do setor.')
    .max(40)
    .regex(/^[a-z0-9-]+$/, 'Use apenas letras minúsculas, números e hífen.'),
  name: z.string().trim().min(2, 'Informe o nome do setor.').max(80),
  description: z.string().trim().max(200).optional().or(z.literal('')),
  icon: iconName.default('LayoutGrid'),
  color: hexColor.default('#0F2C59'),
  order: z.number().int().min(0).optional(),
});

export const updateHubSchema = hubSchema.partial().extend({
  active: z.boolean().optional(),
});

/**
 * O que um curador pode mudar no próprio setor: como ele se apresenta.
 * `slug` (endereço), `order` (posição na lista) e `active` continuam com o
 * admin — mexem em como o setor aparece para a empresa inteira.
 */
export const curatorHubSchema = hubSchema
  .pick({ name: true, description: true, icon: true, color: true })
  .partial()
  .strict('Só o nome, a descrição, o ícone e a cor podem ser alterados por curadores.');
