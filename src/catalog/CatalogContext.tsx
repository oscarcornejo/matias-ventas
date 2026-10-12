import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../api/client';
import { findProductIn, type Product } from '../../shared/products';

export interface CatalogContextValue {
  products: Product[];
  loading: boolean;
  error: string | null;
  reload: () => void;
  findProduct: (id: string) => Product | undefined;
}

export const CatalogContext = createContext<CatalogContextValue | null>(null);

/**
 * Catálogo de la tienda, servido por la API. Antes vivía en una constante del
 * código; ahora lo administra Matías, así que puede cambiar sin volver a publicar.
 */
export function CatalogProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .products()
      .then(({ products: list }) => {
        if (!active) return;
        setProducts(list);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'No pudimos cargar los productos.');
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const findProduct = useCallback((id: string) => findProductIn(products, id), [products]);

  const value = useMemo(
    () => ({ products, loading, error, reload, findProduct }),
    [products, loading, error, reload, findProduct],
  );
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): CatalogContextValue {
  const context = useContext(CatalogContext);
  if (!context) throw new Error('useCatalog debe usarse dentro de <CatalogProvider>');
  return context;
}
