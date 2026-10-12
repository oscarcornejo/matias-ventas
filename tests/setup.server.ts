// Variables de entorno ficticias para los tests del servidor (no son credenciales reales).
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.SESSION_SECRET = 'secreto-de-prueba-con-mas-de-32-caracteres!!';
process.env.ADMIN_PASSWORD = 'clave-de-prueba';
process.env.MP_ACCESS_TOKEN = 'TEST-token';
process.env.MP_WEBHOOK_SECRET = 'webhook-secret-de-prueba';
process.env.APP_URL = 'https://mati-ventas.test';
