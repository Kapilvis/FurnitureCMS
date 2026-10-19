/* Local simulator for the Netlify function: runs netlify/functions/api.mjs against a local Netlify Blobs server.
   Needs SESSION_SECRET (32+ chars) and ADMIN_PASSWORD (or ADMIN_PASSWORD_HASH) in the environment.
   Usage:  SESSION_SECRET=... ADMIN_PASSWORD=... node tools/netlify-sim.mjs     (PORT default 3200, BLOBS_DIR default a temp folder)
   It only serves the function routes (/api/*, /assets/images/uploads/*); static files are Netlify's job and are not simulated. */
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { BlobsServer } from '@netlify/blobs/server';

const dir = process.env.BLOBS_DIR || fs.mkdtempSync(path.join(os.tmpdir(), 'nivaas-blobs-'));
const token = 'sim-token';
const blobs = new BlobsServer({ directory: dir, token });
const { port: blobsPort } = await blobs.start();
process.env.NETLIFY_BLOBS_CONTEXT = Buffer.from(JSON.stringify({ edgeURL: 'http://127.0.0.1:' + blobsPort, uncachedEdgeURL: 'http://127.0.0.1:' + blobsPort, token, siteID: 'sim-site' })).toString('base64');

const { default: handler, config } = await import('../netlify/functions/api.mjs');
const matches = p => config.path.some(g => p.startsWith(g.replace('*', '')));

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (!matches(url.pathname)) { res.writeHead(404); return res.end('not a function route'); }
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = Buffer.concat(chunks);
    const init = { method: req.method, headers: req.headers };
    if (req.method !== 'GET' && req.method !== 'HEAD' && body.length) { init.body = body; init.duplex = 'half'; }
    const response = await handler(new Request('https://sim.example' + req.url, init), { ip: req.headers['x-test-ip'] || req.socket.remoteAddress });
    const headers = {};
    response.headers.forEach((v, k) => { if (k !== 'set-cookie') headers[k] = v; });
    const cookies = response.headers.getSetCookie();
    if (cookies.length) headers['set-cookie'] = cookies;
    res.writeHead(response.status, headers);
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (e) { console.error(e); res.writeHead(500); res.end('sim error'); }
});
server.listen(Number(process.env.PORT) || 3200, '127.0.0.1', () => console.log('Netlify simulator on port ' + (process.env.PORT || 3200) + ', blobs in ' + dir));
