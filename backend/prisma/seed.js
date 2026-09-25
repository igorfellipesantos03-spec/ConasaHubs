import { env } from '../src/config/env.js';
import { prisma } from '../src/lib/prisma.js';

const adminUsernames = env.ADMIN_USERNAMES;

/**
 * Hubs iniciais. Cada `deptCodes` lista os códigos de departamento do Protheus
 * (tabela SRA) que caem neste hub — ajuste conforme o cadastro real da Conasa.
 */
const hubs = [
  {
    slug: 'ti',
    name: 'Tecnologia da Informação',
    description: 'Sistemas, automações e documentação técnica.',
    icon: 'Cpu',
    color: '#0F2C59',
    order: 1,
    deptCodes: [],
    pastas: [
      {
        slug: 'sistemas',
        links: [
          {
            title: 'Protheus',
            description: 'ERP corporativo TOTVS.',
            url: 'https://protheus.conasa.com',
            icon: 'Database',
          },
          {
            title: 'n8n',
            description: 'Plataforma de automação de fluxos.',
            url: 'https://n8n.conasa.com',
            icon: 'Workflow',
          },
        ],
      },
      {
        slug: 'processos',
        links: [
          {
            title: 'Documentações técnicas',
            description: 'Base de conhecimento e procedimentos da TI.',
            url: 'https://docs.conasa.com',
            icon: 'BookOpen',
          },
        ],
      },
    ],
  },
  {
    slug: 'rh',
    name: 'Recursos Humanos',
    description: 'Pessoas, benefícios e processos de RH.',
    icon: 'Users',
    color: '#00A8CC',
    order: 2,
    deptCodes: [],
    pastas: [],
  },
  {
    slug: 'financeiro',
    name: 'Financeiro',
    description: 'Contas, faturamento e controladoria.',
    icon: 'Landmark',
    color: '#0F2C59',
    order: 3,
    deptCodes: [],
    pastas: [],
  },
  {
    slug: 'comercial',
    name: 'Comercial',
    description: 'Vendas, propostas e relacionamento com clientes.',
    icon: 'Handshake',
    color: '#00A8CC',
    order: 4,
    deptCodes: [],
    pastas: [],
  },
  {
    slug: 'operacoes',
    name: 'Operações',
    description: 'Execução, logística e campo.',
    icon: 'Truck',
    color: '#0F2C59',
    order: 5,
    deptCodes: [],
    pastas: [],
  },
];

/**
 * As seis pastas padrão. A migração já as cria; a lista existe aqui para o
 * banco montado com `prisma db push` (que não roda migração) nascer igual.
 */
const pastasPadrao = [
  { slug: 'processos', name: 'Processos', description: 'Fluxos, procedimentos e como as coisas andam.', icon: 'Workflow', color: '#00A8CC', order: 0 },
  { slug: 'riscos', name: 'Riscos', description: 'Controles, conformidade e segurança.', icon: 'ShieldCheck', color: '#B42318', order: 1 },
  { slug: 'gestao', name: 'Gestão', description: 'Planejamento, metas e acompanhamento.', icon: 'Briefcase', color: '#6941C6', order: 2 },
  { slug: 'orcamento', name: 'Orçamento', description: 'Custos, previsão e prestação de contas.', icon: 'Wallet', color: '#067647', order: 3 },
  { slug: 'indicadores', name: 'Indicadores', description: 'Números que a equipe acompanha.', icon: 'BarChart3', color: '#B54708', order: 4 },
  { slug: 'sistemas', name: 'Sistemas', description: 'Os sistemas usados no dia a dia.', icon: 'Database', color: '#0F2C59', order: 5 },
];

async function main() {
  // `update: {}` de propósito: se o admin já renomeou "Gestão" ou trocou a cor,
  // rodar o seed de novo não desfaz o ajuste dele.
  for (const pasta of pastasPadrao) {
    await prisma.folder.upsert({ where: { slug: pasta.slug }, update: {}, create: pasta });
  }
  console.log(`${pastasPadrao.length} pasta(s) padrão prontas`);

  for (const { deptCodes, pastas, ...hubData } of hubs) {
    const hub = await prisma.hub.upsert({
      where: { slug: hubData.slug },
      update: {},               // não sobrescreve o que os curadores já ajustaram
      create: hubData,
    });

    for (const code of deptCodes) {
      await prisma.deptMapping.upsert({
        where: { protheusDeptCode: code },
        update: { hubId: hub.id },
        create: { protheusDeptCode: code, hubId: hub.id },
      });
    }

    for (const { slug, links } of pastas) {
      const folder = await prisma.folder.findUnique({ where: { slug }, select: { id: true } });
      if (!folder) continue;

      for (const [index, link] of links.entries()) {
        const existing = await prisma.link.findFirst({
          where: { hubId: hub.id, title: link.title },
        });
        if (existing) continue;

        await prisma.link.create({
          data: { ...link, order: index + 1, hubId: hub.id, folderId: folder.id },
        });
      }
    }

    console.log(`hub "${hub.slug}" pronto`);
  }

  // Promove a ADMIN quem já tiver logado ao menos uma vez. Quem ainda não logou
  // vira ADMIN no primeiro login (o authService consulta a mesma lista).
  if (adminUsernames.length > 0) {
    const { count } = await prisma.user.updateMany({
      where: { username: { in: adminUsernames } },
      data: { role: 'ADMIN' },
    });
    console.log(`${count} usuário(s) promovido(s) a ADMIN`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
