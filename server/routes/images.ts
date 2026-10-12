import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

/** Formatos que el navegador puede mostrar y que aceptamos guardar. */
const IMAGE_TYPES = ['image/webp', 'image/jpeg', 'image/png'] as const;
/** El navegador redimensiona antes de subir; esto es el tope de seguridad. */
const MAX_IMAGE_BYTES = 600_000;
/** Tope por ítem: un carrusel más largo que esto nadie lo recorre. */
export const MAX_IMAGES_POR_ITEM = 8;

const imageSchema = z.object({
  type: z.enum(IMAGE_TYPES),
  // La imagen viaja en base64 dentro del JSON: son archivos chicos y así no hace
  // falta multipart ni una dependencia extra para parsearlo.
  data: z.string().min(1).max(Math.ceil(MAX_IMAGE_BYTES * 1.4)),
});

// ---------------------------------------------------------------- público ---

export const imagesRouter = Router();

/**
 * Una foto por su id. Pública y cacheable para siempre: el contenido de una
 * imagen nunca cambia, y si Matías sube otra, cambia el id.
 */
imagesRouter.get('/:id', async (req, res) => {
  const image = await prisma.image.findUnique({
    where: { id: req.params.id },
    select: { data: true, type: true },
  });

  if (!image) {
    res.status(404).json({ error: 'Imagen no encontrada.' });
    return;
  }

  res.setHeader('Content-Type', image.type);
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.send(Buffer.from(image.data));
});

// ------------------------------------------------------------ administrador ---

export const adminImagesRouter = Router();

adminImagesRouter.use(requireAuth, requireRole('ADMIN'));

/** Sube una foto a un producto o a un combo. El navegador ya la redimensionó. */
async function subir(
  res: import('express').Response,
  propietario: { productId: string } | { promoId: string },
  body: unknown,
) {
  const parsed = imageSchema.safeParse(body);
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

  const existentes = await prisma.image.count({ where: propietario });
  if (existentes >= MAX_IMAGES_POR_ITEM) {
    res.status(409).json({ error: `Máximo ${MAX_IMAGES_POR_ITEM} fotos por ítem.` });
    return;
  }

  const created = await prisma.image.create({
    data: { ...propietario, data: bytes, type: parsed.data.type, position: existentes },
    select: { id: true },
  });
  res.status(201).json({ id: created.id });
}

adminImagesRouter.post('/productos/:id', async (req, res) => {
  const exists = await prisma.product.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!exists) {
    res.status(404).json({ error: 'Producto no encontrado.' });
    return;
  }
  await subir(res, { productId: req.params.id }, req.body);
});

adminImagesRouter.post('/promociones/:id', async (req, res) => {
  const exists = await prisma.promo.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!exists) {
    res.status(404).json({ error: 'Combo no encontrado.' });
    return;
  }
  await subir(res, { promoId: req.params.id }, req.body);
});

adminImagesRouter.delete('/:id', async (req, res) => {
  const exists = await prisma.image.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!exists) {
    res.status(404).json({ error: 'Imagen no encontrada.' });
    return;
  }
  await prisma.image.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

/** Reordena las fotos de un ítem: llega la lista completa en el orden deseado. */
adminImagesRouter.patch('/orden', async (req, res) => {
  const parsed = z.object({ ids: z.array(z.string().min(1)).min(1).max(MAX_IMAGES_POR_ITEM) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Orden inválido.' });
    return;
  }

  await prisma.$transaction(
    parsed.data.ids.map((id, index) =>
      prisma.image.update({ where: { id }, data: { position: index } }),
    ),
  );
  res.status(204).end();
});
