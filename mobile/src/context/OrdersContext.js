import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { readJson, STORAGE_KEYS, writeJson } from '../services/storage';

/**
 * Keeps the references of orders placed (or looked up) on this device, plus the
 * contact number needed to look them up. No account system exists in this release,
 * so orders are fetched one by one with reference + phone.
 */
const OrdersContext = createContext(null);
const MAX_SAVED = 30;

export function OrdersProvider({ children }) {
  const [saved, setSaved] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    readJson(STORAGE_KEYS.orders, []).then((list) => {
      setSaved((current) => {
        const merged = [...current];
        for (const entry of Array.isArray(list) ? list : []) {
          if (entry?.reference && !merged.some((e) => e.reference === entry.reference)) merged.push(entry);
        }
        return merged.slice(0, MAX_SAVED);
      });
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (hydrated) writeJson(STORAGE_KEYS.orders, saved);
  }, [saved, hydrated]);

  const rememberOrder = useCallback((reference, phone, snapshot) => {
    setSaved((list) =>
      [
        { reference, phone, savedAt: new Date().toISOString(), snapshot: snapshot ?? null },
        ...list.filter((e) => e.reference !== reference),
      ].slice(0, MAX_SAVED)
    );
  }, []);

  const forgetOrder = useCallback((reference) => {
    setSaved((list) => list.filter((e) => e.reference !== reference));
  }, []);

  const value = useMemo(() => ({ saved, hydrated, rememberOrder, forgetOrder }), [saved, hydrated, rememberOrder, forgetOrder]);
  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>;
}

export function useOrders() {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error('useOrders must be used inside <OrdersProvider>');
  return ctx;
}
