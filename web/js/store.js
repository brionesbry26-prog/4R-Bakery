import { api } from './api.js';
import { MAX_QTY_PER_ITEM } from './config.js';
import { toCents } from './format.js';

// Tiny observable store shared by all views.
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn());
export const subscribe = (fn) => (listeners.add(fn), () => listeners.delete(fn));

const KEYS = { cart: '4r.web.cart.v1', orders: '4r.web.orders.v1' };
function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: keep in memory only */
  }
}

export const state = {
  products: [],
  categories: [],
  productsStatus: 'idle', // idle | loading | ready | error
  productsError: null,
  info: null,
  infoStatus: 'idle',
  cart: (load(KEYS.cart, []) || []).filter((i) => i && Number.isInteger(i.productId) && i.quantity > 0),
  orders: load(KEYS.orders, []) || [],
};

// ---------- Catalog ----------
export async function loadProducts() {
  state.productsStatus = 'loading';
  state.productsError = null;
  emit();
  try {
    const data = await api.getProducts();
    state.products = data.items;
    state.categories = data.categories;
    state.productsStatus = 'ready';
    syncCart(data.items);
  } catch (err) {
    state.productsError = err;
    state.productsStatus = 'error';
  }
  emit();
  return state.productsStatus === 'ready' ? state.products : null;
}

export async function loadInfo() {
  state.infoStatus = 'loading';
  emit();
  try {
    state.info = await api.getBakeryInfo();
    state.infoStatus = 'ready';
  } catch {
    state.infoStatus = 'error';
  }
  emit();
}

export const productById = (id) => state.products.find((p) => p.id === Number(id)) || null;

// ---------- Cart ----------
const persistCart = () => {
  save(KEYS.cart, state.cart);
  emit();
};
const clamp = (q) => Math.max(1, Math.min(MAX_QTY_PER_ITEM, Math.floor(q)));
const toItem = (p, quantity) => ({
  productId: p.id,
  name: p.name,
  price: p.price,
  unit: p.unit,
  category: p.category,
  imageUrl: p.image_url ?? null,
  isAvailable: p.is_available !== false,
  quantity,
});

export function addToCart(product, quantity = 1) {
  if (!product || product.is_available === false) return false;
  const existing = state.cart.find((i) => i.productId === product.id);
  if (existing) Object.assign(existing, toItem(product, clamp(existing.quantity + quantity)));
  else state.cart.push(toItem(product, clamp(quantity)));
  persistCart();
  return true;
}

export function setQuantity(productId, quantity) {
  if (quantity <= 0) return removeFromCart(productId);
  const item = state.cart.find((i) => i.productId === productId);
  if (item) item.quantity = clamp(quantity);
  persistCart();
}

export function removeFromCart(productId) {
  state.cart = state.cart.filter((i) => i.productId !== productId);
  persistCart();
}

export function clearCart() {
  state.cart = [];
  persistCart();
}

/** Refresh cart names/prices/availability from the latest catalog; returns change messages. */
export function syncCart(products) {
  const byId = new Map(products.map((p) => [p.id, p]));
  const changes = [];
  state.cart = state.cart.map((item) => {
    const p = byId.get(item.productId);
    if (!p) {
      changes.push(`${item.name} is no longer on the menu.`);
      return { ...item, isAvailable: false, missing: true };
    }
    if (!p.is_available && item.isAvailable) changes.push(`${p.name} is currently unavailable.`);
    else if (toCents(p.price) !== toCents(item.price)) changes.push(`${p.name} price changed to the current menu price.`);
    return { ...toItem(p, item.quantity), missing: false };
  });
  save(KEYS.cart, state.cart);
  return changes;
}

export function cartTotals() {
  let count = 0;
  let subtotalCents = 0;
  for (const i of state.cart) {
    count += i.quantity;
    subtotalCents += toCents(i.price) * i.quantity;
  }
  return { count, subtotalCents, blocked: state.cart.some((i) => !i.isAvailable) };
}

// ---------- Orders remembered on this browser ----------
export function rememberOrder(reference, phone, snapshot) {
  state.orders = [{ reference, phone, savedAt: new Date().toISOString(), snapshot }, ...state.orders.filter((o) => o.reference !== reference)].slice(0, 30);
  save(KEYS.orders, state.orders);
  emit();
}

export function updateOrderSnapshot(reference, snapshot) {
  const entry = state.orders.find((o) => o.reference === reference);
  if (entry) {
    entry.snapshot = snapshot;
    save(KEYS.orders, state.orders);
  }
}

export function forgetOrder(reference) {
  state.orders = state.orders.filter((o) => o.reference !== reference);
  save(KEYS.orders, state.orders);
  emit();
}
