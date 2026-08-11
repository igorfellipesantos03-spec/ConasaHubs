# CentralHub

Portal interno da Conasa que centraliza, por setor, os links para sistemas e recursos
corporativos — Protheus, documentações técnicas, n8n e o que cada equipe precisar.

- Autenticação corporativa via **TOTVS Protheus** (OAuth2), sem cadastro de senha próprio.
- Cada setor tem seu hub; **curadores** do setor mantêm os links atualizados.
- Todos enxergam todos os hubs; links sensíveis podem ser restritos ao próprio setor.

## Estrutura

| Pasta | Conteúdo |
| :--- | :--- |
| `backend/` | API Node.js + Express + Prisma (PostgreSQL) |
| `frontend/` | SPA React + Vite |
| `docs/` | Especificação de design e guia de deploy |

## Requisitos

- Node.js 20+
- PostgreSQL 14+
- Acesso de rede ao Protheus (`restauth.protheus.conasa.com`)

## Como rodar em desenvolvimento

```bash
# backend
cd backend
cp .env.example .env      # ajuste DATABASE_URL, JWT_SECRET e as credenciais do Protheus
npm install
npm run db:migrate
npm run db:seed
npm run dev               # http://localhost:3001

# frontend (outro terminal)
cd frontend
npm install
npm run dev               # http://localhost:5173
```

## Testes

```bash
cd backend  && npm test
cd frontend && npm test
```

## Deploy

Servidor Windows interno: Node como serviço + IIS como proxy reverso.
Passo a passo em [`docs/DEPLOY.md`](docs/DEPLOY.md).
