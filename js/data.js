'use strict';
/* Catalog data layer. Loads data/catalog.json and exposes helpers used by main.js.
   Master data: colors, types, categories. Transaction data: products (reference masters by id). */

let CATEGORIES = [];
let TYPES = [];
let COLORS = {};
let PRODUCTS = [];

async function loadCatalog() {
  /* the Node server serves live data at /api/catalog; a plain static host falls back to the JSON file */
  let res = await fetch('/api/catalog').catch(() => null);
  if (!res || !res.ok) res = await fetch('data/catalog.json');
  if (!res.ok) throw new Error('Could not load the catalog (' + res.status + ')');
  const data = await res.json();
  COLORS = data.colors;
  TYPES = data.types;
  CATEGORIES = data.categories;
  /* hydrate colour keys into {key, name, hex} so views can use them directly */
  PRODUCTS = data.products.map(p => Object.assign({}, p, {
    category: p.categoryId,
    type: p.typeId,
    desc: p.description,
    sections: p.sections || [],
    colors: p.colors.map(k => Object.assign({ key: k }, COLORS[k]))
  }));
}

function getProduct(id) { return PRODUCTS.find(p => p.id === id); }
function getCategory(id) { return CATEGORIES.find(c => c.id === id); }
function getType(id) { return TYPES.find(t => t.id === id); }
function discountPct(p) { return p.mrp > p.price ? Math.round((p.mrp - p.price) / p.mrp * 100) : 0; }
const PLACEHOLDER = 'assets/images/placeholder.svg';
function productImages(p, colorIdx) {
  const color = p.colors[colorIdx || 0] || p.colors[0];
  let list = color && p.images[color.key];
  if (!list || !list.length) list = Object.values(p.images).find(a => a && a.length);
  return list && list.length ? list : [PLACEHOLDER];
}
function categoryImage(cat) { return cat.image || PLACEHOLDER; }
