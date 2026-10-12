import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPrismaMock } from './helpers';

const { prismaMock } = vi.hoisted(() => ({ prismaMock: {} as ReturnType<typeof createPrismaMock> }));
vi.mock('../../server/db.js', () => ({ prisma: prismaMock }));

const { PricingError, priceCart } = await import('../../server/lib/pricing');
const { MP_CURRENCY, buildPreferenceBody } = await import('../../server/lib/mercadopago');

/** Catálogo de prueba, con el papel que antes cumplía la constante del código. */
const CATALOGO = [
  { id: 'p-chirlito', name: 'Chirlito Suffle', price: 300 },
  { id: 'p-grosso', name: 'Grosso Crunch', price: 200 },
  { id: 'p-alfajor', name: 'Alfajor Panchito', price: 400 },
];

/** Combo de prueba: 1 Chirlito + 2 Grosso, a $600 en vez de $700. */
const COMBO = {
  id: 'c-recreo',
  name: 'Combo recreo',
  price: 600,
  items: [
    { quantity: 1, product: { name: 'Chirlito Suffle', visible: true } },
    { quantity: 2, product: { name: 'Grosso Crunch', visible: true } },
  ],
};

/** Simula el filtro real: solo devuelve lo pedido y visible. */
function conCatalogo(visibles = CATALOGO, combos: unknown[] = [COMBO]) {
  prismaMock.product.findMany.mockImplementation(
    async ({ where }: { where: { id: { in: string[] } } }) =>
      visibles.filter((p) => where.id.in.includes(p.id)),
  );
  prismaMock.promo.findMany.mockImplementation(
    async ({ where }: { where: { id: { in: string[] } } }) =>
      (combos as { id: string }[]).filter((p) => where.id.in.includes(p.id)),
  );
}

beforeEach(() => {
  Object.assign(prismaMock, createPrismaMock());
  conCatalogo();
});

describe('cálculo de precios en el servidor (CLP)', () => {
  it('usa los precios de la base y agrupa productos repetidos', async () => {
    const result = await priceCart([
      { id: 'p-grosso', kind: 'producto' as const, quantity: 2 },
      { id: 'p-grosso', kind: 'producto' as const, quantity: 1 },
      { id: 'p-chirlito', kind: 'producto' as const, quantity: 1 },
    ]);
    expect(result.lines).toEqual([
      { productId: 'p-grosso', name: 'Grosso Crunch', unitPrice: 200, quantity: 3 },
      { productId: 'p-chirlito', name: 'Chirlito Suffle', unitPrice: 300, quantity: 1 },
    ]);
    expect(result.total).toBe(900);
    expect(Number.isInteger(result.total)).toBe(true);
  });

  it('ignora cualquier precio que mande el navegador', async () => {
    // El navegador solo manda id, tipo y cantidad; aunque cuele un precio, no se usa.
    const result = await priceCart([
      { id: 'p-alfajor', kind: 'producto', quantity: 1, price: 1 } as never,
    ]);
    expect(result.total).toBe(400);
  });

  it('rechaza productos desconocidos', async () => {
    await expect(priceCart([{ id: 'no-existe', kind: 'producto' as const, quantity: 1 }])).rejects.toBeInstanceOf(PricingError);
  });

  it('cobra el precio del combo, no la suma de sus partes', async () => {
    const result = await priceCart([{ id: 'c-recreo', kind: 'combo', quantity: 1 }]);
    expect(result.total).toBe(600); // la suma por separado sería 700
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]?.unitPrice).toBe(600);
  });

  it('guarda en el nombre lo que lleva el combo, para poder prepararlo', async () => {
    // La orden tiene que alcanzar para armar el pedido sin consultar el catálogo,
    // y los precios de hoy no deben cambiar lo que dice una compra de ayer.
    const result = await priceCart([{ id: 'c-recreo', kind: 'combo', quantity: 2 }]);
    expect(result.lines[0]?.name).toBe('Combo recreo (1 Chirlito Suffle + 2 Grosso Crunch)');
    expect(result.total).toBe(1200);
  });

  it('mezcla productos sueltos y combos en el mismo carrito', async () => {
    const result = await priceCart([
      { id: 'p-alfajor', kind: 'producto', quantity: 1 },
      { id: 'c-recreo', kind: 'combo', quantity: 1 },
    ]);
    expect(result.total).toBe(1000); // 400 + 600
  });

  it('rechaza un combo oculto', async () => {
    conCatalogo(CATALOGO, []);
    await expect(priceCart([{ id: 'c-recreo', kind: 'combo', quantity: 1 }])).rejects.toBeInstanceOf(PricingError);
  });

  it('rechaza un combo si alguno de sus productos dejó de ofrecerse', async () => {
    // El combo sigue visible, pero una de sus partes no se vende: no se puede cobrar
    // algo que no se puede entregar.
    conCatalogo(CATALOGO, [
      {
        ...COMBO,
        items: [
          { quantity: 1, product: { name: 'Chirlito Suffle', visible: true } },
          { quantity: 2, product: { name: 'Grosso Crunch', visible: false } },
        ],
      },
    ]);
    await expect(priceCart([{ id: 'c-recreo', kind: 'combo', quantity: 1 }])).rejects.toBeInstanceOf(PricingError);
  });

  it('rechaza un producto que el administrador ocultó', async () => {
    // El carrito del navegador puede conservar el id de algo que ya no se vende.
    conCatalogo(CATALOGO.filter((p) => p.id !== 'p-alfajor'));
    await expect(priceCart([{ id: 'p-alfajor', kind: 'producto' as const, quantity: 1 }])).rejects.toBeInstanceOf(PricingError);
  });
});

describe('preferencia de Mercado Pago', () => {
  async function lineas() {
    conCatalogo();
    const { lines } = await priceCart([
      { id: 'p-alfajor', kind: 'producto' as const, quantity: 2 },
      { id: 'p-grosso', kind: 'producto' as const, quantity: 1 },
    ]);
    return lines;
  }

  it('envía cada ítem en CLP con precio unitario entero', async () => {
    const body = buildPreferenceBody('orden-1', await lineas(), 'https://mati-ventas.cl');
    expect(MP_CURRENCY).toBe('CLP');
    expect(body.items).toEqual([
      { id: 'p-alfajor', title: 'Alfajor Panchito', quantity: 2, unit_price: 400, currency_id: 'CLP' },
      { id: 'p-grosso', title: 'Grosso Crunch', quantity: 1, unit_price: 200, currency_id: 'CLP' },
    ]);
    for (const item of body.items) expect(Number.isInteger(item.unit_price)).toBe(true);
  });

  it('vincula la orden y configura retornos y webhook', async () => {
    const body = buildPreferenceBody('orden-1', await lineas(), 'https://mati-ventas.cl');
    expect(body.external_reference).toBe('orden-1');
    expect(body.back_urls).toEqual({
      success: 'https://mati-ventas.cl/pago/aprobado?orden=orden-1',
      pending: 'https://mati-ventas.cl/pago/pendiente?orden=orden-1',
      failure: 'https://mati-ventas.cl/pago/rechazado?orden=orden-1',
    });
    expect(body.notification_url).toBe('https://mati-ventas.cl/api/webhooks/mercadopago');
    expect(body.auto_return).toBe('approved');
  });

  it('no usa auto_return con una URL http local', async () => {
    const body = buildPreferenceBody('orden-1', await lineas(), 'http://localhost:5173');
    expect(body.auto_return).toBeUndefined();
  });
});
