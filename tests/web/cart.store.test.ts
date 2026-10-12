import { beforeEach, describe, expect, it } from 'vitest';
import { CART_STORAGE_KEY, MAX_QUANTITY, selectCount, useCartStore } from '../../src/store/cart';

const cart = () => useCartStore.getState();

describe('carrito (Zustand)', () => {
  beforeEach(() => {
    cart().clear();
  });

  it('agrega un producto nuevo con cantidad 1', () => {
    cart().add('p-chirlito', 'producto');
    expect(cart().lines).toEqual([{ id: 'p-chirlito', kind: 'producto', quantity: 1 }]);
  });

  it('agregar dos veces el mismo producto suma la cantidad', () => {
    cart().add('p-grosso', 'producto');
    cart().add('p-grosso', 'producto');
    expect(cart().lines).toEqual([{ id: 'p-grosso', kind: 'producto', quantity: 2 }]);
  });

  it('sube y baja cantidades sin bajar de 1', () => {
    cart().add('p-alfajor', 'producto');
    cart().increment('p-alfajor');
    cart().increment('p-alfajor');
    expect(cart().lines[0]?.quantity).toBe(3);

    cart().decrement('p-alfajor');
    cart().decrement('p-alfajor');
    cart().decrement('p-alfajor');
    expect(cart().lines[0]?.quantity).toBe(1);
  });

  it(`no supera la cantidad máxima de ${MAX_QUANTITY}`, () => {
    cart().add('p-grosso', 'producto');
    for (let i = 0; i < MAX_QUANTITY + 5; i++) cart().increment('p-grosso');
    expect(cart().lines[0]?.quantity).toBe(MAX_QUANTITY);
  });

  it('elimina un producto', () => {
    cart().add('p-chirlito', 'producto');
    cart().add('p-grosso', 'producto');
    cart().remove('p-chirlito');
    expect(cart().lines).toEqual([{ id: 'p-grosso', kind: 'producto', quantity: 1 }]);
  });

  // El total ya no lo calcula el store: necesita el catálogo, que vive en la API.
  // Esa unión se prueba en useCart.test.tsx.
  it('cuenta los productos del carrito', () => {
    cart().add('p-chirlito', 'producto');
    cart().add('p-chirlito', 'producto');
    cart().add('p-grosso', 'producto');
    cart().add('p-alfajor', 'producto');
    expect(selectCount(cart())).toBe(4);
  });

  it('vaciar deja el carrito sin productos', () => {
    cart().add('p-chirlito', 'producto');
    cart().clear();
    expect(cart().lines).toEqual([]);
    expect(selectCount(cart())).toBe(0);
  });

  it('persiste el carrito en el navegador', () => {
    cart().add('p-alfajor', 'producto');
    const stored = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) ?? '{}') as {
      state?: { lines?: unknown };
    };
    expect(stored.state?.lines).toEqual([{ id: 'p-alfajor', kind: 'producto', quantity: 1 }]);
  });

  it('al rehidratar descarta datos corruptos', async () => {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        state: {
          lines: [
            { id: 'p-grosso', kind: 'producto', quantity: 3 },
            { id: '', quantity: 2 },
            { id: 'p-chirlito', quantity: 'muchos' },
            { quantity: 1 },
          ],
        },
      }),
    );
    await useCartStore.persist.rehydrate();
    expect(cart().lines).toEqual([{ id: 'p-grosso', kind: 'producto', quantity: 3 }]);
  });

  it('conserva ids que ya no están en el catálogo, y los omite al mostrarlos', async () => {
    // El catálogo lo administra Matías y vive en la API: el store no puede saber
    // si un id sigue existiendo. La línea se guarda, pero useCart no la muestra
    // y el servidor la rechaza al cobrar (ver useCart.test.tsx y pricing.test.ts).
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({ version: 1, state: { lines: [{ id: 'producto-que-ya-no-existe', kind: 'producto', quantity: 2 }] } }),
    );
    await useCartStore.persist.rehydrate();
    expect(cart().lines).toEqual([{ id: 'producto-que-ya-no-existe', kind: 'producto', quantity: 2 }]);
  });
});
