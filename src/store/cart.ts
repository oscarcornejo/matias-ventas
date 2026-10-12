import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { findProduct, isProductId, type ProductId } from '../../shared/products';

export const MAX_QUANTITY = 99;
export const CART_STORAGE_KEY = 'mati-ventas-carrito';

export interface CartLine {
  productId: ProductId;
  quantity: number;
}

interface CartState {
  lines: CartLine[];
  add: (productId: ProductId) => void;
  increment: (productId: ProductId) => void;
  decrement: (productId: ProductId) => void;
  remove: (productId: ProductId) => void;
  clear: () => void;
}

const clamp = (quantity: number) => Math.min(MAX_QUANTITY, Math.max(1, quantity));

function changeQuantity(lines: CartLine[], productId: ProductId, delta: number): CartLine[] {
  return lines.map((line) =>
    line.productId === productId ? { ...line, quantity: clamp(line.quantity + delta) } : line,
  );
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      add: (productId) =>
        set((state) =>
          state.lines.some((line) => line.productId === productId)
            ? { lines: changeQuantity(state.lines, productId, 1) }
            : { lines: [...state.lines, { productId, quantity: 1 }] },
        ),
      increment: (productId) => set((state) => ({ lines: changeQuantity(state.lines, productId, 1) })),
      // La cantidad mínima es 1; para quitar el producto se usa "Eliminar".
      decrement: (productId) => set((state) => ({ lines: changeQuantity(state.lines, productId, -1) })),
      remove: (productId) => set((state) => ({ lines: state.lines.filter((line) => line.productId !== productId) })),
      clear: () => set({ lines: [] }),
    }),
    {
      name: CART_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ lines: state.lines }),
      // Descarta datos corruptos o productos que ya no existen en el catálogo.
      merge: (persisted, current) => {
        const raw = (persisted as { lines?: unknown } | undefined)?.lines;
        const lines = Array.isArray(raw)
          ? raw.flatMap((line): CartLine[] => {
              const { productId, quantity } = (line ?? {}) as { productId?: unknown; quantity?: unknown };
              return typeof productId === 'string' && isProductId(productId) && Number.isInteger(quantity)
                ? [{ productId, quantity: clamp(quantity as number) }]
                : [];
            })
          : [];
        return { ...current, lines };
      },
    },
  ),
);

/** Total referencial en CLP. El monto que se cobra lo calcula siempre el servidor. */
export function selectTotal(state: Pick<CartState, 'lines'>): number {
  return state.lines.reduce((sum, line) => sum + (findProduct(line.productId)?.price ?? 0) * line.quantity, 0);
}

export function selectCount(state: Pick<CartState, 'lines'>): number {
  return state.lines.reduce((sum, line) => sum + line.quantity, 0);
}
