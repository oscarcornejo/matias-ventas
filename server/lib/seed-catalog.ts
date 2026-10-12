import type { PrismaClient } from '@prisma/client';

/**
 * Catálogo con el que nació la tienda. Solo se usa para sembrar una base vacía:
 * desde ahí en adelante el catálogo lo administra Matías y vive en la base.
 */
const CATALOGO_INICIAL = [
  { name: 'Chirlito Suffle', emoji: '🍪', price: 300 },
  { name: 'Grosso Crunch', emoji: '🍬', price: 200 },
  { name: 'Alfajor Panchito', emoji: '🍫', price: 400 },
];

/** Siembra los productos iniciales solo si no hay ninguno. Nunca pisa los existentes. */
export async function seedCatalog(db: PrismaClient): Promise<number> {
  const existing = await db.product.count();
  if (existing > 0) return 0;

  await db.product.createMany({
    data: CATALOGO_INICIAL.map((product, index) => ({ ...product, position: index + 1 })),
  });
  return CATALOGO_INICIAL.length;
}
