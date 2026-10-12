import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export const MAX_QUANTITY = 99;
export const CART_STORAGE_KEY = 'mati-ventas-carrito';

export interface CartLine {
  productId: string;
  quantity: number;
}

interface CartState {
  lines: CartLine[];
  add: (productId: string) => void;
  increment: (productId: string) => void;
  decrement: (productId: string) => void;
  remove: (productId: string) => void;
  clear: () => void;
}

const clamp = (quantity: number) => Math.min(MAX_QUANTITY, Math.max(1, quantity));

function changeQuantity(lines: CartLine[], productId: string, delta: number): CartLine[] {
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
      // Descarta datos corruptos. Ya no se valida contra un catálogo fijo: el
      // catálogo vive en la API y puede cambiar. Las líneas de productos que ya
      // no existen se omiten al dibujar (ver useCart) y el servidor revalida al cobrar.
      merge: (persisted, current) => {
        const raw = (persisted as { lines?: unknown } | undefined)?.lines;
        const lines = Array.isArray(raw)
          ? raw.flatMap((line): CartLine[] => {
              const { productId, quantity } = (line ?? {}) as { productId?: unknown; quantity?: unknown };
              return typeof productId === 'string' && productId.length > 0 && Number.isInteger(quantity)
                ? [{ productId, quantity: clamp(quantity as number) }]
                : [];
            })
          : [];
        return { ...current, lines };
      },
    },
  ),
);

export function selectCount(state: Pick<CartState, 'lines'>): number {
  return state.lines.reduce((sum, line) => sum + line.quantity, 0);
}
