import bcrypt from 'bcryptjs';
import type { PrismaClient } from '@prisma/client';
import { ADMIN_EMAIL } from '../../shared/permissions.js';

const BCRYPT_ROUNDS = 12;

/**
 * Crea o actualiza el usuario administrador guardando SOLO el hash de la contraseña.
 * Si ADMIN_PASSWORD cambia, el hash se actualiza en el próximo arranque o seed.
 */
export async function ensureAdmin(db: PrismaClient, password: string): Promise<void> {
  const existing = await db.user.findUnique({ where: { email: ADMIN_EMAIL } });

  if (existing?.passwordHash && existing.role === 'ADMIN') {
    const unchanged = await bcrypt.compare(password, existing.passwordHash);
    if (unchanged) return;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  await db.user.upsert({
    where: { email: ADMIN_EMAIL },
    create: { email: ADMIN_EMAIL, role: 'ADMIN', passwordHash },
    update: { role: 'ADMIN', passwordHash },
  });
}
