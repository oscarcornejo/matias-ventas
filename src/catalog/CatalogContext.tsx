import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../api/client';
import { findItemIn, type CatalogItem } from '../../shared/products';

export interface CatalogContextValue {
  /** Productos sueltos y combos, mezclados en el orden que definió Matías. */
  items: CatalogItem[];
  loading: boolean;
  error: string | null;
  reload: () => void;
  findItem: (id: string) => CatalogItem | undefined;
}

export const CatalogContext = createContext<CatalogContextValue | null>(null);

/**
 * Catálogo de la tienda, servido por la API. Antes vivía en una constante del
 * código; ahora lo administra Matías, así que puede cambiar sin volver a publicar.
 */
export function CatalogProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .catalog()
      .then(({ items: list }) => {
        if (!active) return;
        setItems(list);
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
  const findItem = useCallback((id: string) => findItemIn(items, id), [items]);

  const value = useMemo(
    () => ({ items, loading, error, reload, findItem }),
    [items, loading, error, reload, findItem],
  );
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): CatalogContextValue {
  const context = useContext(CatalogContext);
  if (!context) throw new Error('useCatalog debe usarse dentro de <CatalogProvider>');
  return context;
}
