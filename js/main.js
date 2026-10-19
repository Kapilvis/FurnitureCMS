/* Nivaas storefront: shared layout, cart, wishlist and page logic. Requires products.js. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const inr = n => '₹' + new Intl.NumberFormat('en-IN').format(Math.round(n));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- storage (falls back to memory if localStorage is blocked) ---------- */
  const mem = {};
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return k in mem ? mem[k] : d; } },
    set(k, v) { mem[k] = v; try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  const getCart = () => store.get('nivaas_cart', []);
  const getWish = () => store.get('nivaas_wish', []);

  /* ---------- toast ---------- */
  let toastTimer;
  function toast(msg) {
    let t = $('#toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
  }

  /* ---------- cart ---------- */
  function addToCart(id, qty, colorIdx) {
    const cart = getCart();
    const hit = cart.find(i => i.id === id && i.color === colorIdx);
    if (hit) hit.qty = Math.min(10, hit.qty + qty); else cart.push({ id, qty, color: colorIdx });
    store.set('nivaas_cart', cart); updateCounts();
  }
  function setQty(idx, qty) {
    const cart = getCart(); if (!cart[idx]) return;
    cart[idx].qty = Math.max(1, Math.min(10, qty)); store.set('nivaas_cart', cart); updateCounts();
  }
  function removeLine(idx) { const cart = getCart(); cart.splice(idx, 1); store.set('nivaas_cart', cart); updateCounts(); }
  function toggleWish(id) {
    let w = getWish(); const on = !w.includes(id);
    w = on ? w.concat(id) : w.filter(x => x !== id); store.set('nivaas_wish', w); updateCounts(); return on;
  }
  function updateCounts() {
    const n = getCart().reduce((s, i) => s + i.qty, 0), w = getWish().length;
    const bump = (e, v) => { const prev = Number(e.dataset.n || 0); e.textContent = v || ''; e.dataset.n = v; if (v > prev) { e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump'); } };
    $$('[data-cart-count]').forEach(e => bump(e, n));
    $$('[data-wish-count]').forEach(e => bump(e, w));
    $$('[data-wish]').forEach(b => b.setAttribute('aria-pressed', String(getWish().includes(b.dataset.wish))));
  }

  /* ---------- shared header and footer ---------- */
  const ICON = {
    search: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg>',
    heart: '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.6-9-9.2C1.8 7 4 4 7 4c2 0 3.7 1.2 5 3 1.3-1.8 3-3 5-3 3 0 5.200 3 4 6.800C19 15.400 12 20 12 20z"/></svg>',
    bag: '<svg viewBox="0 0 24 24"><path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 016 0v2"/></svg>',
    menu: '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>'
  };
  const WISH_SVG = '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.6-9-9.2C1.8 7 4 4 7 4c2 0 3.7 1.2 5 3 1.3-1.8 3-3 5-3 3 0 5.200 3 4 6.800C19 15.400 12 20 12 20z"/></svg>';

  function buildChrome() {
    const page = document.body.dataset.page;
    const q = new URLSearchParams(location.search);
    const nav = '<li><a href="products.html">New Arrivals</a></li><li><a href="products.html?sale=1" class="sale">Deal Zone</a></li>' +
      CATEGORIES.map(c => `<li><a href="products.html?cat=${c.id}" class="${page === 'list' && q.get('cat') === c.id ? 'on' : ''}">${c.name}</a></li>`).join('');
    const h = $('#site-header');
    if (h) h.innerHTML = `
      <div class="ubar"><div class="in">
        <div class="l"><a href="#">Find a store</a></div>
        <div class="mid">Extra savings on festive orders. Use code <b>FEST10</b> (demo) &middot; <a href="products.html?sale=1">Shop now</a></div>
        <div class="r"><a href="#">Gift cards</a><a href="#">Help</a></div>
      </div></div>
      <header class="header">
        <div class="hdr">
          <button class="ib menu-btn" id="menuBtn" aria-label="Open menu" aria-expanded="false">${ICON.menu}</button>
          <a class="logo" href="index.html" aria-label="Nivaas home"><i></i><span>Niva<b>as</b></span></a>
          <div class="hl"><a href="products.html">Home Interiors</a><a href="products.html?cat=study">Office Furniture</a><a href="#">Repair Services</a></div>
          <form class="search" id="searchForm" role="search" action="products.html">
            <label class="sr" for="q">Search furniture</label>
            <input id="q" name="q" type="search" placeholder="Search" autocomplete="off" value="${esc(q.get('q') || '')}">
            <button type="submit" aria-label="Search">${ICON.search}</button>
          </form>
          <div class="icons">
            <button class="ib" type="button" aria-label="Account" id="acctBtn">${ICON.user}</button>
            <a class="ib" href="products.html?wish=1" aria-label="Wishlist">${ICON.heart}<span class="count" data-wish-count></span></a>
            <a class="ib" href="cart.html" aria-label="Cart">${ICON.bag}<span class="count" data-cart-count></span></a>
          </div>
        </div>
        <nav class="nav" id="mainNav" aria-label="Categories"><ul>${nav}</ul></nav>
      </header>
      <div class="scrim" id="navScrim"></div>`;
    const f = $('#site-footer');
    if (f) f.innerHTML = `
      <section class="news"><div class="wrap">
        <div><h2>Get 10% off your first order</h2><p style="margin:6px 0 0;opacity:.85">Design ideas and offers in your inbox. No spam.</p></div>
        <form id="newsForm" novalidate><label class="sr" for="nmail">Email address</label><input id="nmail" type="email" placeholder="you@example.com"><button class="btn pri" type="submit">Subscribe</button></form>
      </div></section>
      <footer class="foot">
        <div class="wrap cols">
          <div><h4>Download our app</h4><span class="badge-app">App Store</span><span class="badge-app">Google Play</span></div>
          <div><h4>The company</h4><ul><li><a href="#">Help</a></li><li><a href="#">Blog</a></li><li><a href="#">Privacy policy</a></li></ul></div>
          <div><h4>More information</h4><div class="two"><a href="#">Fees and payments</a><a href="#">Contact us</a><a href="#">Shipping &amp; delivery</a><a href="#">Visit us</a><a href="#">Terms and conditions</a><a href="#">Buy in bulk</a><a href="#">Warranty, return and refund</a></div></div>
          <div><h4>Address</h4><p style="margin:0">Nivaas Home Retail (demo storefront)<br>Sample Street, Bhopal, Madhya Pradesh</p></div>
        </div>
        <div class="wrap pop">
          <div><h4>Popular furniture categories</h4><p>${CATEGORIES.map(c => `<a href="products.html?cat=${c.id}">${c.name}</a>`).join(', ')}</p></div>
          <div><h4>Delivering in</h4><p>Bhopal, Indore, Delhi, Mumbai, Bengaluru, Pune (sample list)</p></div>
        </div>
        <div class="wrap base">
          <div>Terms of use &nbsp; Privacy policy<br>&copy; 2026 Nivaas. Prototype website: products, prices and checkout are sample content only.</div>
          <div><h4>Payment methods</h4><div class="pay"><span>UPI</span><span>Cards</span><span>Net banking</span><span>EMI</span></div></div>
          <div><h4>Follow us</h4><div class="soc"><span>f</span><span>in</span><span>X</span><span>yt</span></div></div>
        </div>
      </footer>`;

    const mb = $('#menuBtn'), navEl = $('#mainNav'), scrim = $('#navScrim');
    const setNav = open => { navEl.classList.toggle('open', open); scrim.classList.toggle('on', open); mb.setAttribute('aria-expanded', String(open)); };
    if (mb) { mb.addEventListener('click', () => setNav(!navEl.classList.contains('open'))); scrim.addEventListener('click', () => setNav(false)); }
    const acct = $('#acctBtn'); if (acct) acct.addEventListener('click', () => toast('Sign-in is not available in this prototype.'));
    const nf = $('#newsForm');
    if (nf) nf.addEventListener('submit', e => {
      e.preventDefault(); const v = $('#nmail').value.trim();
      toast(/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) ? 'Thanks! You are subscribed (demo only, nothing was sent).' : 'Please enter a valid email address.');
      if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) nf.reset();
    });
  }

  /* ---------- product card ---------- */
  function cardHTML(p) {
    const off = discountPct(p), img = productImages(p)[0], cat = getCategory(p.category);
    return `<article class="card">
      <a class="im" href="product-detail.html?id=${p.id}" aria-label="${esc(p.name)}">
        <img src="${img}" alt="${esc(p.name)}" loading="lazy">
        ${p.badge ? `<span class="badge${p.badge === 'Sale' ? ' sale' : ''}">${esc(p.badge)}</span>` : ''}
      </a>
      <button class="wish" type="button" data-wish="${p.id}" aria-label="Add ${esc(p.name)} to wishlist" aria-pressed="false">${WISH_SVG}</button>
      <div class="cb">
        <span class="cat-l">${cat ? cat.name : ''}</span>
        <h3><a href="product-detail.html?id=${p.id}">${esc(p.name)}</a></h3>
        <div class="rate"><b>${p.rating.toFixed(1)} ★</b>(${p.reviews})</div>
        <div class="pr"><b>${inr(p.price)}</b>${off ? `<s>${inr(p.mrp)}</s><span class="off">${off}% off</span>` : ''}</div>
      </div></article>`;
  }
  document.addEventListener('click', e => {
    const w = e.target.closest('[data-wish]'); if (!w) return;
    e.preventDefault();
    const on = toggleWish(w.dataset.wish);
    toast(on ? 'Added to wishlist' : 'Removed from wishlist');
    if (document.body.dataset.page === 'list' && new URLSearchParams(location.search).get('wish')) renderList();
  });

  /* ---------- home ---------- */
  const catProducts = id => PRODUCTS.filter(p => p.category === id);
  function initHome() {
    const tiles = [`<a class="tile new" href="products.html"><div class="im">New</div><b>Latest Arrivals</b></a>`]
      .concat(CATEGORIES.map(c => `<a class="tile" href="products.html?cat=${c.id}"><div class="im"><img src="${categoryImage(c)}" alt="" loading="lazy"></div><b>${c.name}</b></a>`));
    tiles.push(`<a class="tile" href="products.html?sale=1"><div class="im" style="background:var(--accent);color:#fff;font-weight:800;font-size:18px">SALE</div><b>Deal Zone</b></a>`);
    $('#tiles').innerHTML = tiles.join('');
    $$('[data-row]').forEach(el => {
      const list = catProducts(el.dataset.row).slice().sort((a, b) => b.rating - a.rating).slice(0, 8);
      el.innerHTML = list.map(cardHTML).join('');
    });
    $$('[data-from]').forEach(el => { const l = catProducts(el.dataset.from); if (l.length) el.textContent = inr(Math.min(...l.map(p => p.price))); });
    $$('[data-count]').forEach(el => { el.textContent = catProducts(el.dataset.count).length * 12 + '+ Options'; });
    const rec = store.get('nivaas_recent', []).map(getProduct).filter(Boolean);
    const rs = $('#recentSec');
    if (rs) { rs.hidden = !rec.length; $('#recent').innerHTML = rec.map(cardHTML).join(''); }
  }

  /* ---------- listing ---------- */
  const PRICE_BANDS = { any: [0, 1e9], u10: [0, 10000], b1025: [10000, 25000], b2540: [25000, 40000], o40: [40000, 1e9] };
  const state = { shown: 8, step: 8 };
  function filtersFromURL() {
    const q = new URLSearchParams(location.search);
    return { cats: q.get('cat') ? q.get('cat').split(',') : [], text: (q.get('q') || '').toLowerCase().trim(), sale: !!q.get('sale'), wish: !!q.get('wish') };
  }
  function renderList() {
    const f = filtersFromURL();
    const band = PRICE_BANDS[($('input[name=price]:checked') || { value: 'any' }).value];
    const onlyDisc = $('#fDisc').checked, sort = $('#sort').value;
    const checked = $$('input[name=cat]:checked').map(i => i.value);
    let list = PRODUCTS.filter(p =>
      (!checked.length || checked.includes(p.category)) &&
      p.price >= band[0] && p.price < band[1] &&
      (!onlyDisc || discountPct(p) >= 25) &&
      (!f.sale || p.badge === 'Sale' || discountPct(p) >= 28) &&
      (!f.wish || getWish().includes(p.id)) &&
      (!f.text || (p.name + ' ' + p.category + ' ' + p.material + ' ' + p.desc).toLowerCase().includes(f.text)));
    if (sort === 'lh') list.sort((a, b) => a.price - b.price);
    else if (sort === 'hl') list.sort((a, b) => b.price - a.price);
    else if (sort === 'disc') list.sort((a, b) => discountPct(b) - discountPct(a));
    else if (sort === 'rate') list.sort((a, b) => b.rating - a.rating);
    $('#resCount').textContent = list.length + (list.length === 1 ? ' product' : ' products');
    const vis = list.slice(0, state.shown);
    $('#plist').innerHTML = vis.length ? vis.map(cardHTML).join('') : '';
    $('#noRes').hidden = list.length > 0;
    $('#noRes').textContent = f.wish ? 'Your wishlist is empty. Tap the heart on any product to save it.' : 'No products match these filters. Try clearing some.';
    const more = $('#moreBtn'); more.hidden = list.length <= state.shown;
    more.textContent = 'Load more (' + (list.length - state.shown) + ' left)';
    updateCounts();
  }
  function initList() {
    const f = filtersFromURL();
    $('#catChecks').innerHTML = CATEGORIES.map(c => `<label><input type="checkbox" name="cat" value="${c.id}" ${f.cats.includes(c.id) ? 'checked' : ''}> ${c.name}</label>`).join('');
    const one = f.cats.length === 1 ? getCategory(f.cats[0]) : null;
    const title = f.wish ? 'My Wishlist' : f.sale ? 'Sale' : f.text ? 'Results for “' + f.text + '”' : one ? one.name : 'All Furniture';
    $('#lpTitle').textContent = title; document.title = title + ' | Nivaas';
    $('#crumbCur').textContent = title;
    $('#lpIntro').textContent = one ? 'Browse our ' + one.name.toLowerCase() + ' range, made from solid wood and engineered boards with warranty.' : 'Discover furniture and décor for every room of your home.';
    $$('.filters input, #sort').forEach(el => el.addEventListener('change', () => { state.shown = state.step; renderList(); }));
    $('#clearF').addEventListener('click', () => { $$('.filters input[type=checkbox]').forEach(i => i.checked = false); $('input[name=price][value=any]').checked = true; state.shown = state.step; renderList(); });
    $('#moreBtn').addEventListener('click', () => { state.shown += state.step; renderList(); });
    const dr = $('.filters'), sc = $('#fScrim');
    const setDr = o => { dr.classList.toggle('open', o); sc.classList.toggle('on', o); };
    $('#fOpen').addEventListener('click', () => setDr(true)); $('#fClose').addEventListener('click', () => setDr(false)); sc.addEventListener('click', () => setDr(false));
    $('#applyF').addEventListener('click', () => setDr(false));
    renderList();
  }

  /* ---------- detail ---------- */
  function initDetail() {
    const p = getProduct(new URLSearchParams(location.search).get('id'));
    const root = $('#pd');
    if (!p) { root.innerHTML = '<div class="empty" style="grid-column:1/-1">Product not found. <a href="products.html" style="color:var(--accent);font-weight:600">Browse all products</a></div>'; return; }
    document.title = p.name + ' | Nivaas';
    const earlier = store.get('nivaas_recent', []).filter(x => x !== p.id);
    store.set('nivaas_recent', [p.id].concat(earlier).slice(0, 6));
    const cat = getCategory(p.category), off = discountPct(p);
    $('#crumbCat').textContent = cat.name; $('#crumbCat').href = 'products.html?cat=' + cat.id; $('#crumbCur').textContent = p.name;
    let color = 0, imgIdx = 0, qty = 1;
    const renderers = {
      text: t => t.split(/\n{2,}/).map(x => `<p>${esc(x).replace(/\n/g, '<br>')}</p>`).join(''),
      list: t => '<ul>' + t.split('\n').map(l => l.trim()).filter(Boolean).map(l => `<li>${esc(l)}</li>`).join('') + '</ul>',
      table: t => '<table class="spec-t">' + t.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
        const i = l.indexOf(':');
        return i > 0 ? `<tr><th>${esc(l.slice(0, i).trim())}</th><td>${esc(l.slice(i + 1).trim())}</td></tr>` : `<tr><td colspan="2">${esc(l)}</td></tr>`;
      }).join('') + '</table>'
    };
    const specLines = [['Material', p.material]].concat(Object.entries(p.specs)).map(([k, v]) => k + ': ' + v).join('\n');
    const sections = [
      { title: 'Best offers', type: 'list', open: true, body: 'Extra 5% off when you pay by UPI (demo offer)\nNo-cost EMI on orders of \u20B910,000 and above (demo offer)\nFree assembly by our carpenters' },
      { title: 'Product details', type: 'text', open: true, body: p.desc },
      { title: 'Specifications', type: 'table', body: specLines }
    ].concat(p.sections, [
      { title: 'Delivery & returns', type: 'list', body: 'Delivery in 4\u201311 days depending on your PIN code (sample estimate)\nFree delivery on orders above \u20B910,000\n7-day return window (sample policy)' },
      { title: 'Ratings', type: 'text', body: p.rating.toFixed(1) + ' out of 5, based on ' + p.reviews + ' ratings' }
    ]);
    const accordion = sections.map(s => `<details class="sec-d"${s.open ? ' open' : ''}><summary>${esc(s.title)}</summary><div class="sec-b">${(renderers[s.type] || renderers.text)(s.body || '')}</div></details>`).join('');
    root.innerHTML = `
      <div><div class="gal-main"><img id="gMain" alt="${esc(p.name)}"></div><div class="thumbs" id="thumbs"></div></div>
      <div>
        <div class="cat-l" style="color:var(--muted);text-transform:uppercase;letter-spacing:.06em;font-size:12px">${cat.name}</div>
        <h1>${esc(p.name)}</h1>
        <div class="rate"><b>${p.rating.toFixed(1)} ★</b>${p.reviews} reviews</div>
        <div class="pr" style="margin-top:14px"><b>${inr(p.price)}</b>${off ? `<s>${inr(p.mrp)}</s><span class="off">${off}% off</span>` : ''}</div>
        <p class="tax">Inclusive of all taxes. Sample pricing.</p>
        <div class="opt-b"><div class="lab">Select finish: <span id="cName"></span></div><div class="sw" id="sw"></div></div>
        <div class="opt-b"><div class="lab">Quantity</div>
          <div class="qty"><button type="button" id="qm" aria-label="Decrease quantity">−</button><input id="qv" value="1" inputmode="numeric" aria-label="Quantity"><button type="button" id="qp" aria-label="Increase quantity">+</button></div></div>
        <div class="buy"><button class="btn pri" id="addBtn" type="button">Add to cart</button><button class="btn" id="wishBtn" type="button" data-wish="${p.id}" aria-pressed="false">♡ Wishlist</button></div>
        <div class="opt-b"><div class="lab">Check delivery</div>
          <form class="pin" id="pinForm" novalidate><label class="sr" for="pin">PIN code</label><input id="pin" inputmode="numeric" maxlength="6" placeholder="Enter 6-digit PIN code"><button class="btn sm" type="submit">Check</button></form>
          <div class="msg" id="pinMsg" role="status"></div></div>
        <div class="acc" id="acc">${accordion}</div>
      </div>`;
    const draw = () => {
      const imgs = productImages(p, color);
      $('#gMain').src = imgs[imgIdx];
      $('#thumbs').innerHTML = imgs.map((s, i) => `<button type="button" data-i="${i}" aria-label="View image ${i + 1}" aria-current="${i === imgIdx}"><img src="${s}" alt=""></button>`).join('');
      $('#sw').innerHTML = p.colors.map((c, i) => `<button type="button" data-c="${i}" style="background:${c.hex}" aria-label="${c.name}" aria-pressed="${i === color}"></button>`).join('');
      $('#cName').textContent = p.colors[color].name;
      updateCounts();
    };
    root.addEventListener('click', e => {
      const t = e.target.closest('[data-i]'), s = e.target.closest('[data-c]');
      if (t) { imgIdx = +t.dataset.i; draw(); }
      if (s) { color = +s.dataset.c; draw(); }
    });
    const qv = $('#qv'), setQ = n => { qty = Math.max(1, Math.min(10, n || 1)); qv.value = qty; };
    $('#qm').addEventListener('click', () => setQ(qty - 1)); $('#qp').addEventListener('click', () => setQ(qty + 1));
    qv.addEventListener('change', () => setQ(parseInt(qv.value, 10)));
    $('#addBtn').addEventListener('click', () => { addToCart(p.id, qty, color); toast(qty + ' × ' + p.name + ' added to cart'); });
    $('#pinForm').addEventListener('submit', e => {
      e.preventDefault();
      const v = $('#pin').value.trim(), m = $('#pinMsg');
      if (!/^[1-9]\d{5}$/.test(v)) { m.className = 'msg bad'; m.textContent = 'Enter a valid 6-digit PIN code (it cannot start with 0).'; return; }
      const days = 4 + (parseInt(v[0], 10) % 5);
      m.className = 'msg ok'; m.textContent = 'Delivery to ' + v + ' in about ' + days + '–' + (days + 3) + ' days (sample estimate).';
    });
    draw();
    const gm = $('.gal-main'), gimg = $('#gMain'); /* hover to zoom: the image scales around the pointer */
    gm.addEventListener('mousemove', e => { const r = gm.getBoundingClientRect(); gimg.style.transformOrigin = ((e.clientX - r.left) / r.width * 100) + '% ' + ((e.clientY - r.top) / r.height * 100) + '%'; });
    const seenList = earlier.map(getProduct).filter(Boolean);
    if (seenList.length) { $('#recentWrap').hidden = false; $('#recentRow').innerHTML = seenList.map(cardHTML).join(''); }
    const rel = PRODUCTS.filter(x => x.category === p.category && x.id !== p.id).concat(PRODUCTS.filter(x => x.category !== p.category && x.rating >= 4.5)).slice(0, 4);
    $('#related').innerHTML = rel.map(cardHTML).join(''); updateCounts();
  }

  /* ---------- cart page ---------- */
  function renderCart() {
    const cart = getCart(), box = $('#cartBody');
    if (!cart.length) {
      box.innerHTML = '<div class="empty" style="grid-column:1/-1"><h2 style="margin-bottom:8px;color:var(--ink)">Your cart is empty</h2><p>Looks like you have not added anything yet.</p><a class="btn pri" href="products.html">Start shopping</a></div>';
      return;
    }
    let sub = 0, mrp = 0;
    const lines = cart.map((it, i) => {
      const p = getProduct(it.id); if (!p) return '';
      sub += p.price * it.qty; mrp += p.mrp * it.qty;
      return `<div class="line"><a class="im" href="product-detail.html?id=${p.id}"><img src="${productImages(p, it.color)[0]}" alt="${esc(p.name)}"></a>
        <div><h3><a href="product-detail.html?id=${p.id}">${esc(p.name)}</a></h3><div class="meta">Finish: ${esc((p.colors[it.color] || p.colors[0]).name)}</div>
          <div class="qty"><button type="button" data-q="${i}" data-d="-1" aria-label="Decrease quantity">−</button><input value="${it.qty}" readonly aria-label="Quantity"><button type="button" data-q="${i}" data-d="1" aria-label="Increase quantity">+</button></div>
          <button class="rm" type="button" data-rm="${i}">Remove</button></div>
        <div class="amt">${inr(p.price * it.qty)}${p.mrp > p.price ? `<s>${inr(p.mrp * it.qty)}</s>` : ''}</div></div>`;
    }).join('');
    const ship = sub >= 10000 ? 0 : 499;
    box.innerHTML = `<section aria-label="Cart items">${lines}</section>
      <aside class="sum"><h2>Order summary</h2>
        <div class="r"><span>Subtotal (MRP)</span><span>${inr(mrp)}</span></div>
        <div class="r save"><span>Discount</span><span>− ${inr(mrp - sub)}</span></div>
        <div class="r"><span>Delivery</span><span>${ship ? inr(ship) : 'Free'}</span></div>
        <div class="r tot"><span>Total</span><span>${inr(sub + ship)}</span></div>
        <button class="btn pri" id="coBtn" type="button">Proceed to checkout</button>
        <p class="note">Checkout is not available in this prototype. No payment is taken and no order is placed.</p></aside>`;
  }
  function initCart() {
    $('#cartBody').addEventListener('click', e => {
      const q = e.target.closest('[data-q]'), r = e.target.closest('[data-rm]');
      if (q) { const c = getCart()[+q.dataset.q]; setQty(+q.dataset.q, c.qty + +q.dataset.d); renderCart(); }
      if (r) { removeLine(+r.dataset.rm); toast('Item removed'); renderCart(); }
      if (e.target.id === 'coBtn') toast('Checkout is not available in this prototype.');
    });
    renderCart();
  }

  /* ---------- boot ---------- */
  function showLoadError(err) {
    const main = $('main') || document.body;
    main.innerHTML = '<div class="empty" style="margin:40px 0"><h2 style="color:var(--ink)">Catalog could not be loaded</h2><p>' + esc(err.message) +
      '</p><p>Open this site through a local web server instead of double-clicking the file, for example:<br><code>python -m http.server 8000</code> then visit http://localhost:8000</p></div>';
  }
  document.addEventListener('DOMContentLoaded', () => {
    loadCatalog().then(() => {
      buildChrome(); updateCounts();
      const page = document.body.dataset.page;
      if (page === 'home') initHome();
      else if (page === 'list') initList();
      else if (page === 'detail') initDetail();
      else if (page === 'cart') initCart();
      updateCounts();
    }).catch(showLoadError);
  });
})();
