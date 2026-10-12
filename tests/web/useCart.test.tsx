import { beforeEach, describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { CatalogContext, type CatalogContextValue } from '../../src/catalog/CatalogContext';
import { useCart } from '../../src/catalog/useCart';
import { useCartStore } from '../../src/store/cart';
import { findProductIn, type Product } from '../../shared/products';

const CATALOGO: Product[] = [
  { id: 'p-chirlito', name: 'Chirlito Suffle', price: 300, emoji: '🍪', hasImage: false },
  { id: 'p-grosso', name: 'Grosso Crunch', price: 200, emoji: '🍬', hasImage: false },
];

function envoltorio(products: Product[], loading = false) {
  const value: CatalogContextValue = {
    products,
    loading,
    error: null,
    reload: () => undefined,
    findProduct: (id) => findProductIn(products, id),
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
    useCartStore.getState().add('p-chirlito');
    useCartStore.getState().increment('p-chirlito');
    useCartStore.getState().add('p-grosso');

    const { result } = renderHook(() => useCart(), { wrapper: envoltorio(CATALOGO) });

    expect(result.current.lines.map((l) => [l.product.name, l.quantity, l.subtotal])).toEqual([
      ['Chirlito Suffle', 2, 600],
      ['Grosso Crunch', 1, 200],
    ]);
    expect(result.current.total).toBe(800);
    expect(Number.isInteger(result.current.total)).toBe(true);
  });

  it('omite productos que el administrador ocultó o eliminó', () => {
    useCartStore.getState().add('p-chirlito');
    useCartStore.getState().add('ya-no-existe');

    const { result } = renderHook(() => useCart(), { wrapper: envoltorio(CATALOGO) });

    expect(result.current.lines).toHaveLength(1);
    expect(result.current.lines[0]?.product.id).toBe('p-chirlito');
    // El id fantasma sigue guardado, pero no suma ni se dibuja.
    expect(result.current.total).toBe(300);
  });

  it('avisa que todavía no está listo mientras carga el catálogo', () => {
    useCartStore.getState().add('p-chirlito');
    const { result } = renderHook(() => useCart(), { wrapper: envoltorio([], true) });
    expect(result.current.ready).toBe(false);
    expect(result.current.lines).toEqual([]);
  });
});
