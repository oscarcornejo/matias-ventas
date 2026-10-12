import type { NextFunction, Request, Response } from 'express';
import { SESSION_COOKIE, readSessionToken } from '../lib/session.js';
import { canPurchase } from '../../shared/permissions.js';
import type { Role, SessionUser } from '../../shared/types.js';

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = await readSessionToken(req.cookies?.[SESSION_COOKIE] as string | undefined);
  if (!user) {
    res.status(401).json({ error: 'Debes iniciar sesión.' });
    return;
  }
  req.user = user;
  next();
}

export function requireRole(role: Role) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.user?.role !== role) {
      res.status(403).json({ error: 'No tienes permiso para ver esto.' });
      return;
    }
    next();
  };
}

/** El perfil administrador no puede comprar, aunque llame a la API directamente. */
export function forbidAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || !canPurchase(req.user.role)) {
    res.status(403).json({ error: 'El perfil administrador no puede realizar compras.' });
    return;
  }
  next();
}

/** Usuario autenticado; solo usar en rutas protegidas por requireAuth. */
export function currentUser(req: Request): SessionUser {
  if (!req.user) throw new Error('requireAuth no se ejecutó antes de esta ruta');
  return req.user;
}
