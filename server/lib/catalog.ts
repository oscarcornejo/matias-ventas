import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../db.js';
import type {
  AdminProduct,
  AdminPromo,
  CatalogItem,
  Product,
  Promo,
} from '../../shared/products.js';

const PRODUCT_SELECT = {
  id: true,
  name: true,
  price: true,
  emoji: true,
  visible: true,
  position: true,
  images: { select: { id: true }, orderBy: { position: 'asc' } },
} satisfies Prisma.ProductSelect;

const PROMO_SELECT = {
  id: true,
  name: true,
  price: true,
  emoji: true,
  visible: true,
  position: true,
  images: { select: { id: true }, orderBy: { position: 'asc' } },
  items: {
    select: {
      quantity: true,
      product: { select: { id: true, name: true, emoji: true, price: true, visible: true } },
    },
  },
} satisfies Prisma.PromoSelect;

type ProductRow = Prisma.ProductGetPayload<{ select: typeof PRODUCT_SELECT }>;
type PromoRow = Prisma.PromoGetPayload<{ select: typeof PROMO_SELECT }>;

function toProduct(row: ProductRow): Product {
  return {
    kind: 'producto',
    id: row.id,
    name: row.name,
    price: row.price,
    emoji: row.emoji,
    images: row.images.map((image) => image.id),
  };
}

function toPromo(row: PromoRow): Promo {
  return {
    kind: 'combo',
    id: row.id,
    name: row.name,
    price: row.price,
    emoji: row.emoji,
    images: row.images.map((image) => image.id),
    items: row.items.map((item) => ({
      productId: item.product.id,
      name: item.product.name,
      emoji: item.product.emoji,
      quantity: item.quantity,
    })),
    // Cuánto costaría comprando cada producto por separado. Es solo para mostrar
    // el ahorro: el precio que se cobra es el que escribió Matías.
    fullPrice: row.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
  };
}

/** Un combo con algún producto oculto no se puede vender: se dejó de ofrecer una parte. */
function hiddenProductsOf(row: PromoRow): string[] {
  return row.items.filter((item) => !item.product.visible).map((item) => item.product.name);
}

/**
 * Catálogo público: productos y combos visibles, mezclados en un solo orden.
 * Un combo con productos ocultos no aparece, aunque el combo esté visible.
 */
export async function listCatalog(db: PrismaClient = prisma): Promise<CatalogItem[]> {
  const [products, promos] = await Promise.all([
    db.product.findMany({
      where: { visible: true },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      select: PRODUCT_SELECT,
    }),
    db.promo.findMany({
      where: { visible: true },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      select: PROMO_SELECT,
    }),
  ]);

  // Se etiqueta cada cosa con su posición y después se ordena todo junto: así
  // productos y combos se intercalan en el orden que definió Matías.
  const conPosicion: { position: number; item: CatalogItem }[] = [
    ...(products ?? []).map((row) => ({ position: row.position, item: toProduct(row) })),
    ...(promos ?? [])
      .filter((row) => row.items.length > 0 && hiddenProductsOf(row).length === 0)
      .map((row) => ({ position: row.position, item: toPromo(row) })),
  ];

  return conPosicion.sort((a, b) => a.position - b.position).map((entrada) => entrada.item);
}

export async function listAllProducts(db: PrismaClient = prisma): Promise<AdminProduct[]> {
  const rows = await db.product.findMany({
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    select: PRODUCT_SELECT,
  });
  return rows.map((row) => ({ ...toProduct(row), visible: row.visible, position: row.position }));
}

/** Combos del administrador, incluidos los ocultos y los que no se pueden vender. */
export async function listAllPromos(db: PrismaClient = prisma): Promise<AdminPromo[]> {
  const rows = await db.promo.findMany({
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    select: PROMO_SELECT,
  });
  return rows.map((row) => {
    const hiddenProducts = hiddenProductsOf(row);
    return {
      ...toPromo(row),
      visible: row.visible,
      position: row.position,
      sellable: row.items.length > 0 && hiddenProducts.length === 0,
      hiddenProducts,
    };
  });
}
