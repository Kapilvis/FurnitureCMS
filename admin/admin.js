'use strict';
/* Admin dashboard: manages colours, types, categories and products through /api/admin/*. */
(function () {
  const root = document.getElementById('root');
  const dlg = document.getElementById('dlg');
  const state = { user: null, tab: 'products', catalog: null };
  const inr = n => '₹' + new Intl.NumberFormat('en-IN').format(Math.round(n));

  /* tiny DOM helper: h('div', {class:'x', onclick:fn}, child, ...) with text nodes only (no innerHTML) */
  function h(tag, props) {
    const el = document.createElement(tag);
    Object.entries(props || {}).forEach(([k, v]) => {
      if (v == null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'value' || k === 'checked' || k === 'disabled' || k === 'selected') el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    });
    for (let i = 2; i < arguments.length; i++) {
      [].concat(arguments[i]).forEach(c => { if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(c)); });
    }
    return el;
  }
  let toastTimer;
  function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
  }

  /* ---------- API ---------- */
  async function api(method, url, body, raw) {
    const opts = { method, headers: { 'X-Requested-With': 'nivaas-admin' }, credentials: 'same-origin' };
    if (raw) opts.body = raw;
    else if (body !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    const res = await fetch(url, opts);
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && url !== '/api/admin/login') { state.user = null; render(); throw new Error(data.error || 'Please sign in.'); }
    if (!res.ok) throw new Error(data.error || 'Request failed (' + res.status + ').');
    return data;
  }
  async function refresh() { state.catalog = await (await fetch('/api/catalog', { cache: 'no-store' })).json(); }
  async function upload(file) {
    if (file.size > 5 * 1024 * 1024) throw new Error(file.name + ' is larger than 5 MB.');
    return (await api('POST', '/api/admin/upload', undefined, file)).path;
  }

  /* ---------- dialog helper ---------- */
  function openForm(title, fields, onSave, saveLabel) {
    const err = h('p', { class: 'err', role: 'alert' });
    const save = h('button', { type: 'submit', class: 'btn pri', text: saveLabel || 'Save' });
    const form = h('form', { novalidate: true },
      h('h2', { text: title }), fields, err,
      h('div', { class: 'foot' }, h('button', { type: 'button', class: 'btn', text: 'Cancel', onclick: () => dlg.close() }), save));
    form.addEventListener('submit', async e => {
      e.preventDefault(); err.textContent = ''; save.disabled = true;
      try { await onSave(); dlg.close(); await refresh(); render(); toast('Saved'); }
      catch (ex) { err.textContent = ex.message; save.disabled = false; }
    });
    dlg.replaceChildren(form);
    dlg.showModal();
    const first = form.querySelector('input:not([type=hidden]),select,textarea'); if (first) first.focus();
  }
  const fld = (label, control, hint) => h('div', { class: 'fld' }, h('label', { text: label }), control, hint ? h('p', { class: 'hint', text: hint }) : null);
  async function confirmDelete(url, what) {
    if (!window.confirm('Delete ' + what + '? This cannot be undone.')) return;
    try { await api('DELETE', url); await refresh(); render(); toast('Deleted'); }
    catch (ex) { toast(ex.message); window.alert(ex.message); }
  }

  /* ---------- image picker (one list of paths) ---------- */
  function imagePicker(list, multiple) {
    const wrap = h('div', { class: 'imgs' });
    const tl = h('div', { class: 'tl' });
    const msg = h('p', { class: 'hint' });
    const input = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp,image/gif', multiple: multiple ? true : null });
    const draw = () => tl.replaceChildren(...list.map((p, i) => h('div', { class: 'it' },
      h('img', { src: '/' + p, alt: '' }),
      h('button', { type: 'button', 'aria-label': 'Remove image', text: '×', onclick: () => { list.splice(i, 1); draw(); } }))));
    input.addEventListener('change', async () => {
      msg.textContent = 'Uploading…';
      try {
        for (const f of input.files) { const p = await upload(f); if (multiple) list.push(p); else list.splice(0, list.length, p); }
        msg.textContent = ''; draw();
      } catch (ex) { msg.textContent = ex.message; }
      input.value = '';
    });
    draw();
    wrap.append(tl, input, msg);
    return wrap;
  }

  /* ---------- forms ---------- */
  function colorForm(existing, key) {
    const name = h('input', { type: 'text', value: existing ? existing.name : '' });
    const hex = h('input', { type: 'color', value: existing ? existing.hex : '#8A5A3B' });
    const id = h('input', { type: 'text', value: key || '', disabled: !!key, placeholder: 'e.g. walnut' });
    openForm(key ? 'Edit colour' : 'Add colour', [
      fld('ID', id, 'Lowercase letters, numbers and hyphens. Cannot be changed later.'), fld('Name', name), fld('Colour', hex)],
    () => key ? api('PUT', '/api/admin/colors/' + key, { name: name.value, hex: hex.value }) : api('POST', '/api/admin/colors', { id: id.value, name: name.value, hex: hex.value }));
  }
  function typeForm(existing) {
    const id = h('input', { type: 'text', value: existing ? existing.id : '', disabled: !!existing, placeholder: 'e.g. sofa' });
    const name = h('input', { type: 'text', value: existing ? existing.name : '' });
    openForm(existing ? 'Edit type' : 'Add type', [fld('ID', id, 'Lowercase letters, numbers and hyphens. Cannot be changed later.'), fld('Name', name)],
      () => existing ? api('PUT', '/api/admin/types/' + existing.id, { name: name.value }) : api('POST', '/api/admin/types', { id: id.value, name: name.value }));
  }
  function categoryForm(existing) {
    const c = state.catalog;
    const id = h('input', { type: 'text', value: existing ? existing.id : '', disabled: !!existing, placeholder: 'e.g. sofas' });
    const name = h('input', { type: 'text', value: existing ? existing.name : '' });
    const type = h('select', {}, c.types.map(t => h('option', { value: t.id, text: t.name, selected: existing && existing.defaultTypeId === t.id })));
    const img = existing && existing.image ? [existing.image] : [];
    openForm(existing ? 'Edit category' : 'Add category', [
      fld('ID', id, 'Lowercase letters, numbers and hyphens. Cannot be changed later.'), fld('Name', name), fld('Default type', type),
      fld('Image', imagePicker(img, false), 'Shown on the home page category tiles.')],
    () => { const body = { name: name.value, defaultTypeId: type.value, image: img[0] || '' }; return existing ? api('PUT', '/api/admin/categories/' + existing.id, body) : api('POST', '/api/admin/categories', Object.assign({ id: id.value }, body)); });
  }
  function productForm(existing) {
    const c = state.catalog;
    const p = existing || { colors: [], images: {}, specs: {}, price: '', mrp: '' };
    const name = h('input', { type: 'text', value: p.name || '' });
    const id = h('input', { type: 'text', value: p.id || '', disabled: !!existing, placeholder: 'leave blank to generate' });
    const cat = h('select', {}, c.categories.map(x => h('option', { value: x.id, text: x.name, selected: p.categoryId === x.id })));
    const type = h('select', {}, c.types.map(x => h('option', { value: x.id, text: x.name, selected: p.typeId === x.id })));
    const price = h('input', { type: 'number', min: '0', step: '1', value: String(p.price) });
    const mrp = h('input', { type: 'number', min: '0', step: '1', value: String(p.mrp) });
    const badge = h('input', { type: 'text', value: p.badge || '', placeholder: 'New, Sale, Bestseller…' });
    const material = h('input', { type: 'text', value: p.material || '' });
    const desc = h('textarea', { value: p.description || '' });
    const specs = h('textarea', { value: Object.entries(p.specs).map(([k, v]) => k + ': ' + v).join('\n') });
    /* custom sections shown on this product's page (Myntra-style accordion): title + type + text */
    const sections = JSON.parse(JSON.stringify(p.sections || []));
    const secBox = h('div', { class: 'fld' });
    const TYPE_HINT = { text: 'Paragraphs. Leave a blank line between them.', list: 'One bullet per line.', table: 'One row per line, like  Seat depth: 55 cm' };
    const drawSections = () => {
      secBox.replaceChildren(
        h('label', { text: 'Product sections' }),
        h('p', { class: 'hint', text: 'Extra collapsible sections on this product\u2019s page, for example Care, Assembly or What\u2019s inside. Max 10.' }),
        ...sections.map((s, i) => {
          const title = h('input', { type: 'text', value: s.title || '', placeholder: 'Section title, e.g. Care & maintenance', 'aria-label': 'Section title' });
          title.addEventListener('input', () => { s.title = title.value; });
          const type = h('select', { 'aria-label': 'Section type' }, [['text', 'Text'], ['list', 'Bullet list'], ['table', 'Key / value table']].map(([v, l]) => h('option', { value: v, text: l, selected: (s.type || 'text') === v })));
          const hint = h('p', { class: 'hint', text: TYPE_HINT[s.type || 'text'] });
          type.addEventListener('change', () => { s.type = type.value; hint.textContent = TYPE_HINT[s.type]; });
          const body = h('textarea', { value: s.body || '', 'aria-label': 'Section text' });
          body.addEventListener('input', () => { s.body = body.value; });
          const move = (d) => { const j = i + d; if (j < 0 || j >= sections.length) return; [sections[i], sections[j]] = [sections[j], sections[i]]; drawSections(); };
          return h('div', { class: 'imgs' },
            h('div', { class: 'row2' }, title, type),
            body, hint,
            h('div', { class: 'foot', style: 'justify-content:flex-start' },
              h('button', { type: 'button', class: 'btn sm', text: 'Move up', disabled: i === 0, onclick: () => move(-1) }),
              h('button', { type: 'button', class: 'btn sm', text: 'Move down', disabled: i === sections.length - 1, onclick: () => move(1) }),
              h('button', { type: 'button', class: 'btn sm bad', text: 'Remove', onclick: () => { sections.splice(i, 1); drawSections(); } })));
        }),
        h('div', {}, h('button', { type: 'button', class: 'btn sm', text: '+ Add section', disabled: sections.length >= 10, onclick: () => { sections.push({ title: '', type: 'text', body: '' }); drawSections(); } })));
    };
    drawSections();
    const images = JSON.parse(JSON.stringify(p.images || {}));
    const chosen = new Set(p.colors);
    const imgBox = h('div', { class: 'fld' });
    const drawImgs = () => imgBox.replaceChildren(h('label', { text: 'Images per colour' }), ...[...chosen].map(k => {
      images[k] = images[k] || [];
      return h('div', {}, h('div', { class: 'hint', text: c.colors[k] ? c.colors[k].name : k }), imagePicker(images[k], true));
    }), chosen.size ? null : h('p', { class: 'hint', text: 'Pick a colour first.' }));
    const checks = h('div', { class: 'checks' }, Object.entries(c.colors).map(([k, v]) => {
      const cb = h('input', { type: 'checkbox', checked: chosen.has(k) });
      cb.addEventListener('change', () => { cb.checked ? chosen.add(k) : chosen.delete(k); drawImgs(); });
      return h('label', {}, cb, h('span', { class: 'sw', style: 'background:' + v.hex }), v.name);
    }));
    drawImgs();
    const parseSpecs = () => {
      const out = {};
      specs.value.split('\n').forEach(l => { const i = l.indexOf(':'); if (i > 0) out[l.slice(0, i).trim()] = l.slice(i + 1).trim(); });
      return out;
    };
    openForm(existing ? 'Edit product' : 'Add product', [
      fld('Name', name), existing ? null : fld('ID (optional)', id),
      h('div', { class: 'row2' }, fld('Category', cat), fld('Type', type)),
      h('div', { class: 'row2' }, fld('Price (₹)', price), fld('MRP (₹, optional)', mrp, 'Original price. Leave blank for no discount.')),
      h('div', { class: 'row2' }, fld('Badge', badge), fld('Material', material)),
      fld('Description', desc), fld('Specifications', specs, 'One per line, like  Dimensions: 200 x 90 x 80 cm'),
      secBox, fld('Colours', checks), imgBox],
    () => {
      const body = {
        name: name.value, categoryId: cat.value, typeId: type.value, price: price.value, mrp: mrp.value, badge: badge.value,
        material: material.value, description: desc.value, specs: parseSpecs(), sections, colors: [...chosen], images
      };
      return existing ? api('PUT', '/api/admin/products/' + existing.id, body) : api('POST', '/api/admin/products', Object.assign({ id: id.value }, body));
    });
  }
  function passwordForm() {
    const cur = h('input', { type: 'password', autocomplete: 'current-password' });
    const next = h('input', { type: 'password', autocomplete: 'new-password' });
    openForm('Change password', [fld('Current password', cur), fld('New password', next, 'At least 10 characters.')],
      () => api('POST', '/api/admin/password', { current: cur.value, next: next.value }), 'Change password');
  }

  /* ---------- views ---------- */
  const thumbOf = p => {
    const first = Object.values(p.images || {}).find(a => a && a.length);
    return h('img', { class: 'thumb', src: first ? '/' + first[0] : '', alt: '' });
  };
  function table(heads, rows, empty) {
    if (!rows.length) return h('div', { class: 'card' }, h('p', { class: 'empty', text: empty }));
    return h('div', { class: 'card' }, h('table', {}, h('thead', {}, h('tr', {}, heads.map(x => h('th', { text: x })))), h('tbody', {}, rows)));
  }
  const actions = (edit, del) => h('td', { class: 'act' }, h('button', { class: 'btn sm', type: 'button', text: 'Edit', onclick: edit }), h('button', { class: 'btn sm bad', type: 'button', text: 'Delete', onclick: del }));
  const head = (title, label, fn) => h('div', { class: 'bar' }, h('h2', { text: title }), fn ? h('button', { class: 'btn pri', type: 'button', text: label, onclick: fn }) : null);

  function productsView() {
    const c = state.catalog;
    const cn = id => (c.categories.find(x => x.id === id) || {}).name || id;
    const tn = id => (c.types.find(x => x.id === id) || {}).name || id;
    return h('div', {}, head('Products (' + c.products.length + ')', 'Add product', () => productForm(null)),
      table(['', 'Product', 'Category', 'Type', 'Price', ''], c.products.map(p => h('tr', {},
        h('td', {}, thumbOf(p)), h('td', {}, h('b', { text: p.name }), h('div', { class: 'muted', text: p.id })),
        h('td', { text: cn(p.categoryId) }), h('td', { text: tn(p.typeId) }), h('td', { text: inr(p.price) }),
        actions(() => productForm(p), () => confirmDelete('/api/admin/products/' + p.id, '"' + p.name + '"')))), 'No products yet.'));
  }
  function categoriesView() {
    const c = state.catalog;
    return h('div', {}, head('Categories (' + c.categories.length + ')', 'Add category', () => categoryForm(null)),
      table(['', 'Name', 'ID', 'Default type', 'Products', ''], c.categories.map(x => h('tr', {},
        h('td', {}, h('img', { class: 'thumb', src: x.image ? '/' + x.image : '', alt: '' })), h('td', { text: x.name }), h('td', { class: 'muted', text: x.id }),
        h('td', { text: x.defaultTypeId }), h('td', { text: String(c.products.filter(p => p.categoryId === x.id).length) }),
        actions(() => categoryForm(x), () => confirmDelete('/api/admin/categories/' + x.id, '"' + x.name + '"')))), 'No categories yet.'));
  }
  function typesView() {
    const c = state.catalog;
    return h('div', {}, head('Product types (' + c.types.length + ')', 'Add type', () => typeForm(null)),
      table(['Name', 'ID', 'Products', ''], c.types.map(t => h('tr', {},
        h('td', { text: t.name }), h('td', { class: 'muted', text: t.id }), h('td', { text: String(c.products.filter(p => p.typeId === t.id).length) }),
        actions(() => typeForm(t), () => confirmDelete('/api/admin/types/' + t.id, '"' + t.name + '"')))), 'No types yet.'));
  }
  function colorsView() {
    const c = state.catalog;
    return h('div', {}, head('Colours / finishes (' + Object.keys(c.colors).length + ')', 'Add colour', () => colorForm(null, null)),
      table(['Colour', 'ID', 'Code', 'Products', ''], Object.entries(c.colors).map(([k, v]) => h('tr', {},
        h('td', {}, h('span', { class: 'sw', style: 'background:' + v.hex }), v.name), h('td', { class: 'muted', text: k }), h('td', { text: v.hex }),
        h('td', { text: String(c.products.filter(p => p.colors.includes(k)).length) }),
        actions(() => colorForm(v, k), () => confirmDelete('/api/admin/colors/' + k, '"' + v.name + '"')))), 'No colours yet.'));
  }
  function accountView() {
    return h('div', {}, head('Account'), h('div', { class: 'card', style: 'padding:20px' },
      h('p', {}, 'Signed in as ', h('b', { text: state.user })), h('button', { class: 'btn', type: 'button', text: 'Change password', onclick: passwordForm })));
  }

  function loginView() {
    const err = h('p', { class: 'err', role: 'alert' });
    const u = h('input', { type: 'text', autocomplete: 'username', value: 'admin' });
    const p = h('input', { type: 'password', autocomplete: 'current-password' });
    const btn = h('button', { class: 'btn pri', type: 'submit', text: 'Sign in' });
    const form = h('form', { class: 'login', novalidate: true }, h('h1', { text: 'Nivaas Admin' }), h('p', { class: 'muted', text: 'Sign in to manage the catalogue.' }),
      fld('Username', u), fld('Password', p), err, btn);
    form.addEventListener('submit', async e => {
      e.preventDefault(); err.textContent = ''; btn.disabled = true;
      try { const r = await api('POST', '/api/admin/login', { username: u.value, password: p.value }); state.user = r.username; await refresh(); render(); }
      catch (ex) { err.textContent = ex.message; btn.disabled = false; }
    });
    return form;
  }

  const TABS = [['products', 'Products'], ['categories', 'Categories'], ['types', 'Types'], ['colors', 'Colours'], ['account', 'Account']];
  const VIEWS = { products: productsView, categories: categoriesView, types: typesView, colors: colorsView, account: accountView };
  function render() {
    if (!state.user) { root.replaceChildren(loginView()); return; }
    root.replaceChildren(
      h('div', { class: 'top' }, h('b', { text: 'Nivaas Admin' }), h('span', { class: 'sp' }), h('a', { href: '/', target: '_blank', rel: 'noopener', text: 'View storefront' }),
        h('span', { text: state.user }), h('button', { class: 'btn sm', type: 'button', text: 'Sign out', onclick: async () => { try { await api('POST', '/api/admin/logout'); } catch (e) { /* ignore */ } state.user = null; render(); } })),
      h('nav', { class: 'tabs', 'aria-label': 'Sections' }, TABS.map(([k, label]) => h('button', { type: 'button', text: label, 'aria-current': String(state.tab === k), onclick: () => { state.tab = k; render(); } }))),
      h('main', {}, VIEWS[state.tab]()));
  }

  (async function boot() {
    try { state.user = (await api('GET', '/api/admin/me')).username; await refresh(); } catch (e) { state.user = null; }
    render();
  })();
})();
