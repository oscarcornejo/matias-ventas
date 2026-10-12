import type { Role } from './types.js';

/** Único correo con perfil de administrador. */
export const ADMIN_EMAIL = 'matiasalecornejo@gmail.com';

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isAdminEmail(email: string): boolean {
  return normalizeEmail(email) === ADMIN_EMAIL;
}

export function roleForEmail(email: string): Role {
  return isAdminEmail(email) ? 'ADMIN' : 'CLIENTE';
}

/** Regla de negocio: el administrador nunca puede comprar. La aplican la UI y el servidor. */
export function canPurchase(role: Role): boolean {
  return role === 'CLIENTE';
}
