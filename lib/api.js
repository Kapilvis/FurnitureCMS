'use strict';
/* Shared API core. Used by server.js (local/VPS) and netlify/functions/api.mjs (Netlify).
   It knows nothing about files or HTTP servers: storage is injected, requests and responses are plain objects.

   storage interface (all async):
     getCatalog() / saveCatalog(obj)            catalogue JSON (saveCatalog also keeps backups)
     saveUpload(name, buf, type) / getUpload(name) / deleteUpload(name)
     getAuth() / saveAuth(user)                 { username, salt, hash } or null
     getFail(key) / setFail(key, val) / delFail(key)
     audit(entry)
   request:  { method, pathname, headers (lower-case), body (Buffer), ip, https }
   response: { status, headers, body } */
const crypto = require('crypto');

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

/* ---------- passwords ---------- */
function hashPassword(password, salt) { return crypto.scryptSync(password, salt, 64).toString('hex'); }
function makeUser(username, password) {
  const salt = crypto.randomBytes(16).toString('hex');
  return { username, salt, hash: hashPassword(password, salt), createdAt: new Date().toISOString() };
}
function checkPassword(user, password) {
  const a = Buffer.from(hashPassword(password, user.salt), 'hex');
  const b = Buffer.from(user.hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/* ---------- validation ---------- */
const ID_RE = /^[a-z0-9][a-z0-9-]{1,29}$/;
const UPLOAD_NAME_RE = /^[a-z0-9]+-[a-f0-9]{10}\.(jpg|png|webp|gif)$/;
const str = (v, max, name, required) => {
  const s = typeof v === 'string' ? v.trim() : '';
  if (required && !s) throw new HttpError(400, name + ' is required.');
  if (s.length > max) throw new HttpError(400, name + ' is too long (max ' + max + ').');
  return s;
};
const num = (v, name, min, max) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) throw new HttpError(400, name + ' must be a number between ' + min + ' and ' + max + '.');
  return n;
};
const imagePath = p => {
  if (typeof p !== 'string' || !/^assets\/images\/[A-Za-z0-9_\-./]+$/.test(p) || p.includes('..')) throw new HttpError(400, 'Invalid image path.');
  return p;
};
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24);

