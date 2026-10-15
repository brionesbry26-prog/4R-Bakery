import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';

import { readJson, STORAGE_KEYS, writeJson } from '../services/storage';
import { cartReducer, cartTotals, initialCartState } from './cartReducer';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, initialCartState);

  useEffect(() => {
    let active = true;
    readJson(STORAGE_KEYS.cart, []).then((items) => {
      if (active) dispatch({ type: 'HYDRATE', items });
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (state.hydrated) writeJson(STORAGE_KEYS.cart, state.items);
  }, [state.items, state.hydrated]);

  const addItem = useCallback((product, quantity = 1) => dispatch({ type: 'ADD', product, quantity }), []);
  const setQuantity = useCallback(
    (productId, quantity) => dispatch({ type: 'SET_QUANTITY', productId, quantity }),
    []
  );
  const removeItem = useCallback((productId) => dispatch({ type: 'REMOVE', productId }), []);
  const clearCart = useCallback(() => dispatch({ type: 'CLEAR' }), []);
  const syncWithProducts = useCallback((products) => dispatch({ type: 'SYNC_PRODUCTS', products }), []);

  const value = useMemo(() => {
    const { count, subtotalCents } = cartTotals(state.items);
    return {
      items: state.items,
      hydrated: state.hydrated,
      count,
      subtotalCents,
      addItem,
      setQuantity,
      removeItem,
      clearCart,
      syncWithProducts,
      getQuantity: (productId) => state.items.find((i) => i.productId === productId)?.quantity ?? 0,
    };
  }, [state, addItem, setQuantity, removeItem, clearCart, syncWithProducts]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
