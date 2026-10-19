'use strict';
/* Netlify build step: copies only the public site files into dist/ so server code, data and tools are never published. */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'dist');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

fs.readdirSync(root).filter(f => /^[a-z0-9-]+\.html$/.test(f)).forEach(f => fs.copyFileSync(path.join(root, f), path.join(out, f)));
for (const dir of ['css', 'js', 'admin', 'assets']) {
  fs.cpSync(path.join(root, dir), path.join(out, dir), {
    recursive: true,
    /* uploaded images live in Netlify Blobs, not in the deploy */
    filter: src => !src.includes(path.join('assets', 'images', 'uploads') + path.sep)
  });
}
fs.mkdirSync(path.join(out, 'assets', 'images', 'uploads'), { recursive: true });
const count = (d) => fs.readdirSync(d, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? count(path.join(d, e.name)) : 1), 0);
console.log('dist/ ready: ' + count(out) + ' files');
