import { SignJWT, jwtVerify } from 'jose';
import type { CookieOptions } from 'express';
import { getEnv } from '../env.js';
import { normalizeEmail, roleForEmail } from '../../shared/permissions.js';
import type { SessionUser } from '../../shared/types.js';

export const SESSION_COOKIE = 'mv_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 días

function secretKey(): Uint8Array {
  return new TextEncoder().encode(getEnv().SESSION_SECRET);
}

/** Firma la sesión con HMAC-SHA256 (JWT HS256). */
export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ email: user.email, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());
}

/** Devuelve el usuario si la firma es válida y no expiró; si no, null. */
export async function readSessionToken(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ['HS256'] });
    if (typeof payload.sub !== 'string' || typeof payload.email !== 'string') return null;
    const email = normalizeEmail(payload.email);
    // El rol se recalcula desde el correo: aunque alguien manipulara el token, no puede elevarse.
    return { id: payload.sub, email, role: roleForEmail(email) };
  } catch {
    return null;
  }
}

export function sessionCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: getEnv().NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS * 1000,
  };
}
