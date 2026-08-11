# CentralHub — Especificação de design

**Data:** 2026-08-11
**Status:** aprovado

## Problema

A Conasa não tem ponto único de entrada para os sistemas internos. Cada setor guarda seus
links onde dá — favoritos do navegador, planilhas, mensagens de chat — e quem entra novo
não sabe onde nada fica. O CentralHub é um "hub de hubs": cada setor tem sua página de
links, mantida pelo próprio pessoal do setor.

O sistema é simples por natureza (um centralizador de links). A complexidade real está em
três pontos: autenticação corporativa via TOTVS Protheus, o modelo de permissão para
edição colaborativa, e uma interface que as pessoas queiram usar como página inicial.

## Decisões

| Tema | Decisão |
| :--- | :--- |
| Edição | Hub compartilhado por setor; só **curadores** daquele setor (e admins) criam/editam/reordenam links |
| Visibilidade | Todos veem todos os hubs; ao logar, cai no hub do próprio setor; links podem ser marcados como restritos ao setor (`HUB_ONLY`) |
| Setor do usuário | `departamentCode` do Protheus mapeado para hub, com override manual do admin |
| Arquitetura | Projeto novo e independente, replicando o padrão de auth do ConectaRH |
| Escopo | Ícone/cor por link, log de auditoria, favoritos pessoais |
| Sessão | Access JWT 15 min + refresh token HttpOnly rotativo, até 8h |
| Deploy | Servidor Windows interno: Node como serviço + IIS como proxy reverso |

## Stack

- **Frontend:** React 18 + Vite (JavaScript), React Router, TanStack Query, Tailwind CSS,
  `lucide-react`, `@dnd-kit`, `@fontsource/plus-jakarta-sans` (fonte self-hosted — o
  servidor interno pode não ter saída para a internet).
- **Backend:** Node.js + Express, Prisma, PostgreSQL, Zod, `jsonwebtoken`, `argon2`,
  `helmet`, `express-rate-limit`, `pino`.
- **Testes:** Vitest + Supertest (backend), Vitest + Testing Library (frontend).

## Modelo de dados

`User`, `Hub`, `DeptMapping`, `HubCurator`, `LinkCategory`, `Link`, `Favorite`,
`AuditLog`, `RefreshToken`. Definição canônica em [`backend/prisma/schema.prisma`](../../../backend/prisma/schema.prisma).

Resolução do setor no login: se `user.hubOverride === true`, mantém o `hubId` definido
pelo admin; caso contrário resolve por `DeptMapping[protheusDeptCode]`. Sem mapeamento →
`hubId = null`, e o usuário vê a home com todos os hubs e um aviso de "setor não atribuído".

## Autenticação

Segue o padrão descrito em [`DOCUMENTACAO_PROTHEUS.md`](../../../DOCUMENTACAO_PROTHEUS.md):

1. `POST /api/auth/login` autentica no Protheus via OAuth2
   (`grant_type=password`, `application/x-www-form-urlencoded`).
   Protheus 401/403 → `401 "Usuário ou senha incorretos."`;
   falha de rede ou 5xx → `502 "O Protheus está indisponível no momento."`
2. Com o token, consulta `employeedatacontent` para obter nome, CPF e `departamentCode`.
   Se o funcionário não for encontrado, o login **prossegue** com os dados do token e
   `hubId = null` — não bloqueia o acesso.
3. JIT provisioning: `upsert` em `users`, papel padrão `USER`; `active === false` → `403`.
4. **O token do Protheus é descartado após o login.** Diferente do ConectaRH, o CentralHub
   não faz nenhuma consulta ao Protheus depois de autenticar, então não existe
   `SessionStore` nem TTL de 15 minutos amarrando a sessão.
5. Dois cookies HttpOnly: `access_token` (JWT 15 min, `sameSite: lax`) e `refresh_token`
   (opaco, 8h, `sameSite: strict`, path `/api/auth/refresh`, hash argon2 no banco,
   rotacionado a cada uso; reuso de token revogado revoga toda a família do usuário).

## Segurança

`helmet`; CORS com origin fixa e `credentials: true`; rate limit em `/api/auth/login` por
IP e por username; verificação do header `Origin` nas mutações (defesa CSRF junto ao
`sameSite`); URLs de link restritas a `http`/`https`; descrições tratadas como texto puro
(nunca `dangerouslySetInnerHTML`); âncoras externas com `rel="noopener noreferrer"`;
a senha do usuário nunca é logada nem persistida.

## Identidade visual

```
--color-ink:      #0F2C59   /* azul institucional: marca e topo dos setores */
--color-tech:     #00A8CC   /* azul técnico: ações e destaques */
--color-ground:   #F4F6F9   /* fundo do sistema */
--color-surface:  #FFFFFF   /* cards */
--color-graphite: #212529   /* texto principal */
```

Tipografia **Plus Jakarta Sans**, raios generosos (16px nos cards) e sombras com tinta
azul no lugar de bordas duras. O azul institucional fica concentrado na marca e no topo
de cada setor, em vez de uma faixa maciça atravessando a tela — o cabeçalho é claro.

A marca da Conasa (as ondas) reaparece em escala grande e opacidade baixa como textura
do topo do setor e do painel de login: a identidade é o próprio gráfico, sem ornamento
inventado. Como as ondas são brancas, a marca sempre vem sobre fundo azul.

As grades de cards usam colunas fluidas (`auto-fill` com mínimo de 320px), preenchendo a
largura em qualquer monitor em vez de pararem em três colunas.

Telas: **Login** (split screen institucional), **Setores** (grid de hubs), **HubPage**
(links por seção, edição inline para curadores), **Favoritos** e **Admin** (usuários,
curadores, mapeamentos, auditoria).

## Fora de escopo (fase 2)

Busca global de links, dark mode, upload de logo por link, métricas de acesso,
notificação de link quebrado.
