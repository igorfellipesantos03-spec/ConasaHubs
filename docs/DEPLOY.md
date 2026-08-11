# Deploy do CentralHub — Windows Server + IIS

A API roda como serviço do Windows na porta 3001 e o IIS serve o frontend,
encaminhando `/api` para o Node. Frontend e API ficam na **mesma origem**, o que
mantém os cookies de sessão funcionando sem exceções de CORS.

```
navegador → IIS (443) ┬─ /api/*  → proxy reverso → Node (localhost:3001) → PostgreSQL
                      └─ demais  → arquivos estáticos do build (SPA)
```

## 1. Pré-requisitos no servidor

| Item | Observação |
| :--- | :--- |
| Node.js 20 LTS ou superior | `node -v` |
| PostgreSQL 14+ | Pode ser um servidor existente da infra |
| IIS com **URL Rewrite** | https://www.iis.net/downloads/microsoft/url-rewrite |
| IIS com **Application Request Routing** | Depois de instalar: IIS → nó do servidor → *ARR Cache* → *Server Proxy Settings* → marcar **Enable proxy** |
| Acesso de rede ao Protheus | `restauth.protheus.conasa.com` na porta 443 |

## 2. Banco de dados

```sql
CREATE DATABASE centralhub;
CREATE USER centralhub_app WITH PASSWORD 'defina-uma-senha-forte';
GRANT ALL PRIVILEGES ON DATABASE centralhub TO centralhub_app;
```

## 3. Backend

```powershell
cd C:\inetpub\centralhub\backend
npm ci --omit=dev
Copy-Item .env.example .env    # e edite conforme a tabela abaixo
npx prisma migrate deploy
npm run db:seed                # cria os setores iniciais; seguro rodar de novo
```

Variáveis obrigatórias no `.env` de produção:

| Variável | Valor em produção |
| :--- | :--- |
| `NODE_ENV` | `production` |
| `FRONTEND_ORIGIN` | A URL exata do portal, ex.: `https://hub.conasa.com` |
| `DATABASE_URL` | String de conexão do PostgreSQL |
| `JWT_SECRET` | Segredo próprio, nunca o do exemplo. Gere com `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `COOKIE_SECURE` | `true` (exige HTTPS) |
| `PROTHEUS_BASE_URL` | `https://restauth.protheus.conasa.com` |
| `PROTHEUS_DEFAULT_COMPANY` / `_BRANCH` | Empresa e filial usadas no `tenantId`, ex.: `07` e `01` |
| `ADMIN_USERNAMES` | Usernames do Protheus que entram como administradores |

> Trocar o `JWT_SECRET` invalida todas as sessões ativas — o pessoal precisa
> logar de novo. É o procedimento correto em caso de suspeita de vazamento.

### Registrar como serviço do Windows

Com [NSSM](https://nssm.cc/):

```powershell
nssm install CentralHubAPI "C:\Program Files\nodejs\node.exe" "C:\inetpub\centralhub\backend\src\server.js"
nssm set CentralHubAPI AppDirectory C:\inetpub\centralhub\backend
nssm set CentralHubAPI AppStdout C:\inetpub\centralhub\logs\api.log
nssm set CentralHubAPI AppStderr C:\inetpub\centralhub\logs\api-erro.log
nssm set CentralHubAPI Start SERVICE_AUTO_START
nssm start CentralHubAPI
```

Confira: `Invoke-RestMethod http://localhost:3001/api/health` deve responder
`status = ok`, e `/api/health/ready` confirma que o banco respondeu.

## 4. Frontend

```powershell
cd C:\inetpub\centralhub\frontend
npm ci
npm run build
```

Aponte o site do IIS para `C:\inetpub\centralhub\frontend\dist`. O
[`web.config`](../frontend/public/web.config) já vai junto no build, com as
regras de proxy e de rota da SPA.

Dê à identidade do pool de aplicação (`IIS AppPool\<nome>`) permissão de leitura
na pasta `dist`.

## 5. HTTPS

Instale o certificado interno no site e ative **HTTP Strict Transport Security**
nas configurações de TLS do IIS. Sem HTTPS, `COOKIE_SECURE=true` impede o
navegador de guardar a sessão — e é isso que se quer: a sessão não deve
trafegar em claro.

## 6. Primeiro acesso

1. Acesse o portal e entre com um usuário listado em `ADMIN_USERNAMES`.
2. Em **Administração → Departamentos**, ligue cada código de departamento do
   Protheus ao setor correspondente. É isso que coloca cada pessoa no seu hub
   automaticamente no login.
3. Em **Administração → Curadores**, indique quem mantém os links de cada setor.
4. Casos especiais (quem atua fora do setor formal) são resolvidos em
   **Administração → Usuários**, definindo o setor manualmente — essa escolha
   passa a ter prioridade sobre o Protheus.

## 7. Atualizações

```powershell
git pull
cd backend  ; npm ci --omit=dev ; npx prisma migrate deploy
cd ..\frontend ; npm ci ; npm run build
nssm restart CentralHubAPI
```

O IIS não precisa ser reiniciado: os arquivos estáticos são trocados no lugar.

## 8. Diagnóstico

| Sintoma | Onde olhar |
| :--- | :--- |
| Login devolve 502 | Rede até o Protheus; `api-erro.log` traz o motivo da falha |
| Login devolve 401 com senha certa | O usuário existe no Protheus? Confirme o `grant_type=password` habilitado |
| Entra mas cai em "setor não atribuído" | Falta o mapeamento do departamento em Administração → Departamentos |
| Sessão cai a cada 15 minutos | O cookie de refresh não está chegando: confira `COOKIE_SECURE`, HTTPS e se `FRONTEND_ORIGIN` bate exatamente com a URL usada |
| Rota profunda (`/setor/ti`) dá 404 | URL Rewrite não instalado, ou o `web.config` não foi para a `dist` |
| `/api/*` dá 404 pelo IIS mas funciona em `localhost:3001` | Falta habilitar **Enable proxy** no ARR |
