import { Router, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { requireAuth, currentUser } from '../middleware/auth.js';
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions } from '../lib/session.js';
import { MIN_PASSWORD_LENGTH, hashPassword, verifyPassword } from '../lib/passwords.js';
import { isAdminEmail, normalizeEmail, roleForEmail } from '../../shared/permissions.js';
import type { SessionUser } from '../../shared/types.js';

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Ingresa un correo electrónico válido.');

const loginSchema = z.object({
  email: emailSchema,
  // Opcional solo para poder responder "Ingresa tu contraseña" en vez de un error de formato.
  password: z.string().max(200).optional(),
});

const registerSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`)
    .max(200, 'La contraseña es demasiado larga.'),
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.' },
});

export const authRouter = Router();

/** Deja la sesión iniciada en la cookie firmada y responde con el usuario. */
async function startSession(res: Response, user: SessionUser, status = 200): Promise<void> {
  res.cookie(SESSION_COOKIE, await createSessionToken(user), sessionCookieOptions());
  res.status(status).json({ user });
}

authRouter.post('/register', authLimiter, async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' });
    return;
  }

  const email = normalizeEmail(parsed.data.email);
  // El administrador se crea con el seed y nunca por el registro público.
  if (isAdminEmail(email)) {
    res.status(409).json({ error: 'Ya existe una cuenta con ese correo. Inicia sesión.' });
    return;
  }

  const passwordHash = await hashPassword(parsed.data.password);

  try {
    const client = await prisma.user.create({
      data: { email, role: 'CLIENTE', passwordHash },
    });
    await startSession(res, { id: client.id, email: client.email, role: 'CLIENTE' }, 201);
  } catch (error) {
    // P2002: el correo ya está tomado (incluye dos registros simultáneos).
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      res.status(409).json({ error: 'Ya existe una cuenta con ese correo. Inicia sesión.' });
      return;
    }
    throw error;
  }
});

authRouter.post('/login', authLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' });
    return;
  }

  const email = normalizeEmail(parsed.data.email);
  const password = parsed.data.password ?? '';
  if (!password) {
    res.status(400).json({ error: 'Ingresa tu contraseña.', needsPassword: true });
    return;
  }

  const found = await prisma.user.findUnique({ where: { email } });
  if (!found || !(await verifyPassword(password, found.passwordHash))) {
    // Mismo mensaje si el correo no existe o si la contraseña está mala.
    res.status(401).json({ error: 'Correo o contraseña incorrectos.', needsPassword: true });
    return;
  }

  // El perfil se deriva del correo: shared/permissions.ts es la única fuente de la regla.
  await startSession(res, { id: found.id, email: found.email, role: roleForEmail(found.email) });
});

authRouter.post('/logout', (_req, res) => {
  const { maxAge: _maxAge, ...options } = sessionCookieOptions();
  res.clearCookie(SESSION_COOKIE, options);
  res.status(204).end();
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: currentUser(req) });
});
