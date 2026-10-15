import { esc, formatCents, formatPeso, toCents } from './format.js';
import { icon } from './icons.js';
import { productVisual } from './illustrations.js';
import { parseHash } from './router.js';
import { addToCart, cartTotals, loadInfo, loadProducts, productById, removeFromCart, setQuantity, state, subscribe } from './store.js';
import { emptyState, stepper, toast } from './ui.js';
import { checkout } from './views/checkout.js';
import { home } from './views/home.js';
import { menu } from './views/menu.js';
import { confirmation, track } from './views/orders.js';
import { product } from './views/product.js';
import { visit } from './views/visit.js';

const NAV = [
  ['#/', 'Home'],
  ['#/menu', 'Menu'],
  ['#/track', 'Track order'],
  ['#/visit', 'Visit us'],
];

function resolve(route) {
  const [first, second] = route.segments;
  if (!first) return { view: home, params: {} };
  if (first === 'menu') return { view: menu, params: { query: route.query } };
  if (first === 'product' && second) return { view: product, params: { id: second } };
  if (first === 'checkout') return { view: checkout, params: {} };
  if (first === 'order' && second) return { view: confirmation, params: { ref: decodeURIComponent(second) } };
  if (first === 'track') return { view: track, params: {} };
  if (first === 'visit') return { view: visit, params: {} };
  return { view: null, params: {} };
}

// ---------- Shell ----------
function shell() {
  document.body.insertAdjacentHTML(
    'afterbegin',
    `<a class="skip-link" href="#main" data-skip>Skip to content</a>
    <header class="site-header" id="site-header">
      <div class="container">
        <a class="brand" href="#/" aria-label="4R Bakery home"><span class="brand-mark">4R</span>
          <span class="brand-name">4R Bakery<small>Bachawan · San Agustin, Romblon</small></span></a>
        <nav class="nav" id="nav" aria-label="Main">${NAV.map(([h, l]) => `<a href="${h}">${l}</a>`).join('')}</nav>
        <div class="header-actions">
          <button class="cart-btn" data-action="open-cart" aria-haspopup="dialog">${icon('bag')}<span class="label">Bag</span><span class="cart-count" id="cart-count">0</span></button>
          <button class="menu-toggle" data-action="toggle-nav" aria-expanded="false" aria-controls="nav" aria-label="Open menu">${icon('menu')}</button>
        </div>
      </div>
    </header>`
  );
  document.body.insertAdjacentHTML(
    'beforeend',
    `<footer class="site-footer">
      <div class="container">
        <div class="footer-grid">
          <div><a class="brand" href="#/"><span class="brand-mark">4R</span><span class="brand-name">4R Bakery<small>Freshly baked, made with love</small></span></a>
            <p class="footer-note">A neighborhood bakery in Brgy. Bachawan, San Agustin, Romblon. Pre-order online and pick up fresh.</p></div>
          <div><h4>Explore</h4><ul><li><a href="#/menu">Menu</a></li><li><a href="#/menu?category=Cakes">Cakes</a></li><li><a href="#/checkout">Pre-order</a></li></ul></div>
          <div><h4>Help</h4><ul><li><a href="#/track">Track an order</a></li><li><a href="#/visit">Visit & contact</a></li></ul></div>
          <div><h4>Visit</h4><ul id="footer-visit"></ul></div>
        </div>
        <div class="footer-bottom"><span>© ${new Date().getFullYear()} 4R Bakery</span><span>Pre-orders are requests pending bakery confirmation. No online payment.</span></div>
      </div>
    </footer>
    <div class="drawer-backdrop" data-action="close-cart"></div>
    <aside class="drawer" id="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title" aria-hidden="true" inert>
      <div class="drawer-head"><h2 class="h3" id="drawer-title">Your bag</h2><button class="icon-btn" data-action="close-cart" aria-label="Close bag">${icon('x')}</button></div>
      <div class="drawer-body" id="drawer-body"></div>
      <div class="drawer-foot" id="drawer-foot"></div>
    </aside>
    <div class="toast-region" id="toasts" role="status" aria-live="polite"></div>`
  );
}

function renderChrome() {
  const { count, subtotalCents, blocked } = cartTotals();
  const badge = document.getElementById('cart-count');
  if (badge.textContent !== String(count)) {
    badge.textContent = count > 99 ? '99+' : count;
    badge.classList.remove('bump');
    void badge.offsetWidth;
    badge.classList.add('bump');
  }
  badge.dataset.empty = String(count === 0);
  badge.closest('.cart-btn').setAttribute('aria-label', `Bag, ${count} item${count === 1 ? '' : 's'}`);

  const body = document.getElementById('drawer-body');
  const foot = document.getElementById('drawer-foot');
  if (!state.cart.length) {
    body.innerHTML = emptyState({ title: 'Your bag is empty', text: 'Add some freshly baked favorites to get started.' }) + `<div style="text-align:center"><a class="btn" href="#/menu" data-action="close-cart">Browse the menu</a></div>`;
    foot.innerHTML = '';
  } else {
    body.innerHTML = state.cart
      .map(
        (i) => `<div class="line-item">
        <div class="line-thumb">${productVisual({ name: i.name, category: i.category, image_url: i.imageUrl })}</div>
        <div>
          <div class="line-top"><a class="line-name" href="#/product/${i.productId}" data-action="close-cart">${esc(i.name)}</a><strong>${formatCents(toCents(i.price) * i.quantity)}</strong></div>
          <div class="muted small">${formatPeso(i.price)} / ${esc(i.unit)}</div>
          ${i.isAvailable ? '' : `<div class="small" style="color:var(--danger);margin-top:4px">${i.missing ? 'No longer on the menu' : 'Currently unavailable'} — please remove</div>`}
          <div class="line-bottom">${stepper(`cart-${i.productId}`, i.quantity, { size: 'stepper--sm', name: i.name })}
            <button class="remove-btn" data-action="remove" data-id="${i.productId}">Remove</button></div>
        </div></div>`
      )
      .join('');
    foot.innerHTML = `<div class="total-row"><span>Estimated subtotal</span><span class="amount">${formatCents(subtotalCents)}</span></div>
      <p class="muted small">Pickup only. Final total is confirmed by the bakery’s server.</p>
      ${blocked ? `<div class="alert alert--error">${icon('alert')}<span>Remove unavailable items to continue.</span></div>` : ''}
      <a class="btn btn--lg btn--block" href="#/checkout" data-action="close-cart" ${blocked ? 'aria-disabled="true" tabindex="-1"' : ''}>Proceed to pre-order ${icon('arrowRight')}</a>`;
  }

  const fv = document.getElementById('footer-visit');
  const info = state.info;
  fv.innerHTML = `<li>${esc(info?.address || 'Brgy. Bachawan, San Agustin, Romblon')}</li>
    <li>${info?.operating_hours ? esc(info.operating_hours) : 'Hours to be announced'}</li>
    <li>${info?.phone ? `<a href="tel:${esc(info.phone.replace(/[^\d+]/g, ''))}">${esc(info.phone)}</a>` : 'Phone to be announced'}</li>`;
}

