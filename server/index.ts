if (process.env.NODE_ENV !== 'production') {
  try {
    process.loadEnvFile();
  } catch {
    // Sin .env: se usan las variables del entorno.
  }
}

const { getEnv } = await import('./env.js');
const { createApp } = await import('./app.js');
const { prisma } = await import('./db.js');
const { ensureAdmin } = await import('./lib/admin.js');

const env = getEnv();
await ensureAdmin(prisma, env.ADMIN_PASSWORD);

const app = createApp({ serveStatic: env.NODE_ENV === 'production' });
app.listen(env.PORT, () => {
  console.log(`API de Mati Ventas escuchando en http://localhost:${env.PORT}`);
});
