'use strict';
/* Dev-only script: turns tools/seed-products.js into data/catalog.json and image files.
   Run from the project root:  node tools/build-catalog.js
   Once you have real products and photos, edit data/catalog.json by hand and stop using this script. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const seedSrc = fs.readFileSync(path.join(__dirname, 'seed-products.js'), 'utf8');
const seed = vm.runInNewContext(seedSrc + '\n;({ CATEGORIES, PRODUCTS, C, artImage })');

const decode = uri => decodeURIComponent(uri.replace('data:image/svg+xml;utf8,', ''));
const write = (rel, text) => {
  const file = path.join(root, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
};

const TYPE_NAMES = {
  sofa: 'Sofa', bed: 'Bed', dining: 'Dining set', storage: 'Wardrobe / cabinet', shelf: 'Shelf / rack',
  coffee: 'Coffee table', desk: 'Study table', tv: 'TV unit', recliner: 'Recliner', chair: 'Chair',
  lamp: 'Lamp', mirror: 'Mirror', decor: 'Decor piece', table: 'Table'
};

const colors = {};
Object.entries(seed.C).forEach(([key, v]) => { colors[key] = { name: v.name, hex: v.hex }; });
const keyOfHex = hex => Object.keys(seed.C).find(k => seed.C[k].hex === hex);

const categories = seed.CATEGORIES.map(c => {
  const image = `assets/images/categories/${c.id}.svg`;
  write(image, decode(seed.artImage(c.type, seed.C.walnut.hex, 6)));
  return { id: c.id, name: c.name, defaultTypeId: c.type, image };
});

const usedTypes = new Set();
const products = seed.PRODUCTS.map(p => {
  usedTypes.add(p.type);
  const images = {};
  p.colors.forEach(col => {
    const key = keyOfHex(col.hex);
    images[key] = [0, 1, 2, 3].map(v => {
      const rel = `assets/images/products/${p.id}/${key}-${v + 1}.svg`;
      write(rel, decode(seed.artImage(p.type, col.hex, v)));
      return rel;
    });
  });
  return {
    id: p.id, name: p.name, categoryId: p.category, typeId: p.type,
    price: p.price, mrp: p.mrp, badge: p.badge || '', rating: p.rating, reviews: p.reviews,
    colors: p.colors.map(c => keyOfHex(c.hex)), material: p.material, description: p.desc,
    specs: p.specs, images
  };
});

/* banner images used on the home page: scan index.html for data-art placeholders (first run only) */
const indexPath = path.join(root, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
const re = /<img data-art="(\w+)" data-color="(\w+)" data-view="(\d)"/g;
html = html.replace(re, (m, type, color, view) => {
  const rel = `assets/images/banners/${type}-${color}-v${view}.svg`;
  write(rel, decode(seed.artImage(type, seed.C[color].hex, +view)));
  return `<img src="${rel}"`;
});
fs.writeFileSync(indexPath, html);

const types = [...usedTypes].sort().map(id => ({ id, name: TYPE_NAMES[id] || id }));
const catalog = { version: 1, currency: 'INR', colors, types, categories, products };
write('data/catalog.json', JSON.stringify(catalog, null, 2) + '\n');
console.log(`categories ${categories.length}, types ${types.length}, products ${products.length}`);
