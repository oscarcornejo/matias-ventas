import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export const MAX_QUANTITY = 99;
export const CART_STORAGE_KEY = 'mati-ventas-carrito';

/** Lo que una línea puede ser: un producto suelto o un combo. */
export type CartKind = 'producto' | 'combo';

export interface CartLine {
  id: string;
  kind: CartKind;
  quantity: number;
}

interface CartState {
  lines: CartLine[];
  add: (id: string, kind: CartKind) => void;
  increment: (id: string) => void;
  decrement: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
}

const clamp = (quantity: number) => Math.min(MAX_QUANTITY, Math.max(1, quantity));

function changeQuantity(lines: CartLine[], id: string, delta: number): CartLine[] {
  return lines.map((line) => (line.id === id ? { ...line, quantity: clamp(line.quantity + delta) } : line));
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      add: (id, kind) =>
        set((state) =>
          state.lines.some((line) => line.id === id)
            ? { lines: changeQuantity(state.lines, id, 1) }
            : { lines: [...state.lines, { id, kind, quantity: 1 }] },
        ),
      increment: (id) => set((state) => ({ lines: changeQuantity(state.lines, id, 1) })),
      // La cantidad mínima es 1; para quitar el producto se usa "Eliminar".
      decrement: (id) => set((state) => ({ lines: changeQuantity(state.lines, id, -1) })),
      remove: (id) => set((state) => ({ lines: state.lines.filter((line) => line.id !== id) })),
      clear: () => set({ lines: [] }),
    }),
    {
      name: CART_STORAGE_KEY,
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ lines: state.lines }),
      // Sin esto, Zustand descarta el estado guardado al subir de versión y todos
      // los carritos existentes se vaciarían al publicar. La versión 1 guardaba
      // `productId` y no conocía los combos: cada línea se lee como producto suelto.
      migrate: (persisted) => persisted,
      // Descarta datos corruptos. No se valida contra un catálogo fijo: el catálogo
      // vive en la API y puede cambiar. Las líneas de cosas que ya no existen se
      // omiten al dibujar (ver useCart) y el servidor revalida al cobrar.
      merge: (persisted, current) => {
        const raw = (persisted as { lines?: unknown } | undefined)?.lines;
        const lines = Array.isArray(raw)
          ? raw.flatMap((line): CartLine[] => {
              const { id, productId, kind, quantity } = (line ?? {}) as {
                id?: unknown;
                productId?: unknown;
                kind?: unknown;
                quantity?: unknown;
              };
              // `productId` es el formato de la versión 1, de cuando no existían
              // los combos: se lee como producto suelto para no vaciar carritos.
              const identificador = typeof id === 'string' ? id : productId;
              if (typeof identificador !== 'string' || !identificador) return [];
              if (!Number.isInteger(quantity)) return [];
              return [
                {
                  id: identificador,
                  kind: kind === 'combo' ? 'combo' : 'producto',
                  quantity: clamp(quantity as number),
                },
              ];
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