// ---------- Drawer ----------
let lastFocus = null;
function openCart() {
  lastFocus = document.activeElement;
  document.body.classList.add('drawer-open');
  const d = document.getElementById('drawer');
  d.removeAttribute('inert');
  d.setAttribute('aria-hidden', 'false');
  d.querySelector('.icon-btn').focus();
}
function closeCart() {
  document.body.classList.remove('drawer-open');
  const d = document.getElementById('drawer');
  d.setAttribute('inert', '');
  d.setAttribute('aria-hidden', 'true');
  lastFocus?.focus?.();
}

// ---------- Routing ----------
const main = () => document.getElementById('main');
let current = { view: null, cleanup: null };
let revealObserver = null;

function observeReveals(root) {
  revealObserver?.disconnect();
  const els = root.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) return els.forEach((el) => el.classList.add('is-visible'));
  revealObserver = new IntersectionObserver(
    (entries) => entries.forEach((en) => en.isIntersecting && (en.target.classList.add('is-visible'), revealObserver.unobserve(en.target))),
    { rootMargin: '0px 0px -8% 0px' }
  );
  els.forEach((el) => revealObserver.observe(el));
}

function route() {
  const r = parseHash();
  const { view, params } = resolve(r);
  current.cleanup?.();
  document.getElementById('toasts').innerHTML = '';
  document.body.classList.remove('nav-open');
  document.querySelector('[data-action="toggle-nav"]').setAttribute('aria-expanded', 'false');
  const root = main();
  if (!view) {
    root.innerHTML = `<div class="container" style="padding:96px 24px">${emptyState({ iconName: 'search', title: 'Page not found', text: 'That page doesn’t exist.', actionHref: '#/', actionLabel: 'Back to home' })}</div>`;
    current = { view: null, cleanup: null };
  } else {
    root.innerHTML = view.render(params);
    current = { view, cleanup: view.mount?.(root, params) || null };
    document.title = `${view.title} · 4R Bakery`;
  }
  for (const a of document.querySelectorAll('#nav a')) {
    const target = a.getAttribute('href').slice(1);
    const active = target === '/' ? r.path === '/' : r.path.startsWith(target);
    if (active) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  observeReveals(root);
}

// ---------- Global actions ----------
function onClick(e) {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const { action, id } = el.dataset;
  switch (action) {
    case 'add': {
      const p = productById(id);
      if (p && addToCart(p, 1)) toast(`${p.name} added to your bag`, { label: 'View bag', action: 'open-cart' });
      break;
    }
    case 'open-cart':
      openCart();
      break;
    case 'close-cart':
      closeCart();
      break;
    case 'toggle-nav': {
      const open = document.body.classList.toggle('nav-open');
      el.setAttribute('aria-expanded', String(open));
      break;
    }
    case 'remove':
      removeFromCart(Number(id));
      break;
    case 'inc':
    case 'dec':
      if (id?.startsWith('cart-')) {
        const pid = Number(id.slice(5));
        const item = state.cart.find((i) => i.productId === pid);
        if (item) setQuantity(pid, item.quantity + (action === 'inc' ? 1 : -1));
      }
      break;
    case 'reload-products':
      loadProducts();
      break;
    default:
  }
  if (el.getAttribute('aria-disabled') === 'true') e.preventDefault();
}

function onChange(e) {
  const id = e.target.dataset?.qty;
  if (id?.startsWith('cart-')) setQuantity(Number(id.slice(5)), Math.floor(Number(e.target.value)) || 0);
}

function init() {
  shell();
  document.addEventListener('click', onClick);
  document.addEventListener('change', onChange);
  document.addEventListener('keydown', (e) => e.key === 'Escape' && document.body.classList.contains('drawer-open') && closeCart());
  window.addEventListener('scroll', () => document.getElementById('site-header').classList.toggle('is-scrolled', window.scrollY > 8), { passive: true });
  window.addEventListener('hashchange', (e) => {
    if (window.location.hash === '#main') return;
    route(e);
  });
  document.querySelector('[data-skip]').addEventListener('click', (e) => {
    e.preventDefault();
    main().focus();
  });
  subscribe(() => {
    renderChrome();
    current.view?.update?.(main());
  });
  renderChrome();
  route();
  loadProducts();
  loadInfo();
}

init();
