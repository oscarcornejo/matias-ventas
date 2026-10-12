import { z } from 'zod';
import { findProduct } from '../../shared/products.js';

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

/** Calcula los montos en CLP desde el catálogo del servidor. */
export function priceCart(items: CheckoutInput['items']): PricedCart {
  const quantities = new Map<string, number>();
  for (const item of items) {
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
  }

  const lines: PricedLine[] = [];
  for (const [productId, quantity] of quantities) {
    const product = findProduct(productId);
    if (!product) throw new PricingError(`Producto desconocido: ${productId}`);
    if (quantity > MAX_QUANTITY_PER_PRODUCT) {
      throw new PricingError(`Cantidad máxima por producto: ${MAX_QUANTITY_PER_PRODUCT}`);
    }
    lines.push({ productId, name: product.name, unitPrice: product.price, quantity });
  }

  const total = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  return { lines, total };
}
