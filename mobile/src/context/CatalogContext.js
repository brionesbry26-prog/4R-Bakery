import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import api from '../services/api';

/**
 * Loads bakery info and the product catalog once and shares them across screens.
 * Search/filter/sort happen locally on the loaded collection.
 */
const CatalogContext = createContext(null);

export function CatalogProvider({ children }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [productsStatus, setProductsStatus] = useState('idle'); // idle | loading | success | error
  const [productsError, setProductsError] = useState(null);
  const [info, setInfo] = useState(null);
  const [infoStatus, setInfoStatus] = useState('idle');
  const [infoError, setInfoError] = useState(null);
  const productsReq = useRef(0);

  const loadProducts = useCallback(async () => {
    const id = ++productsReq.current;
    setProductsStatus('loading');
    setProductsError(null);
    try {
      const data = await api.getProducts({ limit: 100 });
      if (id !== productsReq.current) return null;
      setProducts(data.items);
      setCategories(data.categories);
      setProductsStatus('success');
      return data.items;
    } catch (err) {
      if (id !== productsReq.current) return null;
      setProductsError(err);
      setProductsStatus('error');
      return null;
    }
  }, []);

  const loadInfo = useCallback(async () => {
    setInfoStatus('loading');
    setInfoError(null);
    try {
      const data = await api.getBakeryInfo();
      setInfo(data);
      setInfoStatus('success');
    } catch (err) {
      setInfoError(err);
      setInfoStatus('error');
    }
  }, []);

  useEffect(() => {
    loadProducts();
    loadInfo();
  }, [loadProducts, loadInfo]);

  const value = useMemo(
    () => ({
      products,
      categories,
      productsStatus,
      productsError,
      loadProducts,
      info,
      infoStatus,
      infoError,
      loadInfo,
      getProductById: (id) => products.find((p) => p.id === id) ?? null,
    }),
    [products, categories, productsStatus, productsError, loadProducts, info, infoStatus, infoError, loadInfo]
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog must be used inside <CatalogProvider>');
  return ctx;
}
