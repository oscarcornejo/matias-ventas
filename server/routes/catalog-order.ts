import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const ordenSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        kind: z.enum(['producto', 'combo']),
      }),
    )
    .min(1)
    .max(200),
});

export const catalogOrderRouter = Router();

catalogOrderRouter.use(requireAuth, requireRole('ADMIN'));

/**
 * Guarda el orden del catálogo completo.
 *
 * Productos y combos viven en tablas distintas pero se muestran en una sola lista,
 * así que las posiciones se escriben desde una secuencia única: la posición 1 puede
 * ser un producto y la 2 un combo. Se recibe la lista entera y se reescribe de
 * principio a fin, lo que evita tener que razonar sobre movimientos parciales.
 *
 * Los ids no se tocan: mover algo de lugar nunca cambia a qué producto apunta una
 * compra ya hecha ni un combo que lo contenga.
 */
catalogOrderRouter.patch('/', async (req, res) => {
  const parsed = ordenSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Orden inválido.' });
    return;
  }

  const { items } = parsed.data;
  const idsProducto = items.filter((i) => i.kind === 'producto').map((i) => i.id);
  const idsCombo = items.filter((i) => i.kind === 'combo').map((i) => i.id);

  // Se exige la lista completa: si falta algo, reordenar dejaría huecos y el
  // resultado dependería de en qué orden se guardó, no de lo que se ve en pantalla.
  const [totalProductos, totalCombos] = await Promise.all([
    prisma.product.count(),
    prisma.promo.count(),
  ]);
  if (idsProducto.length !== totalProductos || idsCombo.length !== totalCombos) {
    res.status(400).json({ error: 'El orden recibido no cubre todo el catálogo.' });
    return;
  }

  await prisma.$transaction([
    ...items.map((item, index) =>
      item.kind === 'producto'
        ? prisma.product.update({ where: { id: item.id }, data: { position: index + 1 } })
        : prisma.promo.update({ where: { id: item.id }, data: { position: index + 1 } }),
    ),
  ]);

  res.status(204).end();
});
