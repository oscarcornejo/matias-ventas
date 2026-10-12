import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { authRouter } from './routes/auth.js';
import { checkoutRouter } from './routes/checkout.js';
import { adminRouter, ordersRouter } from './routes/orders.js';
import { adminProductsRouter, productsRouter } from './routes/products.js';
import { webhooksRouter } from './routes/webhooks.js';

export function createApp(options: { serveStatic?: boolean } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // Sin esto el bundle viaja sin comprimir: 288 KB en vez de 94 KB. La tienda se usa
  // en el colegio y con mala señal, así que esa diferencia la paga quien compra.
  app.use(compression());

  // El JSON incluye fotos de producto en base64; el resto de las rutas son chicas.
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  app.use('/api/auth', authRouter);
  // Catálogo público: se puede ver la tienda sin cuenta. Comprar sí exige sesión.
  app.use('/api/productos', productsRouter);
  app.use('/api/checkout', checkoutRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/admin/productos', adminProductsRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/webhooks', webhooksRouter);

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada.' });
  });

  if (options.serveStatic) {
    // Producción: Express sirve el build de Vite y la API en el mismo dominio.
    const distDir = path.resolve(process.cwd(), 'dist');

    // Los archivos de /assets llevan un hash de contenido en el nombre: si el
    // contenido cambia, cambia la URL. Se pueden cachear para siempre sin revalidar.
    app.use(
      '/assets',
      express.static(path.join(distDir, 'assets'), {
        index: false,
        immutable: true,
        maxAge: '1y',
      }),
    );

    app.use(express.static(distDir, { index: false, maxAge: 0 }));

    // index.html apunta a esos nombres con hash, así que nunca se cachea: si
    // quedara pegado, el navegador pediría archivos que ya no existen.
    app.get('/{*splat}', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[api] Error no controlado', error);
    res.status(500).json({ error: 'Ocurrió un error inesperado.' });
  });

  return app;
}
