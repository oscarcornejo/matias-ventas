import { createHmac, timingSafeEqual } from 'node:crypto';
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';
import { getEnv } from '../env.js';
import type { PricedLine } from './pricing.js';

/** Moneda de la cuenta de Mercado Pago Chile. */
export const MP_CURRENCY = 'CLP';

let config: MercadoPagoConfig | undefined;

function mpConfig(): MercadoPagoConfig {
  config ??= new MercadoPagoConfig({
    accessToken: getEnv().MP_ACCESS_TOKEN,
    options: { timeout: 10_000 },
  });
  return config;
}

type PreferenceBody = Parameters<Preference['create']>[0]['body'];

export function buildPreferenceBody(orderId: string, lines: PricedLine[], appUrl: string): PreferenceBody {
  const backUrl = (path: string) => `${appUrl}/pago/${path}?orden=${encodeURIComponent(orderId)}`;
  return {
    items: lines.map((line) => ({
      id: line.productId,
      title: line.name,
      quantity: line.quantity,
      unit_price: line.unitPrice, // entero: el peso chileno no tiene decimales
      currency_id: MP_CURRENCY,
    })),
    external_reference: orderId,
    back_urls: {
      success: backUrl('aprobado'),
      pending: backUrl('pendiente'),
      failure: backUrl('rechazado'),
    },
    // Mercado Pago solo acepta auto_return con una URL pública (https).
    ...(appUrl.startsWith('https://') ? { auto_return: 'approved' } : {}),
    notification_url: `${appUrl}/api/webhooks/mercadopago`,
    statement_descriptor: 'MATI VENTAS',
    metadata: { order_id: orderId },
  };
}

export interface CreatedPreference {
  id: string;
  initPoint: string;
}

export async function createPreference(orderId: string, lines: PricedLine[]): Promise<CreatedPreference> {
  const body = buildPreferenceBody(orderId, lines, getEnv().APP_URL);
  const preference = await new Preference(mpConfig()).create({
    body,
    requestOptions: { idempotencyKey: `order-${orderId}` },
  });
  if (!preference.id || !preference.init_point) {
    throw new Error('Mercado Pago no devolvió init_point');
  }
  return { id: preference.id, initPoint: preference.init_point };
}

/** Datos del pago que necesitamos para conciliar la orden. */
export interface PaymentInfo {
  id: string;
  status: string;
  externalReference: string | null;
  transactionAmount: number | null;
  currencyId: string | null;
}

export async function fetchPayment(paymentId: string): Promise<PaymentInfo> {
  const payment = await new Payment(mpConfig()).get({ id: paymentId });
  return {
    id: String(payment.id ?? paymentId),
    status: payment.status ?? 'unknown',
    externalReference: payment.external_reference ?? null,
    transactionAmount: payment.transaction_amount ?? null,
    currencyId: payment.currency_id ?? null,
  };
}

/**
 * Valida el encabezado x-signature de las notificaciones de Mercado Pago.
 * Formato: "ts=<timestamp>,v1=<hmac>". El HMAC-SHA256 se calcula sobre el manifiesto
 * "id:<data.id>;request-id:<x-request-id>;ts:<ts>;" con la clave secreta del webhook.
 */
export function verifyWebhookSignature(params: {
  xSignature: string | undefined;
  xRequestId: string | undefined;
  dataId: string | undefined;
  secret: string;
}): boolean {
  const { xSignature, xRequestId, dataId, secret } = params;
  if (!xSignature || !secret) return false;

  let ts: string | undefined;
  let v1: string | undefined;
  for (const part of xSignature.split(',')) {
    const [rawKey, ...rest] = part.split('=');
    const key = rawKey?.trim();
    const value = rest.join('=').trim();
    if (key === 'ts') ts = value;
    else if (key === 'v1') v1 = value;
  }
  if (!ts || !v1) return false;

  let manifest = '';
  if (dataId) {
    // Mercado Pago indica usar el id en minúsculas cuando es alfanumérico.
    manifest += `id:${/^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId};`;
  }
  if (xRequestId) manifest += `request-id:${xRequestId};`;
  manifest += `ts:${ts};`;

  const expected = createHmac('sha256', secret).update(manifest).digest('hex');
  const expectedBuf = Buffer.from(expected, 'hex');
  const receivedBuf = Buffer.from(v1, 'hex');
  return receivedBuf.length === expectedBuf.length && timingSafeEqual(receivedBuf, expectedBuf);
}
