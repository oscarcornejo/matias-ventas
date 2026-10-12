import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth, currentUser } from '../middleware/auth.js';
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions } from '../lib/session.js';
import { isAdminEmail, normalizeEmail } from '../../shared/permissions.js';
import type { SessionUser } from '../../shared/types.js';

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Ingresa un correo electrónico válido.'),
  password: z.string().max(200).optional(),
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.' },
});

export const authRouter = Router();

authRouter.post('/login', loginLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' });
    return;
  }
  const email = normalizeEmail(parsed.data.email);
  let user: SessionUser;

  if (isAdminEmail(email)) {
    const password = parsed.data.password ?? '';
    if (!password) {
      res.status(400).json({ error: 'Ingresa tu contraseña.', needsPassword: true });
      return;
    }
    const admin = await prisma.user.findUnique({ where: { email } });
    const valid = admin?.passwordHash ? await bcrypt.compare(password, admin.passwordHash) : false;
    if (!admin || !valid) {
      res.status(401).json({ error: 'Correo o contraseña incorrectos.', needsPassword: true });
      return;
    }
    user = { id: admin.id, email: admin.email, role: 'ADMIN' };
  } else {
    // Cliente: sin contraseña. Si el correo no existe, la cuenta se crea al entrar.
    const client = await prisma.user.upsert({
      where: { email },
      create: { email, role: 'CLIENTE' },
      update: {},
    });
    user = { id: client.id, email: client.email, role: 'CLIENTE' };
  }

  res.cookie(SESSION_COOKIE, await createSessionToken(user), sessionCookieOptions());
  res.json({ user });
});

authRouter.post('/logout', (_req, res) => {
  const { maxAge: _maxAge, ...options } = sessionCookieOptions();
  res.clearCookie(SESSION_COOKIE, options);
  res.status(204).end();
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: currentUser(req) });
});
