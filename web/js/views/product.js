import { api } from '../api.js';
import { MAX_QTY_PER_ITEM } from '../config.js';
import { esc, formatCents, formatPeso, toCents } from '../format.js';
import { icon } from '../icons.js';
import { productVisual } from '../illustrations.js';
import { addToCart, productById, state } from '../store.js';
import { errorState, productCard, stepper, toast } from '../ui.js';

let view = { id: null, product: null, status: 'loading', error: null, qty: 1, stale: false };

function body() {
  const p = view.product;
  if (view.status === 'loading' && !p) return `<div class="detail"><div class="skeleton" style="min-height:460px"></div><div class="skeleton" style="min-height:460px"></div></div>`;
  if (!p) return errorState(view.error, { title: view.error?.status === 404 ? 'Product not found' : 'Couldn’t load this product', retry: view.error?.status === 404 ? '' : 'reload-product' });
  const inBag = state.cart.find((i) => i.productId === p.id)?.quantity || 0;
  const max = Math.max(1, Math.min(state.info?.pickup?.max_quantity_per_item ?? MAX_QTY_PER_ITEM, MAX_QTY_PER_ITEM) - inBag);
  view.qty = Math.min(view.qty, max);
  const related = state.products.filter((x) => x.category === p.category && x.id !== p.id).slice(0, 3);
  return `
  <div class="detail">
    <div class="detail-art">${productVisual(p)}</div>
    <div class="detail-info">
      <span class="product-cat">${esc(p.category)}</span>
      <h1 class="h1" style="margin-top:8px">${esc(p.name)}</h1>
      <div style="display:flex;gap:10px;align-items:center;margin-top:14px">
        <span class="badge ${p.is_available ? 'badge--ok' : 'badge--off'}">${p.is_available ? 'Available for pre-order' : 'Currently unavailable'}</span>
        ${p.stock_quantity != null ? `<span class="muted small">${p.stock_quantity > 0 ? `${p.stock_quantity} left` : 'Out of stock'}</span>` : ''}
      </div>
      <div class="price">${formatPeso(p.price)} <small>/ ${esc(p.unit)}</small></div>
      <p class="desc">${esc(p.description)}</p>
      ${view.stale ? `<div class="alert alert--warning" style="margin-top:20px">${icon('offline')}<span>Couldn’t refresh this product. Details may be out of date — prices are re-checked at checkout.</span></div>` : ''}
      <div class="card buy-box">
        ${p.is_available ? `
        <div class="buy-row">
          <div><div class="label">Quantity</div>${inBag ? `<div class="muted small">${inBag} already in your bag</div>` : ''}</div>
          ${stepper('detail', view.qty, { max, name: p.name })}
        </div>
        <div class="buy-row" style="border-top:1px dashed var(--border);padding-top:18px">
          <span class="muted">Item total</span><strong style="font-size:1.35rem" id="line-total">${formatCents(toCents(p.price) * view.qty)}</strong>
        </div>
        <button class="btn btn--lg btn--block" data-action="add-detail" ${inBag >= MAX_QTY_PER_ITEM ? 'disabled' : ''}>${icon('bag')} Add to bag</button>`
        : `<div class="alert alert--error">${icon('alert')}<span>This item can’t be pre-ordered right now. Please check back later or contact the bakery.</span></div>`}
      </div>
      <ul class="meta-list">
        <li>${icon('store')}Pickup at the bakery in Brgy. Bachawan</li>
        <li>${icon('clipboard')}Pre-orders are confirmed by the bakery before baking</li>
        <li>${icon('info')}No online payment — the bakery confirms payment details with you</li>
      </ul>
    </div>
  </div>
  ${related.length ? `<section style="padding-bottom:96px"><div class="section-head"><div><span class="eyebrow">You may also like</span><h2 class="h2">More ${esc(p.category.toLowerCase())}</h2></div></div><div class="grid grid--3">${related.map(productCard).join('')}</div></section>` : ''}`;
}

async function load(root) {
  try {
    view.product = await api.getProduct(view.id);
    view.status = 'ready';
    view.stale = false;
  } catch (err) {
    view.error = err;
    if (view.product && err.status !== 404) view.stale = true;
    else view.product = null;
    view.status = 'error';
  }
  if (root.isConnected) product.update(root);
}

export const product = {
  get title() {
    return view.product?.name || 'Product';
  },
  render(params) {
    const cached = productById(params.id);
    view = { id: params.id, product: cached, status: cached ? 'ready' : 'loading', error: null, qty: 1, stale: false };
    return `<header class="page-head" style="padding-bottom:24px"><div class="container">
      <nav class="crumbs" aria-label="Breadcrumb"><a href="#/">Home</a><span>/</span><a href="#/menu">Menu</a><span>/</span><span id="crumb-name">${esc(cached?.name || 'Product')}</span></nav>
      <a class="link" href="#/menu">${icon('arrowLeft', { size: 18 })} Back to menu</a></div></header>
      <div class="container" id="detail-root">${body()}</div>`;
  },
  update(root) {
    const el = root.querySelector('#detail-root');
    if (el) el.innerHTML = body();
    const crumb = root.querySelector('#crumb-name');
    if (crumb && view.product) crumb.textContent = view.product.name;
    if (view.product) document.title = `${view.product.name} · 4R Bakery`;
  },
  mount(root) {
    load(root);
    const setQty = (q) => {
      view.qty = Math.max(1, Math.floor(q) || 1);
      product.update(root);
    };
    const onClick = (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn || !root.contains(btn)) return;
      const a = btn.dataset.action;
      if (btn.dataset.id === 'detail' && a === 'inc') setQty(view.qty + 1);
      else if (btn.dataset.id === 'detail' && a === 'dec') setQty(view.qty - 1);
      else if (a === 'add-detail' && view.product) {
        if (addToCart(view.product, view.qty)) {
          toast(`Added ${view.qty} × ${view.product.name} to your bag`, { label: 'View bag', action: 'open-cart' });
          view.qty = 1;
          product.update(root);
        }
      } else if (a === 'reload-product') load(root);
    };
    const onChange = (e) => {
      if (e.target.matches('[data-qty="detail"]')) setQty(Number(e.target.value));
    };
    root.addEventListener('click', onClick);
    root.addEventListener('change', onChange);
    return () => {
      root.removeEventListener('click', onClick);
      root.removeEventListener('change', onChange);
    };
  },
};
