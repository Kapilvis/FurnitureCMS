'use strict';
/* GitHub Pages build: publishes the static storefront only (no admin, no API, no server code).
   The storefront falls back to data/catalog.json when /api/catalog does not exist, so the catalogue shown on Pages
   is whatever is committed in data/catalog.json. */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'dist-pages');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

fs.readdirSync(root).filter(f => /^[a-z0-9-]+\.html$/.test(f)).forEach(f => fs.copyFileSync(path.join(root, f), path.join(out, f)));
for (const dir of ['css', 'js', 'assets']) {
  fs.cpSync(path.join(root, dir), path.join(out, dir), {
    recursive: true,
    filter: src => !src.includes(path.join('assets', 'images', 'uploads') + path.sep)
  });
}
fs.mkdirSync(path.join(out, 'data'), { recursive: true });
fs.copyFileSync(path.join(root, 'data', 'catalog.json'), path.join(out, 'data', 'catalog.json'));
fs.writeFileSync(path.join(out, '.nojekyll'), '');
const count = d => fs.readdirSync(d, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? count(path.join(d, e.name)) : 1), 0);
console.log('dist-pages/ ready: ' + count(out) + ' files');
