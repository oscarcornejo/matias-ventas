import { PrismaClient } from '@prisma/client';
import { ensureAdmin } from '../server/lib/admin.js';
import { seedCatalog } from '../server/lib/seed-catalog.js';

const prisma = new PrismaClient();

const password = process.env.ADMIN_PASSWORD;
if (!password) {
  console.error('Falta ADMIN_PASSWORD en el entorno (.env).');
  process.exit(1);
}

try {
  await ensureAdmin(prisma, password);
  console.log('Administrador listo.');

  const sembrados = await seedCatalog(prisma);
  console.log(
    sembrados > 0
      ? `Catálogo inicial creado con ${sembrados} productos.`
      : 'El catálogo ya tiene productos: no se tocó.',
  );
} finally {
  await prisma.$disconnect();
}
