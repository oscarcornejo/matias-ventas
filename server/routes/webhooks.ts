import { Router } from 'express';
import { getEnv } from '../env.js';
import { fetchPayment, verifyWebhookSignature } from '../lib/mercadopago.js';
import { applyPaymentToOrder } from '../lib/orders.js';

export const webhooksRouter = Router();

function firstString(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) return firstString(value[0]);
  return undefined;
}

webhooksRouter.post('/mercadopago', async (req, res) => {
  const body = (req.body ?? {}) as { type?: unknown; topic?: unknown; data?: { id?: unknown } };
  // Mercado Pago envía data.id en la query (es lo que entra en la firma) y también en el cuerpo.
  const dataId = firstString(req.query['data.id']) ?? firstString(body.data?.id);
  const type = firstString(req.query.type) ?? firstString(body.type) ?? firstString(body.topic);

  const validSignature = verifyWebhookSignature({
    xSignature: req.get('x-signature'),
    xRequestId: req.get('x-request-id'),
    dataId,
    secret: getEnv().MP_WEBHOOK_SECRET,
  });
  if (!validSignature) {
    res.status(401).json({ error: 'Firma inválida.' });
    return;
  }

  if (type !== 'payment' || !dataId) {
    // Otros eventos (merchant_order, etc.) no cambian el estado de la orden.
    res.sendStatus(200);
    return;
  }

  try {
    const payment = await fetchPayment(dataId);
    const result = await applyPaymentToOrder(payment);
    if (result === 'amount_mismatch') {
      console.error('[webhook] El monto o la moneda del pago no coinciden con la orden', {
        paymentId: payment.id,
        orderId: payment.externalReference,
        amount: payment.transactionAmount,
        currency: payment.currencyId,
      });
    }
    res.sendStatus(200);
  } catch (error) {
    // 500 → Mercado Pago reintentará la notificación más tarde.
    console.error('[webhook] Error al procesar el pago', dataId, error);
    res.sendStatus(500);
  }
});
