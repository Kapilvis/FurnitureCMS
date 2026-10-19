'use strict';
/* Motion plugin (no dependencies): scroll reveals with stagger, image fade-in, page fade in/out,
   scroll progress bar, header shrink, hero parallax, back-to-top button.
   Skips everything when the visitor prefers reduced motion. Also picks up content added later (catalog loads, filters). */
(function () {
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) return;
  const root = document.documentElement;
  root.classList.add('js-motion');

  /* selector -> animation style. Add a row here to animate a new block. */
  const RULES = [
    ['.hero', 'fade'], ['.crumbs', 'fade'], ['.lp-h', 'up'], ['.emi', 'up'], ['.sec-h', 'up'],
    ['.ostrip > div', 'up'], ['.tile', 'zoom'], ['.cat', 'zoom'], ['.card', 'up'],
    ['.bgreat', 'zoom'], ['.bt', 'zoom'], ['.mc', 'zoom'], ['.na', 'up'], ['.dz', 'up'], ['.tc', 'zoom'],
    ['.fb', 'up'], ['.split', 'up'], ['.trust > div', 'up'], ['.news .wrap', 'up'], ['.foot .cols > div', 'up'],
    ['.pd > div:first-child', 'left'], ['.pd > div:last-child', 'right']
  ];
  const STEP = 70, MAX_STEPS = 8;
  const seen = new WeakMap(); /* container -> keys of cards already revealed (so "load more" only animates new cards) */

  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { reveal(e.target); io.unobserve(e.target); } });
  }, { threshold: 0.05, rootMargin: '0px 0px -5% 0px' });

  function reveal(el) {
    el.classList.add('in');
    const delay = parseInt(el.style.getPropertyValue('--d'), 10) || 0;
    setTimeout(() => { /* clean up so hover effects are not delayed or blocked afterwards */
      el.removeAttribute('data-anim'); el.classList.remove('in'); el.style.removeProperty('--d');
    }, 1300 + delay);
  }

  function prepare(node) {
    if (node.nodeType !== 1) return;
    RULES.forEach(([sel, kind]) => {
      const list = [];
      if (node.matches(sel)) list.push(node);
      node.querySelectorAll(sel).forEach(n => list.push(n));
      list.forEach(el => {
        if (el.hasAttribute('data-anim') || el.dataset.animDone) return;
        el.dataset.animDone = '1';
        const parent = el.parentElement;
        if (el.classList.contains('card') && parent) {
          const a = el.querySelector('a');
          const key = a ? a.getAttribute('href') : '';
          let set = seen.get(parent); if (!set) { set = new Set(); seen.set(parent, set); }
          if (set.has(key)) return; /* already shown in this list: no replay */
          set.add(key);
        }
        const sibs = parent ? Array.from(parent.children).filter(c => c.matches(sel)) : [el];
        el.style.setProperty('--d', Math.min(sibs.indexOf(el), MAX_STEPS) * STEP + 'ms');
        el.setAttribute('data-anim', kind);
        io.observe(el);
      });
    });
    prepareImages(node);
  }

  function prepareImages(node) {
    const imgs = node.tagName === 'IMG' ? [node] : Array.from(node.querySelectorAll('main img'));
    imgs.forEach(img => { if (!img.complete && !img.classList.contains('ready')) img.classList.add('fade'); });
  }
  const done = e => { if (e.target && e.target.tagName === 'IMG') e.target.classList.add('ready'); };
  document.addEventListener('load', done, true);
  document.addEventListener('error', done, true);

  /* pick up everything rendered later by main.js */
  new MutationObserver(muts => muts.forEach(m => m.addedNodes.forEach(prepare))).observe(document.documentElement, { childList: true, subtree: true });
  prepare(document.documentElement);

  /* ---------- scroll effects (one rAF-throttled listener) ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    const bar = document.createElement('div'); bar.className = 'scroll-progress'; bar.setAttribute('aria-hidden', 'true');
    const top = document.createElement('button'); top.className = 'to-top'; top.type = 'button'; top.setAttribute('aria-label', 'Back to top'); top.textContent = '↑';
    top.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    document.body.append(bar, top);

    let ticking = false;
    const update = () => {
      ticking = false;
      const y = window.scrollY || root.scrollTop;
      const max = Math.max(1, root.scrollHeight - window.innerHeight);
      bar.style.transform = 'scaleX(' + Math.min(1, y / max) + ')';
      top.classList.toggle('show', y > 700);
      const header = document.querySelector('.header');
      if (header) header.classList.toggle('scrolled', y > 12);
      const art = document.querySelector('.hero-art');
      if (art && y < 1000) art.style.transform = 'translateY(' + Math.round(y * 0.1) + 'px)';
    };
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', update);
    update();
  });

  /* ---------- page fade out when following an internal link ---------- */
  document.addEventListener('click', e => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target || a.hasAttribute('download')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || /^\/admin(\/|$)/.test(url.pathname)) return;
    if (url.pathname === location.pathname && url.search === location.search) return; /* same page or #anchor */
    if (!/(\.html|\/)$/.test(url.pathname)) return;
    e.preventDefault();
    document.body.classList.add('leaving');
    setTimeout(() => { location.href = url.href; }, 200);
  });
  window.addEventListener('pageshow', e => { if (e.persisted) document.body.classList.remove('leaving'); }); /* back button from bfcache */
})();
