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
  kind: 'producto';
  id: string;
  name: string;
  price: number;
  /** Marcador visual mientras no haya fotografía. */
  emoji: string;
  /** Ids de las fotos, en orden. La primera es la que se ve en la tarjeta. */
  images: string[];
}

/** Lo que lleva un combo, con el nombre del producto fijado al momento de leerlo. */
export interface PromoItem {
  productId: string;
  name: string;
  emoji: string;
  quantity: number;
}

/**
 * Combo: varios productos a un precio fijo que define Matías.
 *
 * `price` es lo que se cobra y `fullPrice` es cuánto costaría comprando cada
 * producto por separado. La diferencia es el ahorro, y se calcula para mostrarlo,
 * nunca para decidir el precio.
 */
export interface Promo {
  kind: 'combo';
  id: string;
  name: string;
  price: number;
  emoji: string;
  /** Ids de las fotos, en orden. La primera es la que se ve en la tarjeta. */
  images: string[];
  items: PromoItem[];
  fullPrice: number;
}

/** Cualquier cosa que se puede agregar al carrito. */
export type CatalogItem = Product | Promo;

export function savings(promo: Promo): number {
  return Math.max(0, promo.fullPrice - promo.price);
}

/** Producto como lo ve el administrador: incluye lo que el público no necesita. */
export interface AdminProduct extends Product {
  visible: boolean;
  position: number;
}

/**
 * Combo como lo ve el administrador. `sellable` es false cuando alguno de sus
 * productos está oculto: en ese caso el combo no se puede vender aunque esté
 * marcado como visible, y el panel lo avisa.
 */
export interface AdminPromo extends Promo {
  visible: boolean;
  position: number;
  sellable: boolean;
  hiddenProducts: string[];
}

export const MAX_PRODUCT_NAME = 60;
export const MIN_PRODUCT_PRICE = 1;
export const MAX_PRODUCT_PRICE = 1_000_000;

/** Ruta de una foto por su id. Las fotos no cambian, así que se cachean largo. */
export function imageUrl(imageId: string): string {
  return `/api/imagenes/${encodeURIComponent(imageId)}`;
}

/** Foto principal de un ítem, o null si todavía no tiene ninguna. */
export function coverUrl(item: Pick<CatalogItem, 'images'>): string | null {
  const first = item.images[0];
  return first ? imageUrl(first) : null;
}

/** Ruta del detalle de un ítem del catálogo. */
export function itemUrl(item: Pick<CatalogItem, 'kind' | 'id'>): string {
  return item.kind === 'combo'
    ? `/combo/${encodeURIComponent(item.id)}`
    : `/producto/${encodeURIComponent(item.id)}`;
}

export function findItemIn(items: readonly CatalogItem[], id: string): CatalogItem | undefined {
  return items.find((item) => item.id === id);
}

/** Resumen legible de lo que trae un combo: "1 Chirlito Suffle + 2 Grosso Crunch". */
export function describePromo(promo: Pick<Promo, 'items'>): string {
  return promo.items.map((item) => `${item.quantity} ${item.name}`).join(' + ');
}
