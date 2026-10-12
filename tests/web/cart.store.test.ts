import { beforeEach, describe, expect, it } from 'vitest';
import { CART_STORAGE_KEY, MAX_QUANTITY, selectCount, selectTotal, useCartStore } from '../../src/store/cart';

const cart = () => useCartStore.getState();

describe('carrito (Zustand)', () => {
  beforeEach(() => {
    cart().clear();
  });

  it('agrega un producto nuevo con cantidad 1', () => {
    cart().add('chirlito-suffle');
    expect(cart().lines).toEqual([{ productId: 'chirlito-suffle', quantity: 1 }]);
  });

  it('agregar dos veces el mismo producto suma la cantidad', () => {
    cart().add('grosso-crunch');
    cart().add('grosso-crunch');
    expect(cart().lines).toEqual([{ productId: 'grosso-crunch', quantity: 2 }]);
  });

  it('sube y baja cantidades sin bajar de 1', () => {
    cart().add('alfajor-panchito');
    cart().increment('alfajor-panchito');
    cart().increment('alfajor-panchito');
    expect(cart().lines[0]?.quantity).toBe(3);

    cart().decrement('alfajor-panchito');
    cart().decrement('alfajor-panchito');
    cart().decrement('alfajor-panchito');
    expect(cart().lines[0]?.quantity).toBe(1);
  });

  it(`no supera la cantidad máxima de ${MAX_QUANTITY}`, () => {
    cart().add('grosso-crunch');
    for (let i = 0; i < MAX_QUANTITY + 5; i++) cart().increment('grosso-crunch');
    expect(cart().lines[0]?.quantity).toBe(MAX_QUANTITY);
  });

  it('elimina un producto', () => {
    cart().add('chirlito-suffle');
    cart().add('grosso-crunch');
    cart().remove('chirlito-suffle');
    expect(cart().lines).toEqual([{ productId: 'grosso-crunch', quantity: 1 }]);
  });

  it('calcula el total en CLP y la cantidad de productos', () => {
    cart().add('chirlito-suffle'); // 300
    cart().add('chirlito-suffle'); // 300
    cart().add('grosso-crunch'); // 200
    cart().add('alfajor-panchito'); // 400
    expect(selectTotal(cart())).toBe(1200);
    expect(selectCount(cart())).toBe(4);
  });

  it('vaciar deja el carrito sin productos y con total 0', () => {
    cart().add('chirlito-suffle');
    cart().clear();
    expect(cart().lines).toEqual([]);
    expect(selectTotal(cart())).toBe(0);
  });

  it('persiste el carrito en el navegador', () => {
    cart().add('alfajor-panchito');
    const stored = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) ?? '{}') as {
      state?: { lines?: unknown };
    };
    expect(stored.state?.lines).toEqual([{ productId: 'alfajor-panchito', quantity: 1 }]);
  });

  it('al rehidratar descarta productos inexistentes o datos corruptos', async () => {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        state: {
          lines: [
            { productId: 'grosso-crunch', quantity: 3 },
            { productId: 'producto-falso', quantity: 2 },
            { productId: 'chirlito-suffle', quantity: 'muchos' },
          ],
        },
      }),
    );
    await useCartStore.persist.rehydrate();
    expect(cart().lines).toEqual([{ productId: 'grosso-crunch', quantity: 3 }]);
  });
});
