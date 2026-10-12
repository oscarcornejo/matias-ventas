import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { SessionContext, type SessionContextValue } from '../../src/auth/SessionContext';
import type { SessionUser } from '../../shared/types';

export const clientUser: SessionUser = { id: 'u-cliente', email: 'cliente@correo.cl', role: 'CLIENTE' };
export const adminUser: SessionUser = { id: 'u-admin', email: 'matiasalecornejo@gmail.com', role: 'ADMIN' };

export function renderWithSession(ui: ReactElement, user: SessionUser | null, initialPath = '/') {
  const value: SessionContextValue = {
    user,
    loading: false,
    login: async () => {
      throw new Error('no implementado en tests');
    },
    logout: async () => undefined,
  };
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <SessionContext.Provider value={value}>{ui}</SessionContext.Provider>
    </MemoryRouter>,
  );
}
