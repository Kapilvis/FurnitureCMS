'use strict';
/* Nivaas server for local use or a VPS/Docker host: serves the static site and runs the shared API (lib/api.js)
   with file storage. On Netlify the same API runs as a function instead (see netlify/functions/api.mjs).
   Start:  node server.js
   Env: PORT, HOST (0.0.0.0 to accept outside connections), DATA_DIR, ADMIN_USER, ADMIN_PASSWORD (first run only),
        SESSION_SECRET (optional; generated into data/session.key if missing),
        TRUST_PROXY=1 (behind nginx/Caddy/a PaaS: use X-Forwarded-For / X-Forwarded-Proto), COOKIE_SECURE=1 */
const http = require('http');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');
const { createApi, HttpError, makeUser } = require('./lib/api');
const { createFileStorage } = require('./lib/storage-file');

const ROOT = __dirname;
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, 'data');
const UPLOAD_REL = 'assets/images/uploads';
const UPLOAD_DIR = path.join(ROOT, ...UPLOAD_REL.split('/'));
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '127.0.0.1';
const TRUST_PROXY = process.env.TRUST_PROXY === '1';
const COOKIE_SECURE = process.env.COOKIE_SECURE === '1';

const storage = createFileStorage({ dataDir: DATA_DIR, uploadDir: UPLOAD_DIR });
let api;

function clientIp(req) {
  if (TRUST_PROXY) {
    const xff = String(req.headers['x-forwarded-for'] || '').split(',').map(x => x.trim()).filter(Boolean);
    if (xff.length) return xff[xff.length - 1]; /* the address our own proxy saw */
  }
  return req.socket.remoteAddress;
}
const isHttps = req => !!req.socket.encrypted || (TRUST_PROXY && req.headers['x-forwarded-proto'] === 'https');

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0, tooBig = false;
    req.on('data', c => {
      if (tooBig) return; /* discard the rest so the client can still read our 413 reply */
      size += c.length;
      if (size > limit) { tooBig = true; chunks.length = 0; reject(new HttpError(413, 'File is too large (max ' + Math.round(limit / 1048576) + ' MB).')); } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function sendResult(res, r) {
  res.writeHead(r.status, r.headers);
  res.end(r.body);
}

/* ---------- static files ---------- */
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon'
};
const ALLOWED_DIRS = ['css', 'js', 'assets', 'admin'];
async function serveStatic(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'Method not allowed.');
  let p;
  try { p = decodeURIComponent(pathname); } catch (e) { throw new HttpError(400, 'Bad path.'); }
  if (p === '/') p = '/index.html';
  if (p === '/admin' || p === '/admin/') p = '/admin/index.html';
  const parts = p.split('/').filter(Boolean);
  const rootPage = parts.length === 1 && /^[a-z0-9-]+\.html$/.test(parts[0]);
  if (!rootPage && !ALLOWED_DIRS.includes(parts[0])) throw new HttpError(404, 'Not found.');
  const file = path.normalize(path.join(ROOT, ...parts));
  if (!file.startsWith(ROOT + path.sep) || parts.some(s => s.startsWith('.'))) throw new HttpError(404, 'Not found.');
  let st;
  try { st = await fsp.stat(file); } catch (e) { throw new HttpError(404, 'Not found.'); }
  if (!st.isFile()) throw new HttpError(404, 'Not found.');
  const headers = { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Content-Length': st.size, 'Cache-Control': 'no-cache' };
  res.writeHead(200, headers);
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(file).pipe(res);
}

const CSP = "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; " +
  "object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'";
const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Security-Policy', CSP);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (isHttps(req)) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (pathname.startsWith('/api/')) {
      const limit = pathname === '/api/admin/upload' ? api.limits.maxUpload : api.limits.maxJson;
      const body = req.method === 'GET' || req.method === 'HEAD' ? Buffer.alloc(0) : await readBody(req, limit);
      return sendResult(res, await api.handle({ method: req.method, pathname, headers: req.headers, body, ip: clientIp(req), https: isHttps(req) }));
    }
    if (pathname.startsWith('/' + UPLOAD_REL + '/') && (req.method === 'GET' || req.method === 'HEAD')) {
      const name = decodeURIComponent(pathname.split('/').pop());
      return sendResult(res, await api.serveUpload(name));
    }
    await serveStatic(req, res, pathname);
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500;
    if (status === 500) console.error(err);
    if (!res.headersSent) {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', Connection: status === 413 ? 'close' : 'keep-alive' });
      res.end(JSON.stringify({ error: status === 500 ? 'Server error.' : err.message }));
    }
  }
});

/* secret for signing session cookies: env value, or a random one kept in data/session.key */
async function loadSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const file = path.join(DATA_DIR, 'session.key');
  try { return (await fsp.readFile(file, 'utf8')).trim(); } catch (e) {
    const key = crypto.randomBytes(48).toString('hex');
    await fsp.writeFile(file, key + '\n', { mode: 0o600 });
    return key;
  }
}

(async () => {
  await fsp.mkdir(UPLOAD_DIR, { recursive: true });
  await fsp.mkdir(DATA_DIR, { recursive: true });
  api = createApi({
    storage,
    config: {
      secret: await loadSecret(), adminUser: process.env.ADMIN_USER || 'admin', adminPassword: process.env.ADMIN_PASSWORD || '',
      adminHash: process.env.ADMIN_PASSWORD_HASH || '', uploadRel: UPLOAD_REL, forceSecureCookie: COOKIE_SECURE
    }
  });
  if (!(await api.getUser())) { /* first run with no credentials given: create the admin and show the password once */
    const username = process.env.ADMIN_USER || 'admin';
    const password = crypto.randomBytes(9).toString('base64url');
    await storage.saveAuth(makeUser(username, password));
    console.log('\n  Admin account created.');
    console.log('  Username: ' + username);
    console.log('  Password: ' + password + '   <- shown once, change it after signing in\n');
  }
  server.requestTimeout = 30000;
  server.headersTimeout = 15000;
  server.maxHeadersCount = 50;
  server.listen(PORT, HOST, () => {
    console.log('  Listening on ' + HOST + ':' + PORT);
    console.log('  Storefront: /      Admin: /admin');
    if (HOST !== '127.0.0.1' && !TRUST_PROXY && !COOKIE_SECURE) console.warn('\n  WARNING: public host without HTTPS settings. Put this behind HTTPS and set TRUST_PROXY=1 (or COOKIE_SECURE=1).\n');
  });
})().catch(e => { console.error(e); process.exit(1); });
