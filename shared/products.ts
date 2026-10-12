/**
 * Catálogo de la tienda. Es la única fuente de verdad para los precios:
 * el servidor calcula los montos a cobrar desde aquí y nunca confía en el navegador.
 * Precios en pesos chilenos (CLP), siempre enteros: el peso no usa decimales.
 */
export interface Product {
  id: string;
  name: string;
  emoji: string;
  price: number;
}

export const PRODUCTS = [
  { id: 'chirlito-suffle', name: 'Chirlito Suffle', emoji: '🍪', price: 300 },
  { id: 'grosso-crunch', name: 'Grosso Crunch', emoji: '🍬', price: 200 },
  { id: 'alfajor-panchito', name: 'Alfajor Panchito', emoji: '🍫', price: 400 },
] as const satisfies readonly Product[];

export type ProductId = (typeof PRODUCTS)[number]['id'];

export function findProduct(id: string): Product | undefined {
  return PRODUCTS.find((product) => product.id === id);
}

export function isProductId(id: string): id is ProductId {
  return findProduct(id) !== undefined;
}
