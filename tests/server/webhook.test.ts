import { createHmac } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createPrismaMock } from './helpers';

const { prismaMock, fetchPaymentMock } = vi.hoisted(() => ({
  prismaMock: {} as ReturnType<typeof createPrismaMock>,
  fetchPaymentMock: vi.fn(),
}));

vi.mock('../../server/db.js', () => ({ prisma: prismaMock }));
vi.mock('../../server/lib/mercadopago.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../server/lib/mercadopago')>()),
  fetchPayment: fetchPaymentMock,
}));

const { createApp } = await import('../../server/app');
const { verifyWebhookSignature } = await import('../../server/lib/mercadopago');
const { applyPaymentToOrder } = await import('../../server/lib/orders');

const SECRET = process.env.MP_WEBHOOK_SECRET ?? '';
const app = createApp();

function sign(dataId: string, requestId: string, ts = '1730000000', secret = SECRET) {
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  return `ts=${ts},v1=${createHmac('sha256', secret).update(manifest).digest('hex')}`;
}

const pendingOrder = { id: 'orden-1', status: 'PENDIENTE', total: 700, mpPaymentId: null };

const payment = (overrides: Partial<Parameters<typeof applyPaymentToOrder>[0]> = {}) => ({
  id: '999',
  status: 'approved',
  externalReference: 'orden-1',
  transactionAmount: 700,
  currencyId: 'CLP',
  ...overrides,
});

describe('firma del webhook (x-signature)', () => {
  it('acepta una firma válida', () => {
    expect(
      verifyWebhookSignature({ xSignature: sign('123', 'req-1'), xRequestId: 'req-1', dataId: '123', secret: SECRET }),
    ).toBe(true);
  });

  it('rechaza firmas alteradas, con otra clave o incompletas', () => {
    const base = { xRequestId: 'req-1', dataId: '123', secret: SECRET };
    expect(verifyWebhookSignature({ ...base, xSignature: sign('124', 'req-1') })).toBe(false);
    expect(verifyWebhookSignature({ ...base, xSignature: sign('123', 'req-1', '1730000000', 'otra') })).toBe(false);
    expect(verifyWebhookSignature({ ...base, xSignature: 'ts=1730000000' })).toBe(false);
    expect(verifyWebhookSignature({ ...base, xSignature: undefined })).toBe(false);
  });
});

describe('POST /api/webhooks/mercadopago', () => {
  beforeEach(() => {
    Object.assign(prismaMock, createPrismaMock());
    fetchPaymentMock.mockReset();
  });

  it('rechaza con 401 una notificación sin firma válida', async () => {
    const response = await request(app)
      .post('/api/webhooks/mercadopago?data.id=999&type=payment')
      .set('x-signature', 'ts=1,v1=deadbeef')
      .set('x-request-id', 'req-1')
      .send({ type: 'payment', data: { id: '999' } });
    expect(response.status).toBe(401);
    expect(fetchPaymentMock).not.toHaveBeenCalled();
  });

  it('con firma válida consulta el pago y marca la orden como PAGADA', async () => {
    fetchPaymentMock.mockResolvedValue(payment());
    prismaMock.order.findUnique.mockResolvedValue(pendingOrder);
    prismaMock.order.update.mockResolvedValue({});

    const response = await request(app)
      .post('/api/webhooks/mercadopago?data.id=999&type=payment')
      .set('x-signature', sign('999', 'req-1'))
      .set('x-request-id', 'req-1')
      .send({ type: 'payment', data: { id: '999' } });

    expect(response.status).toBe(200);
    expect(fetchPaymentMock).toHaveBeenCalledWith('999');
    expect(prismaMock.order.update).toHaveBeenCalledWith({
      where: { id: 'orden-1' },
      data: { status: 'PAGADA', mpPaymentId: '999' },
    });
  });
});

describe('conciliación de pagos con órdenes', () => {
  beforeEach(() => {
    Object.assign(prismaMock, createPrismaMock());
    prismaMock.order.update.mockResolvedValue({});
  });

  it('pago rechazado → orden RECHAZADA', async () => {
    prismaMock.order.findUnique.mockResolvedValue(pendingOrder);
    expect(await applyPaymentToOrder(payment({ status: 'rejected' }))).toBe('updated');
    expect(prismaMock.order.update).toHaveBeenCalledWith({
      where: { id: 'orden-1' },
      data: { status: 'RECHAZADA', mpPaymentId: '999' },
    });
  });

  it('no marca PAGADA si el monto no coincide con el total', async () => {
    prismaMock.order.findUnique.mockResolvedValue(pendingOrder);
    expect(await applyPaymentToOrder(payment({ transactionAmount: 1 }))).toBe('amount_mismatch');
    expect(prismaMock.order.update).not.toHaveBeenCalled();
  });

  it('no marca PAGADA si la moneda no es CLP', async () => {
    prismaMock.order.findUnique.mockResolvedValue(pendingOrder);
    expect(await applyPaymentToOrder(payment({ currencyId: 'USD' }))).toBe('amount_mismatch');
    expect(prismaMock.order.update).not.toHaveBeenCalled();
  });

  it('una orden PAGADA no retrocede por un aviso tardío de rechazo', async () => {
    prismaMock.order.findUnique.mockResolvedValue({ ...pendingOrder, status: 'PAGADA', mpPaymentId: '999' });
    expect(await applyPaymentToOrder(payment({ id: '998', status: 'rejected' }))).toBe('unchanged');
    expect(prismaMock.order.update).not.toHaveBeenCalled();
  });

  it('un pago en proceso deja la orden pendiente', async () => {
    prismaMock.order.findUnique.mockResolvedValue(pendingOrder);
    expect(await applyPaymentToOrder(payment({ status: 'in_process' }))).toBe('unchanged');
    expect(prismaMock.order.update).not.toHaveBeenCalled();
  });

  it('ignora pagos de órdenes inexistentes', async () => {
    prismaMock.order.findUnique.mockResolvedValue(null);
    expect(await applyPaymentToOrder(payment())).toBe('order_not_found');
  });
});
