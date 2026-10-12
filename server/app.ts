import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import cookieParser from 'cookie-parser';
import { PRODUCTS } from '../shared/products.js';
import { requireAuth } from './middleware/auth.js';
import { authRouter } from './routes/auth.js';
import { checkoutRouter } from './routes/checkout.js';
import { adminRouter, ordersRouter } from './routes/orders.js';
import { webhooksRouter } from './routes/webhooks.js';

export function createApp(options: { serveStatic?: boolean } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(express.json({ limit: '50kb' }));
  app.use(cookieParser());

  app.use('/api/auth', authRouter);
  app.get('/api/products', requireAuth, (_req, res) => {
    res.json({ products: PRODUCTS });
  });
  app.use('/api/checkout', checkoutRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/webhooks', webhooksRouter);

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada.' });
  });

  if (options.serveStatic) {
    // Producción: Express sirve el build de Vite y la API en el mismo dominio.
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir, { index: false, maxAge: '1h' }));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[api] Error no controlado', error);
    res.status(500).json({ error: 'Ocurrió un error inesperado.' });
  });

  return app;
}
