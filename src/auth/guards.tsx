import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useSession } from './SessionContext';
import { Loading } from '../components/Loading/Loading';
import type { Role } from '../../shared/types';

/** Sin sesión, redirige a /acceso recordando a dónde quería ir el usuario. */
export function RequireSession({ children }: { children: ReactNode }) {
  const { user, loading } = useSession();
  const location = useLocation();

  if (loading) return <Loading label="Cargando tu sesión…" />;
  if (!user) {
    return <Navigate to="/acceso" replace state={{ from: location.pathname + location.search }} />;
  }
  return children;
}

export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { user } = useSession();
  if (user?.role !== role) return <Navigate to="/" replace />;
  return children;
}
