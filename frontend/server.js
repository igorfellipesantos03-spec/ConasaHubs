// Servidor de produção do frontend (PM2: centralhub-web).
// Entrega o build estático (dist/) com fallback de SPA e encaminha /api para a API,
// mantendo tudo na mesma origem — igual ao proxy do Vite em desenvolvimento.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.PORT ?? 8080);
const API_HOST = process.env.API_HOST ?? '127.0.0.1';
const API_PORT = Number(process.env.API_PORT ?? 3001);
const DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist');

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function encaminharParaApi(req, res) {
  const proxy = http.request(
    { host: API_HOST, port: API_PORT, method: req.method, path: req.url, headers: req.headers },
    (respostaApi) => {
      res.writeHead(respostaApi.statusCode, respostaApi.headers);
      respostaApi.pipe(res);
    },
  );
  proxy.on('error', () => {
    if (!res.headersSent) res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'API indisponível.' }));
  });
  req.pipe(proxy);
}

function servirEstatico(req, res) {
  const caminho = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let arquivo = path.normalize(path.join(DIST, caminho));
  if (!arquivo.startsWith(DIST)) {
    res.writeHead(403).end();
    return;
  }
  if (!fs.existsSync(arquivo) || fs.statSync(arquivo).isDirectory()) {
    arquivo = path.join(DIST, 'index.html');
  }
  const ext = path.extname(arquivo);
  res.writeHead(200, {
    'Content-Type': TIPOS[ext] ?? 'application/octet-stream',
    'Cache-Control': caminho.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
  });
  fs.createReadStream(arquivo).pipe(res);
}

http
  .createServer((req, res) => {
    if (req.url === '/api' || req.url.startsWith('/api/')) return encaminharParaApi(req, res);
    servirEstatico(req, res);
  })
  .listen(PORT, () => console.log(`centralhub-web ouvindo na porta ${PORT}`));
