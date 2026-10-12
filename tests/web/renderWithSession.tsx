import type { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { SessionContext, type SessionContextValue } from '../../src/auth/SessionContext';
import { CatalogContext, type CatalogContextValue } from '../../src/catalog/CatalogContext';
import { findItemIn, type CatalogItem } from '../../shared/products';
import type { SessionUser } from '../../shared/types';

export const clientUser: SessionUser = { id: 'u-cliente', email: 'cliente@correo.cl', role: 'CLIENTE' };
export const adminUser: SessionUser = { id: 'u-admin', email: 'matiasalecornejo@gmail.com', role: 'ADMIN' };

/**
 * Catálogo de prueba. El catálogo real lo administra Matías y vive en la base,
 * así que las pruebas traen el suyo en vez de depender de productos fijos.
 */
export const CATALOGO_PRUEBA: CatalogItem[] = [
  { kind: 'producto', id: 'p-chirlito', name: 'Chirlito Suffle', price: 300, emoji: '🍪', images: [] },
  { kind: 'producto', id: 'p-grosso', name: 'Grosso Crunch', price: 200, emoji: '🍬', images: [] },
  { kind: 'producto', id: 'p-alfajor', name: 'Alfajor Panchito', price: 400, emoji: '🍫', images: [] },
  {
    kind: 'combo',
    id: 'c-recreo',
    name: 'Combo recreo',
    price: 600,
    emoji: '🎁',
    fullPrice: 700,
    images: [],
    items: [
      { productId: 'p-chirlito', name: 'Chirlito Suffle', emoji: '🍪', quantity: 1 },
      { productId: 'p-grosso', name: 'Grosso Crunch', emoji: '🍬', quantity: 2 },
    ],
  },
];

interface Options {
  initialPath?: string;
  products?: CatalogItem[];
  catalogLoading?: boolean;
  catalogError?: string | null;
}

export function renderWithSession(
  ui: ReactElement,
  user: SessionUser | null,
  options: Options | string = {},
) {
  const { initialPath = '/', products = CATALOGO_PRUEBA, catalogLoading = false, catalogError = null } =
    typeof options === 'string' ? { initialPath: options } : options;

  const session: SessionContextValue = {
    user,
    loading: false,
    login: async () => {
      throw new Error('no implementado en tests');
    },
    register: async () => {
      throw new Error('no implementado en tests');
    },
    logout: async () => undefined,
  };

  const catalog: CatalogContextValue = {
    items: products,
    loading: catalogLoading,
    error: catalogError,
    reload: () => undefined,
    findItem: (id) => findItemIn(products, id),
  };

  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <SessionContext.Provider value={session}>
        <CatalogContext.Provider value={catalog}>{ui as ReactNode}</CatalogContext.Provider>
      </SessionContext.Provider>
    </MemoryRouter>,
  );
}
