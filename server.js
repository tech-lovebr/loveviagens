/* Love Viagens — servidor estático de desenvolvimento (porta 8091). */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8091;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

// Rotas limpas → arquivo .html correspondente (mesmo mapa do vercel.json)
const ROTAS = {
  '/': '/index.html',
  '/login': '/login.html',
  '/minha-conta': '/minha-conta.html',
  '/pacote': '/pacote.html',
  '/checkout': '/checkout.html'
};

const server = http.createServer((req, res) => {
  req.on('error', () => {});
  res.on('error', () => {});

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(url.pathname);
  if (ROTAS[pathname]) pathname = ROTAS[pathname];

  const safePath = path.normalize(path.join(PUBLIC_DIR, pathname));
  if (!safePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403); return res.end('403');
  }

  fs.stat(safePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 — página não encontrada');
    }
    const ext = path.extname(safePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    fs.createReadStream(safePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`Love Viagens rodando em http://localhost:${PORT}/`);
});
