import type { Order, OrderItem, User } from '@prisma/client';
import { prisma } from '../db.js';
import { MP_CURRENCY, type PaymentInfo } from './mercadopago.js';
import type { OrderDTO, OrderStatus } from '../../shared/types.js';

/** Traduce el estado del pago de Mercado Pago al estado de la orden. null = sin cambio. */
export function statusFromPayment(paymentStatus: string): OrderStatus | null {
  switch (paymentStatus) {
    case 'approved':
      return 'PAGADA';
    case 'rejected':
    case 'cancelled':
      return 'RECHAZADA';
    default:
      // pending, in_process, authorized, in_mediation...: la orden sigue pendiente.
      return null;
  }
}

export type ApplyPaymentResult = 'updated' | 'unchanged' | 'order_not_found' | 'amount_mismatch';

/**
 * Concilia un pago con su orden. Es idempotente: Mercado Pago puede reenviar la misma notificación.
 * - Una orden PAGADA no retrocede (por ejemplo, si llega tarde el aviso de un intento rechazado anterior).
 * - Antes de marcar PAGADA se verifica que la moneda sea CLP y que el monto coincida con el total.
 */
export async function applyPaymentToOrder(payment: PaymentInfo): Promise<ApplyPaymentResult> {
  if (!payment.externalReference) return 'order_not_found';

  const order = await prisma.order.findUnique({ where: { id: payment.externalReference } });
  if (!order) return 'order_not_found';

  const nextStatus = statusFromPayment(payment.status);
  if (!nextStatus) return 'unchanged';
  if (order.status === 'PAGADA') return 'unchanged';

  if (nextStatus === 'PAGADA') {
    const amountMatches = payment.transactionAmount === order.total;
    const currencyMatches = payment.currencyId === MP_CURRENCY;
    if (!amountMatches || !currencyMatches) return 'amount_mismatch';
  }

  if (order.status === nextStatus && order.mpPaymentId === payment.id) return 'unchanged';

  await prisma.order.update({
    where: { id: order.id },
    data: { status: nextStatus, mpPaymentId: payment.id },
  });
  return 'updated';
}

type OrderWithItems = Order & { items: OrderItem[]; user?: Pick<User, 'email'> };

export function toOrderDTO(order: OrderWithItems): OrderDTO {
  return {
    id: order.id,
    status: order.status,
    total: order.total,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((item) => ({
      productId: item.productId,
      name: item.name,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
    })),
    ...(order.user ? { customerEmail: order.user.email } : {}),
  };
}
