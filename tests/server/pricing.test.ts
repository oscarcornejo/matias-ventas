import { describe, expect, it } from 'vitest';
import { PricingError, priceCart } from '../../server/lib/pricing';
import { MP_CURRENCY, buildPreferenceBody } from '../../server/lib/mercadopago';

describe('cálculo de precios en el servidor (CLP)', () => {
  it('usa los precios del catálogo y agrupa productos repetidos', () => {
    const result = priceCart([
      { productId: 'grosso-crunch', quantity: 2 },
      { productId: 'grosso-crunch', quantity: 1 },
      { productId: 'chirlito-suffle', quantity: 1 },
    ]);
    expect(result.lines).toEqual([
      { productId: 'grosso-crunch', name: 'Grosso Crunch', unitPrice: 200, quantity: 3 },
      { productId: 'chirlito-suffle', name: 'Chirlito Suffle', unitPrice: 300, quantity: 1 },
    ]);
    expect(result.total).toBe(900);
    expect(Number.isInteger(result.total)).toBe(true);
  });

  it('lanza un error con productos desconocidos', () => {
    expect(() => priceCart([{ productId: 'no-existe', quantity: 1 }])).toThrow(PricingError);
  });
});

describe('preferencia de Mercado Pago', () => {
  const { lines } = priceCart([
    { productId: 'alfajor-panchito', quantity: 2 },
    { productId: 'grosso-crunch', quantity: 1 },
  ]);

  it('envía cada ítem en CLP con precio unitario entero', () => {
    const body = buildPreferenceBody('orden-1', lines, 'https://mati-ventas.cl');
    expect(MP_CURRENCY).toBe('CLP');
    expect(body.items).toEqual([
      { id: 'alfajor-panchito', title: 'Alfajor Panchito', quantity: 2, unit_price: 400, currency_id: 'CLP' },
      { id: 'grosso-crunch', title: 'Grosso Crunch', quantity: 1, unit_price: 200, currency_id: 'CLP' },
    ]);
    for (const item of body.items) expect(Number.isInteger(item.unit_price)).toBe(true);
  });

  it('vincula la orden y configura retornos y webhook', () => {
    const body = buildPreferenceBody('orden-1', lines, 'https://mati-ventas.cl');
    expect(body.external_reference).toBe('orden-1');
    expect(body.back_urls).toEqual({
      success: 'https://mati-ventas.cl/pago/aprobado?orden=orden-1',
      pending: 'https://mati-ventas.cl/pago/pendiente?orden=orden-1',
      failure: 'https://mati-ventas.cl/pago/rechazado?orden=orden-1',
    });
    expect(body.notification_url).toBe('https://mati-ventas.cl/api/webhooks/mercadopago');
    expect(body.auto_return).toBe('approved');
  });

  it('no usa auto_return con una URL http local', () => {
    const body = buildPreferenceBody('orden-1', lines, 'http://localhost:5173');
    expect(body.auto_return).toBeUndefined();
  });
});
