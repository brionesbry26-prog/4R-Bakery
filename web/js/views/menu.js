import { esc, toCents } from '../format.js';
import { icon } from '../icons.js';
import { state } from '../store.js';
import { emptyState, errorState, productCard, skeletonGrid } from '../ui.js';

const ALL = 'All';
const SORTS = [
  ['featured', 'Featured'],
  ['name', 'Name: A–Z'],
  ['-name', 'Name: Z–A'],
  ['price', 'Price: low to high'],
  ['-price', 'Price: high to low'],
];
const ui = { category: ALL, search: '', sort: 'featured' };

export function filterProducts(products, { category = ALL, search = '', sort = 'featured' } = {}) {
  const term = search.trim().toLowerCase();
  const byName = (a, b) => a.name.localeCompare(b.name);
  const sorters = {
    featured: (a, b) => Number(b.is_featured) - Number(a.is_featured) || Number(b.is_available) - Number(a.is_available) || a.category.localeCompare(b.category) || byName(a, b),
    name: byName,
    '-name': (a, b) => byName(b, a),
    price: (a, b) => toCents(a.price) - toCents(b.price) || byName(a, b),
    '-price': (a, b) => toCents(b.price) - toCents(a.price) || byName(a, b),
  };
  return products
    .filter((p) => (category === ALL || p.category === category) && (!term || `${p.name} ${p.description}`.toLowerCase().includes(term)))
    .sort(sorters[sort] || sorters.featured);
}

function categoryButtons() {
  const counts = {};
  for (const p of state.products) counts[p.category] = (counts[p.category] || 0) + 1;
  return [ALL, ...state.categories]
    .map((c) => `<button class="cat-btn" data-action="category" data-category="${esc(c)}" aria-pressed="${ui.category === c}">
      <span>${c === ALL ? 'All products' : esc(c)}</span><span class="count">${c === ALL ? state.products.length : counts[c] || 0}</span></button>`)
    .join('');
}

function results() {
  if (state.productsStatus === 'error' && !state.products.length) return errorState(state.productsError, { title: 'Couldn’t load the menu', retry: 'reload-products' });
  if (!state.products.length) return skeletonGrid(6, 'grid--3');
  const list = filterProducts(state.products, ui);
  if (!list.length)
    return `${emptyState({ iconName: 'search', title: 'No matches', text: ui.search ? `Nothing on the menu matches “${ui.search}”.` : 'No products in this category yet.' })}
      <div style="text-align:center"><button class="btn btn--soft" data-action="clear-filters">Clear filters</button></div>`;
  return `<div class="grid grid--3">${list.map(productCard).join('')}</div>`;
}

function countLine() {
  const n = state.products.length ? filterProducts(state.products, ui).length : 0;
  return `${n} item${n === 1 ? '' : 's'}${ui.category !== ALL ? ` in ${esc(ui.category)}` : ''}`;
}

export const menu = {
  title: 'Menu',
  render(params) {
    if (params.query.category) ui.category = params.query.category;
    return `
    <header class="page-head">
      <div class="container">
        <nav class="crumbs" aria-label="Breadcrumb"><a href="#/">Home</a><span>/</span><span>Menu</span></nav>
        <h1 class="h1">Our menu</h1>
        <p class="lead">Freshly baked breads, pastries and cakes. Prices are in Philippine pesos and confirmed at checkout.</p>
      </div>
    </header>
    <div class="container menu-layout">
      <aside class="filters" aria-label="Filters">
        <div>
          <label class="filter-title" for="menu-search">Search</label>
          <div class="search">${icon('search')}<input id="menu-search" class="input" type="search" placeholder="Pandesal, cake…" value="${esc(ui.search)}" maxlength="80" autocomplete="off"></div>
        </div>
        <div>
          <div class="filter-title" id="cat-label">Categories</div>
          <div class="cat-list" role="group" aria-labelledby="cat-label" id="cat-list">${categoryButtons()}</div>
        </div>
        <div class="notice-card"><strong>Pre-orders are requests</strong>Your order stays pending until 4R Bakery confirms it. No payment is collected online.</div>
      </aside>
      <section aria-label="Products">
        <div class="toolbar">
          <p class="muted" id="count-line" aria-live="polite">${countLine()}</p>
          <label class="sr-only" for="sort">Sort by</label>
          <select id="sort" class="select" style="width:auto;min-height:44px">${SORTS.map(([v, l]) => `<option value="${v}" ${ui.sort === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
        </div>
        <div id="results">${results()}</div>
      </section>
    </div>`;
  },
  update(root) {
    root.querySelector('#results').innerHTML = results();
    root.querySelector('#cat-list').innerHTML = categoryButtons();
    root.querySelector('#count-line').innerHTML = countLine();
  },
  mount(root) {
    let t;
    const search = root.querySelector('#menu-search');
    search.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => {
        ui.search = search.value;
        menu.update(root);
      }, 180);
    });
    root.querySelector('#sort').addEventListener('change', (e) => {
      ui.sort = e.target.value;
      menu.update(root);
    });
    const onClick = (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      if (btn.dataset.action === 'category') {
        clearTimeout(t);
        ui.search = search.value; // don't let a pending debounce use a stale term
        ui.category = btn.dataset.category;
        menu.update(root);
      } else if (btn.dataset.action === 'clear-filters') {
        ui.category = ALL;
        ui.search = '';
        search.value = '';
        menu.update(root);
      }
    };
    root.addEventListener('click', onClick);
    return () => root.removeEventListener('click', onClick);
  },
};
