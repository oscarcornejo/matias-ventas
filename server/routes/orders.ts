import { Router } from 'express';
import { prisma } from '../db.js';
import { currentUser, requireAuth, requireRole } from '../middleware/auth.js';
import { toOrderDTO } from '../lib/orders.js';

export const ordersRouter = Router();

ordersRouter.use(requireAuth);

ordersRouter.get('/mine', async (req, res) => {
  const orders = await prisma.order.findMany({
    where: { userId: currentUser(req).id },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ orders: orders.map(toOrderDTO) });
});

ordersRouter.get('/:id', async (req, res) => {
  const user = currentUser(req);
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: { items: true },
  });
  // Un cliente solo ve sus propias órdenes; 404 para no revelar que existe.
  if (!order || (user.role !== 'ADMIN' && order.userId !== user.id)) {
    res.status(404).json({ error: 'Orden no encontrada.' });
    return;
  }
  res.json({ order: toOrderDTO(order) });
});

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole('ADMIN'));

adminRouter.get('/orders', async (_req, res) => {
  const orders = await prisma.order.findMany({
    include: { items: true, user: { select: { email: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ orders: orders.map(toOrderDTO) });
});
