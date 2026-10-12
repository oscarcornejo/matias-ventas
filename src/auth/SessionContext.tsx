import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../api/client';
import { useCartStore } from '../store/cart';
import type { SessionUser } from '../../shared/types';

export interface SessionContextValue {
  user: SessionUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<SessionUser>;
  register: (email: string, password: string) => Promise<SessionUser>;
  logout: () => Promise<void>;
}

export const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api
      .me()
      .then(({ user: current }) => active && setUser(current))
      .catch(() => active && setUser(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { user: loggedIn } = await api.login(email, password);
    setUser(loggedIn);
    return loggedIn;
  }, []);

  // El carrito no se toca al registrarse: lo que la visita armó sin cuenta sigue ahí.
  const register = useCallback(async (email: string, password: string) => {
    const { user: created } = await api.register(email, password);
    setUser(created);
    return created;
  }, []);

  const logout = useCallback(async () => {
    await api.logout().catch(() => undefined);
    // El carrito vive en el navegador: se limpia para que el siguiente usuario no lo herede.
    useCartStore.getState().clear();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession debe usarse dentro de <SessionProvider>');
  return context;
}
