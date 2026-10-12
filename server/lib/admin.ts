import type { PrismaClient } from '@prisma/client';
import { ADMIN_EMAIL } from '../../shared/permissions.js';
import { hashPassword, verifyPassword } from './passwords.js';

/**
 * Crea o actualiza el usuario administrador guardando SOLO el hash de la contraseña.
 * Si ADMIN_PASSWORD cambia, el hash se actualiza en el próximo arranque o seed.
 */
export async function ensureAdmin(db: PrismaClient, password: string): Promise<void> {
  const existing = await db.user.findUnique({ where: { email: ADMIN_EMAIL } });

  if (existing?.passwordHash && existing.role === 'ADMIN') {
    const unchanged = await verifyPassword(password, existing.passwordHash);
    if (unchanged) return;
  }

  const passwordHash = await hashPassword(password);
  await db.user.upsert({
    where: { email: ADMIN_EMAIL },
    create: { email: ADMIN_EMAIL, role: 'ADMIN', passwordHash },
    update: { role: 'ADMIN', passwordHash },
  });
}
