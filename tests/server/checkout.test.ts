import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { SignJWT } from 'jose';
import { createPrismaMock, sessionCookie } from './helpers';

const { prismaMock, createPreferenceMock } = vi.hoisted(() => ({
  prismaMock: {} as ReturnType<typeof createPrismaMock>,
  createPreferenceMock: vi.fn(),
}));

vi.mock('../../server/db.js', () => ({ prisma: prismaMock }));
vi.mock('../../server/lib/mercadopago.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../server/lib/mercadopago')>()),
  createPreference: createPreferenceMock,
}));

const { createApp } = await import('../../server/app');
const { SESSION_COOKIE } = await import('../../server/lib/session');
const { ADMIN_EMAIL } = await import('../../shared/permissions');

const app = createApp();

describe('POST /api/checkout', () => {
  beforeEach(() => {
    Object.assign(prismaMock, createPrismaMock());
    createPreferenceMock.mockReset();
    prismaMock.order.create.mockImplementation(async ({ data }: { data: { total: number } }) => ({
      id: 'orden-123',
      ...data,
    }));
    prismaMock.order.update.mockResolvedValue({});
    // El catálogo vive en la base: el precio que se cobra sale de aquí.
    prismaMock.product.findMany.mockImplementation(
      async ({ where }: { where: { id: { in: string[] } } }) =>
        [
          { id: 'p-chirlito', name: 'Chirlito Suffle', price: 300 },
          { id: 'p-grosso', name: 'Grosso Crunch', price: 200 },
          { id: 'p-alfajor', name: 'Alfajor Panchito', price: 400 },
        ].filter((product) => where.id.in.includes(product.id)),
    );
    createPreferenceMock.mockResolvedValue({
      id: 'pref-1',
      initPoint: 'https://www.mercadopago.cl/checkout/v1/redirect?pref_id=pref-1',
    });
  });

  describe('regla: el administrador no puede comprar (servidor)', () => {
    it('rechaza con 403 la compra del administrador y no crea orden ni preferencia', async () => {
      const response = await request(app)
        .post('/api/checkout')
        .set('Cookie', await sessionCookie('admin'))
        .send({ items: [{ productId: 'p-chirlito', quantity: 1 }] });

      expect(response.status).toBe(403);
      expect(response.body.error).toMatch(/administrador no puede realizar compras/);
      expect(prismaMock.order.create).not.toHaveBeenCalled();
      expect(createPreferenceMock).not.toHaveBeenCalled();
    });

    it('un token manipulado que dice "CLIENTE" con el correo del admin sigue siendo admin', async () => {
      // Firmado con la clave correcta pero con rol falso: el rol se recalcula desde el correo.
      const forged = await new SignJWT({ email: ADMIN_EMAIL, role: 'CLIENTE' })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject('u-admin')
        .setExpirationTime('1h')
        .sign(new TextEncoder().encode(process.env.SESSION_SECRET));

      const response = await request(app)
        .post('/api/checkout')
        .set('Cookie', `${SESSION_COOKIE}=${forged}`)
        .send({ items: [{ productId: 'p-chirlito', quantity: 1 }] });

      expect(response.status).toBe(403);
      expect(prismaMock.order.create).not.toHaveBeenCalled();
    });
  });

  it('sin sesión responde 401', async () => {
    const response = await request(app)
      .post('/api/checkout')
      .send({ items: [{ productId: 'p-chirlito', quantity: 1 }] });
    expect(response.status).toBe(401);
  });

  it('con una cookie con firma inválida responde 401', async () => {
    const forged = await new SignJWT({ email: 'cliente@correo.cl', role: 'CLIENTE' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('u-cliente')
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode('otra-clave-que-no-es-la-del-servidor-1234'));

    const response = await request(app)
      .post('/api/checkout')
      .set('Cookie', `${SESSION_COOKIE}=${forged}`)
      .send({ items: [{ productId: 'p-chirlito', quantity: 1 }] });
    expect(response.status).toBe(401);
  });

  it('el cliente compra: precios calculados en el servidor, orden PENDIENTE y redirección al init_point', async () => {
    const response = await request(app)
      .post('/api/checkout')
      .set('Cookie', await sessionCookie('cliente'))
      .send({
        items: [
          // Precio manipulado desde el navegador: debe ignorarse.
          { productId: 'p-chirlito', quantity: 2, price: 1, unitPrice: 1 },
          { productId: 'p-alfajor', quantity: 1 },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      orderId: 'orden-123',
      initPoint: 'https://www.mercadopago.cl/checkout/v1/redirect?pref_id=pref-1',
    });

    expect(prismaMock.order.create).toHaveBeenCalledWith({
      data: {
        userId: 'u-cliente',
        status: 'PENDIENTE',
        total: 1000, // 2 × 300 + 1 × 400
        items: {
          create: [
            { productId: 'p-chirlito', name: 'Chirlito Suffle', unitPrice: 300, quantity: 2 },
            { productId: 'p-alfajor', name: 'Alfajor Panchito', unitPrice: 400, quantity: 1 },
          ],
        },
      },
    });
    expect(createPreferenceMock).toHaveBeenCalledWith('orden-123', [
      { productId: 'p-chirlito', name: 'Chirlito Suffle', unitPrice: 300, quantity: 2 },
      { productId: 'p-alfajor', name: 'Alfajor Panchito', unitPrice: 400, quantity: 1 },
    ]);
    expect(prismaMock.order.update).toHaveBeenCalledWith({
      where: { id: 'orden-123' },
      data: { mpPreferenceId: 'pref-1' },
    });
  });

  it('rechaza productos inexistentes y cantidades inválidas', async () => {
    const cookie = await sessionCookie('cliente');
    const unknown = await request(app)
      .post('/api/checkout')
      .set('Cookie', cookie)
      .send({ items: [{ productId: 'producto-falso', quantity: 1 }] });
    expect(unknown.status).toBe(400);

    const negative = await request(app)
      .post('/api/checkout')
      .set('Cookie', cookie)
      .send({ items: [{ productId: 'p-grosso', quantity: -3 }] });
    expect(negative.status).toBe(400);

    const empty = await request(app).post('/api/checkout').set('Cookie', cookie).send({ items: [] });
    expect(empty.status).toBe(400);
    expect(prismaMock.order.create).not.toHaveBeenCalled();
  });

  it('si Mercado Pago falla, elimina la orden y responde 502', async () => {
    createPreferenceMock.mockRejectedValue(new Error('timeout'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    prismaMock.order.delete.mockResolvedValue({});

    const response = await request(app)
      .post('/api/checkout')
      .set('Cookie', await sessionCookie('cliente'))
      .send({ items: [{ productId: 'p-grosso', quantity: 1 }] });

    expect(response.status).toBe(502);
    expect(prismaMock.order.delete).toHaveBeenCalledWith({ where: { id: 'orden-123' } });
  });
});
