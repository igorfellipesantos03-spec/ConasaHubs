-- Pastas: a taxonomia de links passa a ser uma só para a empresa inteira.
--
-- Antes cada setor criava as próprias seções (`link_categories`) e a home
-- orbitava atalhos avulsos (`portal_links`). Agora existe um único conjunto de
-- pastas, curado pela administração: é ele que orbita a marca na tela inicial
-- e é nele que cada setor arquiva os próprios links.
--
-- Nada do que já estava cadastrado se perde: cada seção existente vira uma
-- pasta (casada pelo nome, então "Sistemas" de três setores vira uma pasta só)
-- e os links seguem apontando para ela.

-- Normaliza o nome em identificador de URL. Existe só durante a migração.
CREATE OR REPLACE FUNCTION centralhub_slugify(origem text) RETURNS text AS $$
  SELECT trim(both '-' from lower(regexp_replace(
    translate(
      origem,
      'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
      'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'
    ),
    '[^a-zA-Z0-9]+', '-', 'g')));
$$ LANGUAGE sql IMMUTABLE;

-- CreateTable
CREATE TABLE "folders" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "icon" TEXT NOT NULL DEFAULT 'Folder',
    "color" TEXT NOT NULL DEFAULT '#00A8CC',
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "folders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "folders_slug_key" ON "folders"("slug");

-- CreateIndex
CREATE INDEX "folders_active_order_idx" ON "folders"("active", "order");

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Os seis grupos padrão. Nascem com id fixo para o seed reconhecê-los, mas são
-- registros comuns: o admin renomeia, troca cor, reordena ou desliga.
INSERT INTO "folders" ("id", "slug", "name", "description", "icon", "color", "order", "active", "createdAt", "updatedAt") VALUES
  ('f0000000-0000-4000-8000-000000000001', 'processos',   'Processos',   'Fluxos, procedimentos e como as coisas andam.', 'Workflow',  '#00A8CC', 0, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('f0000000-0000-4000-8000-000000000002', 'riscos',      'Riscos',      'Controles, conformidade e segurança.',          'ShieldCheck', '#B42318', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('f0000000-0000-4000-8000-000000000003', 'gestao',      'Gestão',      'Planejamento, metas e acompanhamento.',         'Briefcase', '#6941C6', 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('f0000000-0000-4000-8000-000000000004', 'orcamento',   'Orçamento',   'Custos, previsão e prestação de contas.',       'Wallet',    '#067647', 3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('f0000000-0000-4000-8000-000000000005', 'indicadores', 'Indicadores', 'Números que a equipe acompanha.',               'BarChart3', '#B54708', 4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('f0000000-0000-4000-8000-000000000006', 'sistemas',    'Sistemas',    'Os sistemas usados no dia a dia.',              'Database',  '#0F2C59', 5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- AlterTable
ALTER TABLE "links" ADD COLUMN "folderId" TEXT;

-- As seções que já existiam e não coincidem com nenhuma pasta padrão viram
-- pastas também: ninguém perde o agrupamento que montou.
INSERT INTO "folders" ("id", "slug", "name", "icon", "color", "order", "active", "createdAt", "updatedAt")
SELECT
  md5(random()::text || clock_timestamp()::text || existentes.name)::uuid::text,
  existentes.slug,
  existentes.name,
  'Folder',
  '#475467',
  100 + row_number() OVER (ORDER BY existentes.name),
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT ON (centralhub_slugify(name)) name, centralhub_slugify(name) AS slug
  FROM "link_categories"
  WHERE centralhub_slugify(name) <> ''
  ORDER BY centralhub_slugify(name), name
) existentes
WHERE NOT EXISTS (SELECT 1 FROM "folders" f WHERE f.slug = existentes.slug);

-- Cada link segue para a pasta de mesmo nome da seção em que estava.
UPDATE "links" l
SET "folderId" = f."id"
FROM "link_categories" c
JOIN "folders" f ON f."slug" = centralhub_slugify(c."name")
WHERE l."categoryId" = c."id";

-- AddForeignKey
ALTER TABLE "links" ADD CONSTRAINT "links_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
DROP INDEX "links_hubId_categoryId_order_idx";
CREATE INDEX "links_hubId_folderId_order_idx" ON "links"("hubId", "folderId", "order");

-- DropTable
ALTER TABLE "links" DROP COLUMN "categoryId";
DROP TABLE "link_categories";

-- A home deixa de ter atalho próprio: quem orbita a marca agora são as pastas.
DROP TABLE IF EXISTS "portal_links";

DROP FUNCTION centralhub_slugify(text);
