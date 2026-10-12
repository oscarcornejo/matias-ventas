import bcrypt from 'bcryptjs';

/** Costo de bcrypt para todas las contraseñas: administrador y clientes registrados. */
export const BCRYPT_ROUNDS = 12;

/** Largo mínimo exigido al registrarse; el mismo valor que valida el formulario. */
export const MIN_PASSWORD_LENGTH = 8;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/** Una cuenta sin hash guardado nunca puede iniciar sesión. */
export async function verifyPassword(password: string, hash: string | null | undefined): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(password, hash);
}
