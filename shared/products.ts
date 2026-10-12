/**
 * Forma de un producto tal como viaja del servidor al navegador.
 *
 * El catálogo vive en la base de datos y lo administra Matías. El servidor sigue
 * siendo la única autoridad sobre los precios: los lee desde la base al cobrar y
 * nunca confía en lo que mande el navegador.
 *
 * Precios en pesos chilenos (CLP), siempre enteros: el peso no usa decimales.
 */
export interface Product {
  id: string;
  name: string;
  price: number;
  /** Marcador visual mientras no haya fotografía. */
  emoji: string;
  /** Si es true, la foto se pide a /api/productos/:id/imagen. */
  hasImage: boolean;
}

/** Producto como lo ve el administrador: incluye lo que el público no necesita. */
export interface AdminProduct extends Product {
  visible: boolean;
  position: number;
}

export const MAX_PRODUCT_NAME = 60;
export const MIN_PRODUCT_PRICE = 1;
export const MAX_PRODUCT_PRICE = 1_000_000;

/** Ruta de la foto de un producto. Devuelve null si todavía no tiene. */
export function productImageUrl(product: Pick<Product, 'id' | 'hasImage'>): string | null {
  return product.hasImage ? `/api/productos/${encodeURIComponent(product.id)}/imagen` : null;
}

export function findProductIn(products: readonly Product[], id: string): Product | undefined {
  return products.find((product) => product.id === id);
}
