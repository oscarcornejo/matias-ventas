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
        id: z.string().min(1),
        kind: z.enum(['producto', 'combo']),
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
 * oculto no se puede comprar aunque alguien conserve su id en el carrito, y un
 * combo tampoco si alguno de los productos que lo componen dejó de ofrecerse.
 */
export async function priceCart(
  items: CheckoutInput['items'],
  db: PrismaClient = prisma,
): Promise<PricedCart> {
  const cantidades = new Map<string, { kind: 'producto' | 'combo'; quantity: number }>();
  for (const item of items) {
    const previo = cantidades.get(item.id);
    cantidades.set(item.id, {
      kind: item.kind,
      quantity: (previo?.quantity ?? 0) + item.quantity,
    });
  }

  const idsProducto = [...cantidades].filter(([, v]) => v.kind === 'producto').map(([id]) => id);
  const idsCombo = [...cantidades].filter(([, v]) => v.kind === 'combo').map(([id]) => id);

  const [productos, combos] = await Promise.all([
    idsProducto.length
      ? db.product.findMany({
          where: { id: { in: idsProducto }, visible: true },
          select: { id: true, name: true, price: true },
        })
      : Promise.resolve([]),
    idsCombo.length
      ? db.promo.findMany({
          where: { id: { in: idsCombo }, visible: true },
          select: {
            id: true,
            name: true,
            price: true,
            items: {
              select: { quantity: true, product: { select: { name: true, visible: true } } },
            },
          },
        })
      : Promise.resolve([]),
  ]);

  const catalogoProductos = new Map(productos.map((p) => [p.id, p]));
  const catalogoCombos = new Map(combos.map((p) => [p.id, p]));

  const lines: PricedLine[] = [];
  for (const [id, { kind, quantity }] of cantidades) {
    if (quantity > MAX_QUANTITY_PER_PRODUCT) {
      throw new PricingError(`Cantidad máxima por producto: ${MAX_QUANTITY_PER_PRODUCT}`);
    }

    if (kind === 'producto') {
      const producto = catalogoProductos.get(id);
      if (!producto) throw new PricingError(`Producto no disponible: ${id}`);
      lines.push({ productId: id, name: producto.name, unitPrice: producto.price, quantity });
      continue;
    }

    const combo = catalogoCombos.get(id);
    if (!combo) throw new PricingError(`Combo no disponible: ${id}`);
    if (combo.items.length === 0 || combo.items.some((item) => !item.product.visible)) {
      throw new PricingError(`Combo no disponible: ${id}`);
    }

    // El nombre guarda lo que lleva el combo: la orden tiene que alcanzar para
    // que Matías lo prepare sin consultar el catálogo, y los precios de hoy no
    // deben cambiar lo que dice una compra de ayer.
    const detalle = combo.items.map((item) => `${item.quantity} ${item.product.name}`).join(' + ');
    lines.push({
      productId: id,
      name: `${combo.name} (${detalle})`,
      unitPrice: combo.price,
      quantity,
    });
  }

  const total = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  return { lines, total };
}
