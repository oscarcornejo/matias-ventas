import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { listAllPromos } from '../lib/catalog.js';
import { MAX_PRODUCT_NAME, MAX_PRODUCT_PRICE, MIN_PRODUCT_PRICE } from '../../shared/products.js';

const MAX_ITEMS_POR_COMBO = 12;

const promoSchema = z.object({
  name: z.string().trim().min(1, 'Escribe el nombre del combo.').max(MAX_PRODUCT_NAME),
  price: z
    .number()
    .int('El precio debe ser un número entero de pesos.')
    .min(MIN_PRODUCT_PRICE, 'El precio debe ser mayor que cero.')
    .max(MAX_PRODUCT_PRICE),
  emoji: z.string().trim().min(1).max(8),
  visible: z.boolean().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1, 'Un combo necesita al menos un producto.')
    .max(MAX_ITEMS_POR_COMBO),
});

/** Verifica que todos los productos del combo existan antes de guardarlo. */
async function productosFaltantes(ids: string[]): Promise<string[]> {
  const found = await prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true } });
  const encontrados = new Set(found.map((p) => p.id));
  return ids.filter((id) => !encontrados.has(id));
}

export const adminPromosRouter = Router();

adminPromosRouter.use(requireAuth, requireRole('ADMIN'));

adminPromosRouter.get('/', async (_req, res) => {
  res.json({ promos: await listAllPromos() });
});

adminPromosRouter.post('/', async (req, res) => {
  const parsed = promoSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' });
    return;
  }

  const { items, ...datos } = parsed.data;
  const ids = items.map((item) => item.productId);
  if (new Set(ids).size !== ids.length) {
    res.status(400).json({ error: 'No repitas el mismo producto: usa la cantidad.' });
    return;
  }
  if ((await productosFaltantes(ids)).length > 0) {
    res.status(400).json({ error: 'Alguno de los productos del combo ya no existe.' });
    return;
  }

  const last = await prisma.promo.findFirst({ orderBy: { position: 'desc' }, select: { position: true } });
  const created = await prisma.promo.create({
    data: {
      ...datos,
      visible: datos.visible ?? true,
      position: (last?.position ?? 0) + 1,
      items: { create: items },
    },
    select: { id: true },
  });
  res.status(201).json({ id: created.id });
});

adminPromosRouter.patch('/:id', async (req, res) => {
  const parsed = promoSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' });
    return;
  }

  const exists = await prisma.promo.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!exists) {
    res.status(404).json({ error: 'Combo no encontrado.' });
    return;
  }

  const { items, ...datos } = parsed.data;

  if (items) {
    const ids = items.map((item) => item.productId);
    if (new Set(ids).size !== ids.length) {
      res.status(400).json({ error: 'No repitas el mismo producto: usa la cantidad.' });
      return;
    }
    if ((await productosFaltantes(ids)).length > 0) {
      res.status(400).json({ error: 'Alguno de los productos del combo ya no existe.' });
      return;
    }
  }

  // Si vienen items, se reemplaza la composición completa: es más simple de
  // razonar que ir calzando altas y bajas una por una.
  await prisma.$transaction(async (tx) => {
    await tx.promo.update({ where: { id: req.params.id }, data: datos });
    if (items) {
      await tx.promoItem.deleteMany({ where: { promoId: req.params.id } });
      await tx.promoItem.createMany({
        data: items.map((item) => ({ ...item, promoId: req.params.id })),
      });
    }
  });

  res.status(204).end();
});

