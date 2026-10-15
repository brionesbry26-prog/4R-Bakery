import { toCents } from '../utils/money';

export const MAX_QTY_PER_ITEM = 500;

export const initialCartState = { items: [], hydrated: false };

function clampQty(q, max = MAX_QTY_PER_ITEM) {
  return Math.max(1, Math.min(max, Math.floor(q)));
}

export function productToCartItem(product, quantity) {
  return {
    productId: product.id,
    name: product.name,
    price: product.price,
    unit: product.unit,
    category: product.category,
    imageUrl: product.image_url ?? null,
    isAvailable: product.is_available !== false,
    quantity,
  };
}

export function cartReducer(state, action) {
  switch (action.type) {
    case 'HYDRATE': {
      const items = Array.isArray(action.items)
        ? action.items.filter((i) => i && Number.isInteger(i.productId) && i.quantity > 0)
        : [];
      // Keep anything added before hydration finished.
      const merged = [...items];
      for (const current of state.items) {
        const idx = merged.findIndex((i) => i.productId === current.productId);
        if (idx >= 0) merged[idx] = current;
        else merged.push(current);
      }
      return { items: merged, hydrated: true };
    }
    case 'ADD': {
      const { product, quantity = 1 } = action;
      if (!product || product.is_available === false) return state;
      const existing = state.items.find((i) => i.productId === product.id);
      if (existing) {
        return {
          ...state,
          items: state.items.map((i) =>
            i.productId === product.id
              ? { ...productToCartItem(product, clampQty(i.quantity + quantity)) }
              : i
          ),
        };
      }
      return { ...state, items: [...state.items, productToCartItem(product, clampQty(quantity))] };
    }
    case 'SET_QUANTITY': {
      if (action.quantity <= 0) {
        return { ...state, items: state.items.filter((i) => i.productId !== action.productId) };
      }
      return {
        ...state,
        items: state.items.map((i) =>
          i.productId === action.productId ? { ...i, quantity: clampQty(action.quantity) } : i
        ),
      };
    }
    case 'REMOVE':
      return { ...state, items: state.items.filter((i) => i.productId !== action.productId) };
    case 'CLEAR':
      return { ...state, items: [] };
    case 'SYNC_PRODUCTS': {
      // Refresh names/prices/availability from the latest catalog.
      const byId = new Map(action.products.map((p) => [p.id, p]));
      return {
        ...state,
        items: state.items.map((i) => {
          const p = byId.get(i.productId);
          if (!p) return { ...i, isAvailable: false, missing: true };
          return { ...productToCartItem(p, i.quantity), missing: false };
        }),
      };
    }
    default:
      return state;
  }
}

/** Compares cart items to fresh products; returns human-readable changes. */
export function diffCartAgainstCatalog(items, products) {
  const byId = new Map(products.map((p) => [p.id, p]));
  const changes = [];
  for (const item of items) {
    const p = byId.get(item.productId);
    if (!p) {
      changes.push({ productId: item.productId, kind: 'missing', message: `${item.name} is no longer on the menu.` });
    } else if (!p.is_available) {
      changes.push({ productId: item.productId, kind: 'unavailable', message: `${p.name} is currently unavailable.` });
    } else if (toCents(p.price) !== toCents(item.price)) {
      changes.push({
        productId: item.productId,
        kind: 'price',
        message: `${p.name} price changed.`,
      });
    }
  }
  return changes;
}

export function cartTotals(items) {
  let count = 0;
  let subtotalCents = 0;
  for (const i of items) {
    count += i.quantity;
    subtotalCents += toCents(i.price) * i.quantity;
  }
  return { count, subtotalCents };
}
