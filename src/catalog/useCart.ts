import { useMemo } from 'react';
import { useCatalog } from './CatalogContext';
import { useCartStore } from '../store/cart';
import type { CatalogItem } from '../../shared/products';

export interface CartLineView {
  item: CatalogItem;
  quantity: number;
  subtotal: number;
}

/**
 * Une lo que hay en el carrito del navegador con el catálogo que entrega la API.
 *
 * Si un producto dejó de existir o Matías lo ocultó, su línea simplemente no
 * aparece: el carrito guarda ids, no precios, y el servidor vuelve a validar al cobrar.
 */
export function useCart(): { lines: CartLineView[]; total: number; ready: boolean } {
  const rawLines = useCartStore((state) => state.lines);
  const { findItem, loading } = useCatalog();

  return useMemo(() => {
    const lines: CartLineView[] = [];
    for (const line of rawLines) {
      const item = findItem(line.id);
      if (!item) continue;
      lines.push({ item, quantity: line.quantity, subtotal: item.price * line.quantity });
    }
    const total = lines.reduce((sum, line) => sum + line.subtotal, 0);
    return { lines, total, ready: !loading };
  }, [rawLines, findItem, loading]);
}
