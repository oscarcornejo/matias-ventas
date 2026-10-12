import { PrismaClient } from '@prisma/client';
import { ensureAdmin } from '../server/lib/admin.js';

const prisma = new PrismaClient();

const password = process.env.ADMIN_PASSWORD;
if (!password) {
  console.error('Falta ADMIN_PASSWORD en el entorno (.env).');
  process.exit(1);
}

try {
  await ensureAdmin(prisma, password);
  console.log('Administrador listo.');
} finally {
  await prisma.$disconnect();
}
