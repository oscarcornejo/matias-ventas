import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../db.js';
import type { AdminProduct, Product } from '../../shared/products.js';

/** Campos que se leen siempre; los bytes de la imagen se piden aparte. */
const SELECT = {
  id: true,
  name: true,
  price: true,
  emoji: true,
  visible: true,
  position: true,
  imageType: true,
} satisfies Prisma.ProductSelect;

type Row = Prisma.ProductGetPayload<{ select: typeof SELECT }>;

function toProduct(row: Row): Product {
  return {
    id: row.id,
    name: row.name,
    price: row.price,
    emoji: row.emoji,
    hasImage: row.imageType !== null,
  };
}

function toAdminProduct(row: Row): AdminProduct {
  return { ...toProduct(row), visible: row.visible, position: row.position };
}

/** Catálogo público: solo lo visible, en el orden que definió el administrador. */
export async function listVisibleProducts(db: PrismaClient = prisma): Promise<Product[]> {
  const rows = await db.product.findMany({
    where: { visible: true },
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    select: SELECT,
  });
  return rows.map(toProduct);
}

/** Catálogo completo del administrador, incluidos los productos ocultos. */
export async function listAllProducts(db: PrismaClient = prisma): Promise<AdminProduct[]> {
  const rows = await db.product.findMany({
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    select: SELECT,
  });
  return rows.map(toAdminProduct);
}
