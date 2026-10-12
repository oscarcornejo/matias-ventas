import { vi } from 'vitest';
import { SESSION_COOKIE, createSessionToken } from '../../server/lib/session';
import { ADMIN_EMAIL } from '../../shared/permissions';

/** Cliente Prisma falso: solo los métodos que usan las rutas probadas. */
export function createPrismaMock() {
  return {
    user: { findUnique: vi.fn(), upsert: vi.fn() },
    order: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  };
}

export async function sessionCookie(kind: 'admin' | 'cliente'): Promise<string> {
  const token = await createSessionToken(
    kind === 'admin'
      ? { id: 'u-admin', email: ADMIN_EMAIL, role: 'ADMIN' }
      : { id: 'u-cliente', email: 'cliente@correo.cl', role: 'CLIENTE' },
  );
  return `${SESSION_COOKIE}=${token}`;
}
