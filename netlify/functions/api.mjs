/* Netlify Function (v2): the whole API plus uploaded-image serving.
   Same logic as server.js, but storage is Netlify Blobs and sessions are stateless signed cookies. */
import { getStore } from '@netlify/blobs';
import core from '../../lib/api.js';
import blobStorage from '../../lib/storage-blobs.js';
import seed from '../../data/catalog.json' with { type: 'json' };

export const config = { path: ['/api/*', '/assets/images/uploads/*'] };

const storage = blobStorage.createBlobStorage({ getStore, seed });
let api = null;
let setupError = null;

function getApi() {
  if (api || setupError) return api;
  try {
    api = core.createApi({
      storage,
      config: {
        secret: process.env.SESSION_SECRET || '',
        adminUser: process.env.ADMIN_USER || 'admin',
        adminPassword: process.env.ADMIN_PASSWORD || '',
        adminHash: process.env.ADMIN_PASSWORD_HASH || '',
        forceSecureCookie: true
      }
    });
  } catch (e) { setupError = e; }
  return api;
}

const reply = (status, obj) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
const toResponse = r => new Response(r.body, { status: r.status, headers: r.headers });

export default async (request, context) => {
  const a = getApi();
  if (!a) { console.error(setupError); return reply(500, { error: 'Server is not configured: ' + setupError.message }); }
  const url = new URL(request.url);

  if (url.pathname.startsWith('/assets/images/uploads/')) {
    if (request.method !== 'GET' && request.method !== 'HEAD') return reply(405, { error: 'Method not allowed.' });
    return toResponse(await a.serveUpload(decodeURIComponent(url.pathname.split('/').pop())));
  }

  const limit = url.pathname === '/api/admin/upload' ? a.limits.maxUpload : a.limits.maxJson;
  let body = Buffer.alloc(0);
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    if (Number(request.headers.get('content-length') || 0) > limit) return reply(413, { error: 'File is too large (max ' + Math.round(limit / 1048576) + ' MB).' });
    body = Buffer.from(await request.arrayBuffer());
    if (body.length > limit) return reply(413, { error: 'File is too large (max ' + Math.round(limit / 1048576) + ' MB).' });
  }
  const result = await a.handle({
    method: request.method, pathname: url.pathname, headers: Object.fromEntries(request.headers),
    body, ip: context.ip || request.headers.get('x-nf-client-connection-ip') || 'unknown', https: true
  });
  return toResponse(result);
};
