import { esc, formatPeso } from './format.js';
import { icon } from './icons.js';
import { productVisual } from './illustrations.js';
import { state } from './store.js';

export function productCard(p) {
  const inBag = state.cart.find((i) => i.productId === p.id)?.quantity || 0;
  const available = p.is_available;
  return `
  <article class="card product-card${available ? '' : ' is-unavailable'}" data-product="${p.id}">
    <div class="product-art">${productVisual(p)}
      ${available ? (p.is_featured ? '<span class="badge badge--featured">Bestseller</span>' : '') : '<span class="badge badge--off">Unavailable</span>'}
    </div>
    <div class="product-body">
      <span class="product-cat">${esc(p.category)}</span>
      <h3 class="product-name"><a href="#/product/${p.id}">${esc(p.name)}</a></h3>
      <p class="product-desc">${esc(p.description)}</p>
      <div class="product-foot">
        <div class="price">${formatPeso(p.price)}<small>per ${esc(p.unit)}</small></div>
        <button class="add-btn" data-action="add" data-id="${p.id}" ${available ? '' : 'disabled'}
          aria-label="${available ? `Add ${esc(p.name)} to bag` : `${esc(p.name)} is unavailable`}">
          ${icon(inBag ? 'check' : 'plus', { size: 22 })}
          ${inBag ? `<span class="qty">${inBag}</span>` : ''}
        </button>
      </div>
    </div>
  </article>`;
}

export function skeletonGrid(n = 4, cls = 'grid--4') {
  return `<div class="grid ${cls}" aria-busy="true" aria-label="Loading products">${'<div class="skeleton"></div>'.repeat(n)}</div>`;
}

export function errorState(err, { title = 'Couldn’t load this', retry = 'retry' } = {}) {
  const offline = err?.isNetworkError;
  return `<div class="state" role="alert">
    <div class="icon-badge">${icon(offline ? 'offline' : 'alert', { size: 30 })}</div>
    <h3 class="h3">${offline ? 'We can’t reach the bakery right now' : esc(title)}</h3>
    <p>${esc(err?.message || 'Please try again.')}</p>
    ${retry ? `<button class="btn" data-action="${retry}">${icon('refresh')} Try again</button>` : ''}
  </div>`;
}

export function emptyState({ iconName = 'bag', title, text, actionHref, actionLabel }) {
  return `<div class="state">
    <div class="icon-badge">${icon(iconName, { size: 30 })}</div>
    <h3 class="h3">${esc(title)}</h3>
    ${text ? `<p>${esc(text)}</p>` : ''}
    ${actionHref ? `<a class="btn" href="${actionHref}">${esc(actionLabel)}</a>` : ''}
  </div>`;
}

export function stepper(id, qty, { min = 1, max = 500, size = '', name = 'item' } = {}) {
  return `<div class="stepper ${size}" data-stepper="${id}">
    <button type="button" data-action="dec" data-id="${id}" aria-label="Decrease ${esc(name)} quantity" ${qty <= min ? 'disabled' : ''}>${icon('minus', { size: 18 })}</button>
    <input type="number" inputmode="numeric" min="${min}" max="${max}" value="${qty}" data-qty="${id}" aria-label="${esc(name)} quantity">
    <button type="button" data-action="inc" data-id="${id}" aria-label="Increase ${esc(name)} quantity" ${qty >= max ? 'disabled' : ''}>${icon('plus', { size: 18 })}</button>
  </div>`;
}

let toastTimer;
export function toast(message, action) {
  const region = document.getElementById('toasts');
  if (!region) return;
  clearTimeout(toastTimer);
  region.innerHTML = `<div class="toast">${icon('checkCircle')}<span>${esc(message)}</span>${
    action ? `<button data-action="${action.action}">${esc(action.label)}</button>` : ''
  }</div>`;
  toastTimer = setTimeout(() => (region.innerHTML = ''), 3500);
}
