import { z } from 'zod';
import type { PrismaClient } from '@prisma/client';
import { prisma } from '../db.js';

export const MAX_QUANTITY_PER_PRODUCT = 99;

/**
 * Solo se aceptan productId y quantity. Cualquier otro campo que envíe el navegador
 * (por ejemplo un "price" manipulado) se descarta.
 */
export const checkoutSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_PRODUCT),
      }),
    )
    .min(1, 'El carrito está vacío.')
    .max(50),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export interface PricedLine {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

export interface PricedCart {
  lines: PricedLine[];
  total: number;
}

export class PricingError extends Error {}

/**
 * Calcula los montos en CLP leyendo el catálogo desde la base de datos.
 *
 * El precio que se cobra sale siempre de aquí, nunca del navegador. Un producto
 * oculto no se puede comprar aunque alguien conserve su id en el carrito.
 */
export async function priceCart(
  items: CheckoutInput['items'],
  db: PrismaClient = prisma,
): Promise<PricedCart> {
  const quantities = new Map<string, number>();
  for (const item of items) {
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
  }

  const found = await db.product.findMany({
    where: { id: { in: [...quantities.keys()] }, visible: true },
    select: { id: true, name: true, price: true },
  });
  const catalog = new Map(found.map((product) => [product.id, product]));

  const lines: PricedLine[] = [];
  for (const [productId, quantity] of quantities) {
    const product = catalog.get(productId);
    if (!product) throw new PricingError(`Producto no disponible: ${productId}`);
    if (quantity > MAX_QUANTITY_PER_PRODUCT) {
      throw new PricingError(`Cantidad máxima por producto: ${MAX_QUANTITY_PER_PRODUCT}`);
    }
    lines.push({ productId, name: product.name, unitPrice: product.price, quantity });
  }

  const total = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  return { lines, total };
}
