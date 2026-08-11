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
    categories: [
      {
        name: 'Sistemas',
        order: 1,
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
        name: 'Documentação',
        order: 2,
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
    categories: [],
  },
  {
    slug: 'financeiro',
    name: 'Financeiro',
    description: 'Contas, faturamento e controladoria.',
    icon: 'Landmark',
    color: '#0F2C59',
    order: 3,
    deptCodes: [],
    categories: [],
  },
  {
    slug: 'comercial',
    name: 'Comercial',
    description: 'Vendas, propostas e relacionamento com clientes.',
    icon: 'Handshake',
    color: '#00A8CC',
    order: 4,
    deptCodes: [],
    categories: [],
  },
  {
    slug: 'operacoes',
    name: 'Operações',
    description: 'Execução, logística e campo.',
    icon: 'Truck',
    color: '#0F2C59',
    order: 5,
    deptCodes: [],
    categories: [],
  },
];

async function main() {
  for (const { deptCodes, categories, ...hubData } of hubs) {
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

    for (const { links, ...categoryData } of categories) {
      const category = await prisma.linkCategory.upsert({
        where: { hubId_name: { hubId: hub.id, name: categoryData.name } },
        update: {},
        create: { ...categoryData, hubId: hub.id },
      });

      for (const [index, link] of links.entries()) {
        const existing = await prisma.link.findFirst({
          where: { hubId: hub.id, title: link.title },
        });
        if (existing) continue;

        await prisma.link.create({
          data: { ...link, order: index + 1, hubId: hub.id, categoryId: category.id },
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
