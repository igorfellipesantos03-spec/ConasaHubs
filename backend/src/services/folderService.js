import { prisma } from '../lib/prisma.js';
import { badRequest, notFound } from '../lib/errors.js';
import { slugUnico } from '../lib/slug.js';
import { recordAudit } from './auditService.js';

/**
 * Pastas: o vocabulário de arquivamento da empresa inteira.
 *
 * Quem lê é todo mundo — são elas que orbitam a marca na tela inicial e que
 * organizam a página de cada setor. Quem escreve é a administração: se cada
 * equipe pudesse criar a própria pasta, em um mês existiriam quatro nomes
 * diferentes para a mesma gaveta e a home perderia o sentido.
 */

const campos = {
  id: true,
  slug: true,
  name: true,
  description: true,
  image: true,
  icon: true,
  color: true,
  order: true,
  active: true,
  updatedAt: true,
};

/** O que a home e o formulário de link enxergam: só as pastas no ar. */
export function listActiveFolders() {
  return prisma.folder.findMany({
    where: { active: true },
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
    select: campos,
  });
}

/**
 * A administração vê também as pastas desligadas, para religá-las, e quantos
 * links cada uma guarda — o número é o que segura a mão antes de excluir.
 */
export function listAllFolders() {
  return prisma.folder.findMany({
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
    select: { ...campos, _count: { select: { links: true } } },
  });
}

/**
 * A auditoria guarda o antes e o depois em JSON. A imagem embutida tem dezenas
 * de milhares de caracteres e encheria a tabela sem contar nada de útil — o
 * registro fica com a notícia de que existe imagem, não com a imagem.
 */
function paraAuditoria(registro) {
  if (!registro) return undefined;
  const { image, ...resto } = registro;
  return { ...resto, image: image ? '[imagem embutida]' : null };
}

/** Converte a string vazia do formulário em `null` antes de gravar. */
function normalizar(data) {
  const pronto = { ...data };
  if ('image' in pronto) pronto.image = pronto.image || null;
  if ('description' in pronto) pronto.description = pronto.description || null;
  return pronto;
}

export async function createFolder(actor, data, ip) {
  return prisma.$transaction(async (tx) => {
    const slug = await slugUnico(data.name, async (candidato) =>
      Boolean(await tx.folder.findUnique({ where: { slug: candidato }, select: { id: true } })),
    );

    // Sem posição informada, a pasta nova entra no fim da órbita.
    const order = data.order ?? (await tx.folder.count());

    const folder = await tx.folder.create({
      data: { ...normalizar(data), slug, order, createdById: actor.id },
      select: campos,
    });

    await recordAudit(tx, {
      actor,
      action: 'CREATE',
      entity: 'Folder',
      entityId: folder.id,
      entityLabel: folder.name,
      after: paraAuditoria(folder),
      ip,
    });

    return folder;
  });
}

/**
 * Renomear não mexe no slug de propósito: o endereço da pasta pode já estar
 * colado num e-mail, e trocar o nome da gaveta não deveria quebrar o caminho
 * até ela.
 */
export async function updateFolder(actor, id, data, ip) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.folder.findUnique({ where: { id }, select: campos });
    if (!before) throw notFound('Pasta não encontrada.');

    const folder = await tx.folder.update({
      where: { id },
      data: normalizar(data),
      select: campos,
    });

    await recordAudit(tx, {
      actor,
      action: 'UPDATE',
      entity: 'Folder',
      entityId: folder.id,
      entityLabel: folder.name,
      before: paraAuditoria(before),
      after: paraAuditoria(folder),
      ip,
    });

    return folder;
  });
}

/**
 * Excluir a pasta não leva os links junto: eles voltam para "Sem pasta" na
 * página do setor (`onDelete: SetNull`), à vista de quem os publicou. Apagar o
 * trabalho de outra equipe por causa de uma faxina na taxonomia seria caro
 * demais para um clique.
 */
export async function deleteFolder(actor, id, ip) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.folder.findUnique({ where: { id }, select: campos });
    if (!before) throw notFound('Pasta não encontrada.');

    await tx.folder.delete({ where: { id } });

    await recordAudit(tx, {
      actor,
      action: 'DELETE',
      entity: 'Folder',
      entityId: id,
      entityLabel: before.name,
      before: paraAuditoria(before),
      ip,
    });
  });
}

export async function reorderFolders(actor, items, ip) {
  return prisma.$transaction(async (tx) => {
    const ids = items.map((item) => item.id);
    const existentes = await tx.folder.count({ where: { id: { in: ids } } });
    if (existentes !== ids.length) throw badRequest('Uma ou mais pastas não existem mais.');

    for (const item of items) {
      await tx.folder.update({ where: { id: item.id }, data: { order: item.order } });
    }

    await recordAudit(tx, {
      actor,
      action: 'UPDATE',
      entity: 'Folder',
      entityId: ids[0],
      entityLabel: `reordenação de ${items.length} pasta(s)`,
      ip,
    });
  });
}
