import { beforeEach, describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { CatalogContext, type CatalogContextValue } from '../../src/catalog/CatalogContext';
import { useCart } from '../../src/catalog/useCart';
import { useCartStore } from '../../src/store/cart';
import { findItemIn, type CatalogItem } from '../../shared/products';

const CATALOGO: CatalogItem[] = [
  { kind: 'producto', id: 'p-chirlito', name: 'Chirlito Suffle', price: 300, emoji: '🍪', images: [] },
  { kind: 'producto', id: 'p-grosso', name: 'Grosso Crunch', price: 200, emoji: '🍬', images: [] },
  {
    kind: 'combo',
    id: 'c-recreo',
    name: 'Combo recreo',
    price: 600,
    emoji: '🎁',
    fullPrice: 700,
    images: [],
    items: [{ productId: 'p-chirlito', name: 'Chirlito Suffle', emoji: '🍪', quantity: 1 }],
  },
];

function envoltorio(products: CatalogItem[], loading = false) {
  const value: CatalogContextValue = {
    items: products,
    loading,
    error: null,
    reload: () => undefined,
    findItem: (id) => findItemIn(products, id),
  };
  return ({ children }: { children: ReactNode }) => (
    <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
  );
}

describe('useCart: une el carrito del navegador con el catálogo de la API', () => {
  beforeEach(() => {
    useCartStore.getState().clear();
  });

  it('calcula subtotales y total en CLP desde los precios del catálogo', () => {
    useCartStore.getState().add('p-chirlito', 'producto');
    useCartStore.getState().increment('p-chirlito');
    useCartStore.getState().add('p-grosso', 'producto');

    const { result } = renderHook(() => useCart(), { wrapper: envoltorio(CATALOGO) });

    expect(result.current.lines.map((l) => [l.item.name, l.quantity, l.subtotal])).toEqual([
      ['Chirlito Suffle', 2, 600],
      ['Grosso Crunch', 1, 200],
    ]);
    expect(result.current.total).toBe(800);
    expect(Number.isInteger(result.current.total)).toBe(true);
  });

  it('omite productos que el administrador ocultó o eliminó', () => {
    useCartStore.getState().add('p-chirlito', 'producto');
    useCartStore.getState().add('ya-no-existe', 'producto');

    const { result } = renderHook(() => useCart(), { wrapper: envoltorio(CATALOGO) });

    expect(result.current.lines).toHaveLength(1);
    expect(result.current.lines[0]?.item.id).toBe('p-chirlito');
    // El id fantasma sigue guardado, pero no suma ni se dibuja.
    expect(result.current.total).toBe(300);
  });

  it('avisa que todavía no está listo mientras carga el catálogo', () => {
    useCartStore.getState().add('p-chirlito', 'producto');
    const { result } = renderHook(() => useCart(), { wrapper: envoltorio([], true) });
    expect(result.current.ready).toBe(false);
    expect(result.current.lines).toEqual([]);
  });
});