function cleanColor(b) {
  const hex = str(b.hex, 7, 'Colour code', true);
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) throw new HttpError(400, 'Colour code must look like #A1B2C3.');
  return { name: str(b.name, 40, 'Colour name', true), hex: hex.toUpperCase() };
}
function cleanType(b) { return { name: str(b.name, 60, 'Type name', true) }; }
function cleanCategory(b, db) {
  const defaultTypeId = str(b.defaultTypeId, 30, 'Default type', true);
  if (!db.types.some(t => t.id === defaultTypeId)) throw new HttpError(400, 'Default type does not exist.');
  return { name: str(b.name, 60, 'Category name', true), defaultTypeId, image: b.image ? imagePath(b.image) : '' };
}
function cleanProduct(b, db, prev) {
  const categoryId = str(b.categoryId, 30, 'Category', true);
  const typeId = str(b.typeId, 30, 'Type', true);
  if (!db.categories.some(c => c.id === categoryId)) throw new HttpError(400, 'Category does not exist.');
  if (!db.types.some(t => t.id === typeId)) throw new HttpError(400, 'Type does not exist.');
  const colors = Array.isArray(b.colors) ? [...new Set(b.colors)] : [];
  if (!colors.length) throw new HttpError(400, 'Pick at least one colour.');
  colors.forEach(k => { if (!db.colors[k]) throw new HttpError(400, 'Unknown colour: ' + k); });
  const price = num(b.price, 'Price', 0, 100000000);
  let mrp = b.mrp === '' || b.mrp == null ? price : num(b.mrp, 'MRP', 0, 100000000);
  if (mrp < price) mrp = price;
  const specs = {};
  const rawSpecs = b.specs && typeof b.specs === 'object' ? Object.entries(b.specs) : [];
  if (rawSpecs.length > 30) throw new HttpError(400, 'Too many specification lines (max 30).');
  rawSpecs.forEach(([k, v]) => { const key = str(k, 40, 'Spec name'), val = str(String(v), 200, 'Spec value'); if (key && val) specs[key] = val; });
  const images = {};
  colors.forEach(k => {
    const list = b.images && Array.isArray(b.images[k]) ? b.images[k] : [];
    if (list.length > 8) throw new HttpError(400, 'Max 8 images per colour.');
    images[k] = list.map(imagePath);
  });
  return {
    name: str(b.name, 120, 'Product name', true), categoryId, typeId, price, mrp,
    badge: str(b.badge, 20, 'Badge'), rating: prev ? prev.rating : 4.5, reviews: prev ? prev.reviews : 0,
    colors, material: str(b.material, 120, 'Material'), description: str(b.description, 1500, 'Description'), specs, images
  };
}
const CLEANERS = { colors: cleanColor, types: cleanType, categories: cleanCategory, products: cleanProduct };
const REFS = {
  categories: (db, id) => db.products.filter(p => p.categoryId === id).length,
  types: (db, id) => db.products.filter(p => p.typeId === id).length + db.categories.filter(c => c.defaultTypeId === id).length,
  colors: (db, id) => db.products.filter(p => p.colors.includes(id)).length
};
const uploadedIn = (obj, rel) => (JSON.stringify(obj).match(new RegExp(rel.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&') + '/[A-Za-z0-9_.\\-]+', 'g')) || []).map(p => p.split('/').pop());

function sniffImage(buf) {
  if (buf.length > 12 && buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return ['jpg', 'image/jpeg'];
  if (buf.length > 12 && buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) return ['png', 'image/png'];
  if (buf.length > 12 && buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return ['webp', 'image/webp'];
  if (buf.length > 12 && /^GIF8[79]a/.test(buf.slice(0, 6).toString('latin1'))) return ['gif', 'image/gif'];
  return null;
}
const MIME_BY_EXT = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };

/* ---------- factory ---------- */
function createApi({ storage, config }) {
  const cfg = Object.assign({
    secret: '', adminUser: 'admin', adminPassword: '', adminHash: '', sessionMs: 8 * 60 * 60 * 1000,
    maxUpload: 4 * 1024 * 1024, maxJson: 256 * 1024, lockMs: 15 * 60 * 1000, uploadRel: 'assets/images/uploads',
    maxBackups: 40, forceSecureCookie: false
  }, config);
  if (!cfg.secret || cfg.secret.length < 32) throw new Error('SESSION_SECRET must be set and at least 32 characters long.');

  const json = (status, obj, headers) => ({ status, body: JSON.stringify(obj), headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, headers) });

  /* --- users --- */
  let envUser = null;
  async function getUser() {
    const stored = await storage.getAuth();
    if (stored) return stored;
    if (!envUser) {
      if (cfg.adminHash) {
        const [salt, hash] = cfg.adminHash.split(':');
        if (!salt || !hash) throw new Error('ADMIN_PASSWORD_HASH must look like salt:hash (create it with tools/hash-password.js).');
        envUser = { username: cfg.adminUser, salt, hash };
      } else if (cfg.adminPassword) envUser = makeUser(cfg.adminUser, cfg.adminPassword);
    }
    return envUser;
  }

  /* --- stateless signed sessions --- */
  const sign = data => crypto.createHmac('sha256', cfg.secret).update(data).digest('base64url');
  const makeToken = user => {
    const payload = Buffer.from(JSON.stringify({ u: user.username, v: user.hash.slice(0, 12), e: Date.now() + cfg.sessionMs })).toString('base64url');
    return payload + '.' + sign(payload);
  };
  async function getSession(req) {
    const m = /(?:^|;\s*)sid=([A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+)/.exec(req.headers.cookie || '');
    if (!m) return null;
    const [payload, sig] = m[1].split('.');
    const want = Buffer.from(sign(payload)), got = Buffer.from(sig);
    if (want.length !== got.length || !crypto.timingSafeEqual(want, got)) return null;
    let data; try { data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')); } catch (e) { return null; }
    if (!data || data.e < Date.now()) return null;
    const user = await getUser();
    if (!user || user.username !== data.u || user.hash.slice(0, 12) !== data.v) return null; /* password change signs everyone out */
    return { username: data.u };
  }
  const cookieFlags = req => 'HttpOnly; SameSite=Strict; Path=/' + (cfg.forceSecureCookie || req.https ? '; Secure' : '');

  /* --- login throttling (state lives in storage so it works across serverless instances) --- */
  const LIMITS = { ip: 5, user: 30 };
  const failKey = k => crypto.createHash('sha256').update(k).digest('hex').slice(0, 32);
  async function checkLock(keys) {
    for (const k of keys) { const f = await storage.getFail(failKey(k)); if (f && f.until > Date.now()) throw new HttpError(429, 'Too many failed attempts. Try again in 15 minutes.'); }
  }
  async function noteFail(keys) {
    for (const k of keys) {
      const f = (await storage.getFail(failKey(k))) || { count: 0, until: 0 };
      f.count += 1;
      if (f.count >= LIMITS[k.split(':')[0]]) { f.until = Date.now() + cfg.lockMs; f.count = 0; }
      await storage.setFail(failKey(k), f);
    }
  }
  const audit = (req, session, action, detail) =>
    Promise.resolve(storage.audit({ at: new Date().toISOString(), ip: req.ip, user: session ? session.username : null, action, detail: detail || '' })).catch(() => {});

  /* --- serialised catalogue writes (one process; across serverless instances the last write wins) --- */
  let chain = Promise.resolve();
  function mutate(fn) {
    const run = async () => {
      const draft = JSON.parse(JSON.stringify(await storage.getCatalog()));
      const result = await fn(draft);
      await storage.saveCatalog(draft);
      return result;
    };
    const next = chain.then(run, run);
    chain = next.catch(() => {});
    return next;
  }
  async function dropOrphans(db, names) {
    const live = new Set(uploadedIn(db, cfg.uploadRel));
    for (const n of new Set(names)) if (!live.has(n) && UPLOAD_NAME_RE.test(n)) await storage.deleteUpload(n).catch(() => {});
  }
  function crud(method, resource, id, body) {
    const isObj = resource === 'colors';
    return mutate(async db => {
      const coll = db[resource];
      const exists = key => (isObj ? !!coll[key] : coll.some(x => x.id === key));
      if (method === 'POST') {
        let newId = str(body.id, 30, 'ID').toLowerCase();
        if (!newId) newId = slug(str(body.name, 120, 'Name', true));
        if (resource === 'products' && !body.id) { let n = 1; const base = newId; while (exists(newId)) newId = base + '-' + (++n); }
        if (!ID_RE.test(newId)) throw new HttpError(400, 'ID must be 2-30 characters: lowercase letters, numbers and hyphens.');
        if (exists(newId)) throw new HttpError(409, 'That ID already exists.');
        const clean = CLEANERS[resource](body, db, null);
        if (isObj) coll[newId] = clean; else coll.push(Object.assign({ id: newId }, clean));
        return Object.assign(isObj ? { key: newId } : { id: newId }, clean);
      }
      if (!exists(id)) throw new HttpError(404, 'Not found.');
      const prev = isObj ? coll[id] : coll.find(x => x.id === id);
      const before = uploadedIn(prev, cfg.uploadRel);
      if (method === 'PUT') {
        const clean = CLEANERS[resource](body, db, prev);
        if (isObj) coll[id] = clean; else coll[coll.findIndex(x => x.id === id)] = Object.assign({ id }, clean);
        await dropOrphans(db, before);
        return Object.assign(isObj ? { key: id } : { id }, clean);
      }
      if (method === 'DELETE') {
        if (resource !== 'products') { const n = REFS[resource](db, id); if (n) throw new HttpError(409, 'Cannot delete: it is used by ' + n + ' item(s). Change those first.'); }
        if (isObj) delete coll[id]; else coll.splice(coll.findIndex(x => x.id === id), 1);
        await dropOrphans(db, before);
        return { ok: true };
      }
      throw new HttpError(405, 'Method not allowed.');
    });
  }

  function readJson(req) {
    if (req.body && req.body.length > cfg.maxJson) throw new HttpError(413, 'Request too large.');
    try { return req.body && req.body.length ? JSON.parse(req.body.toString('utf8')) : {}; } catch (e) { throw new HttpError(400, 'Invalid JSON.'); }
  }

  /* --- routes --- */
  async function route(req) {
    const { method, pathname } = req;
    if (pathname === '/api/catalog' && method === 'GET') return json(200, await storage.getCatalog(), { 'Cache-Control': 'no-cache' });

    if (pathname === '/api/admin/login' && method === 'POST') {
      const b = readJson(req);
      const keys = ['ip:' + req.ip, 'user:' + String(b.username || '').slice(0, 60).toLowerCase()];
      await checkLock(keys);
      const user = await getUser();
      if (!user) throw new HttpError(503, 'Admin login is not configured on the server.');
      const ok = user.username === String(b.username || '') ? checkPassword(user, String(b.password || '')) : (hashPassword('x', 'y'), false);
      if (!ok) { await noteFail(keys); await audit(req, null, 'login-failed', keys[1]); throw new HttpError(401, 'Wrong username or password.'); }
      await storage.delFail(failKey(keys[0])); await storage.delFail(failKey(keys[1]));
      await audit(req, { username: user.username }, 'login', user.username);
      return json(200, { username: user.username }, { 'Set-Cookie': 'sid=' + makeToken(user) + '; ' + cookieFlags(req) + '; Max-Age=' + Math.floor(cfg.sessionMs / 1000) });
    }

    if (!pathname.startsWith('/api/admin/')) throw new HttpError(404, 'Not found.');
    const session = await getSession(req);
    if (!session) throw new HttpError(401, 'Please sign in.');
    if (pathname === '/api/admin/me' && method === 'GET') return json(200, { username: session.username });
    /* every state-changing call must come from our admin page (blocks cross-site form posts) */
    if (method !== 'GET' && req.headers['x-requested-with'] !== 'nivaas-admin') throw new HttpError(403, 'Blocked request.');

    if (pathname === '/api/admin/logout' && method === 'POST') {
      await audit(req, session, 'logout');
      return json(200, { ok: true }, { 'Set-Cookie': 'sid=; ' + cookieFlags(req) + '; Max-Age=0' });
    }
    if (pathname === '/api/admin/password' && method === 'POST') {
      const b = readJson(req);
      const user = await getUser();
      if (!checkPassword(user, String(b.current || ''))) throw new HttpError(400, 'Current password is wrong.');
      const next = String(b.next || '');
      if (next.length < 12) throw new HttpError(400, 'New password must be at least 12 characters.');
      if (next === String(b.current)) throw new HttpError(400, 'Choose a different password.');
      const fresh = makeUser(user.username, next);
      await storage.saveAuth(fresh);
      await audit(req, session, 'password-changed');
      /* every old session is now invalid (the token carries the old hash); give this browser a new one */
      return json(200, { ok: true }, { 'Set-Cookie': 'sid=' + makeToken(fresh) + '; ' + cookieFlags(req) + '; Max-Age=' + Math.floor(cfg.sessionMs / 1000) });
    }
    if (pathname === '/api/admin/upload' && method === 'POST') {
      if (req.body.length > cfg.maxUpload) throw new HttpError(413, 'File is too large (max ' + Math.round(cfg.maxUpload / 1048576) + ' MB).');
      const kind = sniffImage(req.body);
      if (!kind) throw new HttpError(400, 'Only JPG, PNG, WebP or GIF images are allowed.');
      const name = Date.now().toString(36) + '-' + crypto.randomBytes(5).toString('hex') + '.' + kind[0];
      await storage.saveUpload(name, req.body, kind[1]);
      await audit(req, session, 'upload', name);
      return json(201, { path: cfg.uploadRel + '/' + name });
    }
    const m = /^\/api\/admin\/(categories|types|colors|products)(?:\/([a-z0-9-]+))?$/.exec(pathname);
    if (m) {
      const [, resource, id] = m;
      if (method === 'POST' && !id) { const out = await crud('POST', resource, null, readJson(req)); await audit(req, session, 'create ' + resource, out.id || out.key); return json(201, out); }
      if (method === 'PUT' && id) { const out = await crud('PUT', resource, id, readJson(req)); await audit(req, session, 'update ' + resource, id); return json(200, out); }
      if (method === 'DELETE' && id) { const out = await crud('DELETE', resource, id); await audit(req, session, 'delete ' + resource, id); return json(200, out); }
    }
    throw new HttpError(404, 'Not found.');
  }

  async function handle(req) {
    try { return await route(req); } catch (err) {
      const status = err instanceof HttpError ? err.status : 500;
      if (status === 500) console.error(err);
      return json(status, { error: status === 500 ? 'Server error.' : err.message }, status === 413 ? { Connection: 'close' } : undefined);
    }
  }

  /* uploaded images are served by the same core so every host behaves alike */
  async function serveUpload(name) {
    if (!UPLOAD_NAME_RE.test(name)) return json(404, { error: 'Not found.' });
    const file = await storage.getUpload(name);
    if (!file) return json(404, { error: 'Not found.' });
    return {
      status: 200, body: file,
      headers: { 'Content-Type': MIME_BY_EXT[name.split('.').pop()], 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'", 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'public, max-age=31536000, immutable' }
    };
  }

  return { handle, serveUpload, getUser, limits: { maxUpload: cfg.maxUpload, maxJson: cfg.maxJson }, cfg };
}

module.exports = { createApi, HttpError, makeUser, hashPassword, UPLOAD_NAME_RE };
