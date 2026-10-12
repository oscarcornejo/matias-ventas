import { Router } from 'express';
import { prisma } from '../db.js';
import { currentUser, forbidAdmin, requireAuth } from '../middleware/auth.js';
import { PricingError, checkoutSchema, priceCart } from '../lib/pricing.js';
import { createPreference } from '../lib/mercadopago.js';

export const checkoutRouter = Router();

checkoutRouter.post('/', requireAuth, forbidAdmin, async (req, res) => {
  const parsed = checkoutSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Carrito inválido.' });
    return;
  }

  let priced;
  try {
    priced = await priceCart(parsed.data.items);
  } catch (error) {
    if (error instanceof PricingError) {
      res.status(400).json({ error: error.message });
      return;
    }
    throw error;
  }

  const user = currentUser(req);
  const order = await prisma.order.create({
    data: {
      userId: user.id,
      status: 'PENDIENTE',
      total: priced.total,
      items: { create: priced.lines },
    },
  });

  try {
    const preference = await createPreference(order.id, priced.lines);
    await prisma.order.update({
      where: { id: order.id },
      data: { mpPreferenceId: preference.id },
    });
    res.status(201).json({ orderId: order.id, initPoint: preference.initPoint });
  } catch (error) {
    // La orden nunca llegó a Mercado Pago: se elimina para no dejar pendientes fantasma.
    await prisma.order.delete({ where: { id: order.id } }).catch(() => undefined);
    console.error('[checkout] Error al crear la preferencia de Mercado Pago', error);
    res.status(502).json({ error: 'No pudimos conectar con Mercado Pago. Inténtalo nuevamente.' });
  }
});
