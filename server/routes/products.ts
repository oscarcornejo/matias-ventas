import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { listAllProducts, listCatalog } from '../lib/catalog.js';
import { MAX_PRODUCT_NAME, MAX_PRODUCT_PRICE, MIN_PRODUCT_PRICE } from '../../shared/products.js';

const productSchema = z.object({
  name: z.string().trim().min(1, 'Escribe el nombre del producto.').max(MAX_PRODUCT_NAME),
  price: z
    .number()
    .int('El precio debe ser un número entero de pesos.')
    .min(MIN_PRODUCT_PRICE, 'El precio debe ser mayor que cero.')
    .max(MAX_PRODUCT_PRICE),
  emoji: z.string().trim().min(1).max(8),
  visible: z.boolean().optional(),
});

// ---------------------------------------------------------------- público ---

export const productsRouter = Router();

/** Catálogo público: productos y combos, para cualquiera sin cuenta. */
productsRouter.get('/', async (_req, res) => {
  res.json({ items: await listCatalog() });
});

// ------------------------------------------------------------ administrador ---

export const adminProductsRouter = Router();

adminProductsRouter.use(requireAuth, requireRole('ADMIN'));

adminProductsRouter.get('/', async (_req, res) => {
  res.json({ products: await listAllProducts() });
});

adminProductsRouter.post('/', async (req, res) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' });
    return;
  }

  // Los nuevos van al final del catálogo.
  const last = await prisma.product.findFirst({ orderBy: { position: 'desc' }, select: { position: true } });
  const created = await prisma.product.create({
    data: { ...parsed.data, visible: parsed.data.visible ?? true, position: (last?.position ?? 0) + 1 },
    select: { id: true },
  });
  res.status(201).json({ id: created.id });
});

adminProductsRouter.patch('/:id', async (req, res) => {
  const parsed = productSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' });
    return;
  }

  const exists = await prisma.product.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!exists) {
    res.status(404).json({ error: 'Producto no encontrado.' });
    return;
  }

  await prisma.product.update({ where: { id: req.params.id }, data: parsed.data });
  res.status(204).end();
});

