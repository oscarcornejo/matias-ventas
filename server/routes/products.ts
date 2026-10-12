import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { listAllProducts, listVisibleProducts } from '../lib/catalog.js';
import { MAX_PRODUCT_NAME, MAX_PRODUCT_PRICE, MIN_PRODUCT_PRICE } from '../../shared/products.js';

/** Formatos que el navegador puede mostrar y que aceptamos guardar. */
const IMAGE_TYPES = ['image/webp', 'image/jpeg', 'image/png'] as const;
/** El navegador redimensiona antes de subir; esto es el tope de seguridad. */
const MAX_IMAGE_BYTES = 600_000;

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

const imageSchema = z.object({
  type: z.enum(IMAGE_TYPES),
  // La imagen viaja en base64 dentro del JSON: son archivos chicos y así no
  // hace falta multipart ni una dependencia extra para parsearlo.
  data: z.string().min(1).max(Math.ceil(MAX_IMAGE_BYTES * 1.4)),
});

// ---------------------------------------------------------------- público ---

export const productsRouter = Router();

/** Catálogo público: cualquiera puede verlo sin cuenta. */
productsRouter.get('/', async (_req, res) => {
  res.json({ products: await listVisibleProducts() });
});

/** Foto del producto. Pública y cacheable: el id cambia si cambia el producto. */
productsRouter.get('/:id/imagen', async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
    select: { imageData: true, imageType: true, visible: true, updatedAt: true },
  });

  if (!product?.imageData || !product.imageType || !product.visible) {
    res.status(404).json({ error: 'Imagen no encontrada.' });
    return;
  }

  const etag = `"${product.updatedAt.getTime()}"`;
  if (req.headers['if-none-match'] === etag) {
    res.status(304).end();
    return;
  }

  res.setHeader('Content-Type', product.imageType);
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.setHeader('ETag', etag);
  res.send(Buffer.from(product.imageData));
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

/** Sube o reemplaza la foto. El navegador ya la redimensionó y comprimió. */
adminProductsRouter.put('/:id/imagen', async (req, res) => {
  const parsed = imageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'La imagen no tiene un formato válido (WebP, JPEG o PNG).' });
    return;
  }

  const bytes = Buffer.from(parsed.data.data, 'base64');
  if (bytes.byteLength === 0) {
    res.status(400).json({ error: 'La imagen llegó vacía. Inténtalo de nuevo.' });
    return;
  }
  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    res.status(413).json({ error: 'La imagen pesa demasiado. Elige una más liviana.' });
    return;
  }

  const exists = await prisma.product.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!exists) {
    res.status(404).json({ error: 'Producto no encontrado.' });
    return;
  }

  await prisma.product.update({
    where: { id: req.params.id },
    data: { imageData: bytes, imageType: parsed.data.type },
  });
  res.status(204).end();
});

adminProductsRouter.delete('/:id/imagen', async (req, res) => {
  const exists = await prisma.product.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!exists) {
    res.status(404).json({ error: 'Producto no encontrado.' });
    return;
  }
  await prisma.product.update({
    where: { id: req.params.id },
    data: { imageData: null, imageType: null },
  });
  res.status(204).end();
});
