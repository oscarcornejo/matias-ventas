import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { Prisma } from '@prisma/client';
import { createPrismaMock } from './helpers';

const { prismaMock } = vi.hoisted(() => ({ prismaMock: {} as ReturnType<typeof createPrismaMock> }));

vi.mock('../../server/db.js', () => ({ prisma: prismaMock }));

const { createApp } = await import('../../server/app');
const { hashPassword } = await import('../../server/lib/passwords');
const { SESSION_COOKIE } = await import('../../server/lib/session');
const { ADMIN_EMAIL } = await import('../../shared/permissions');

const app = createApp();
const PASSWORD = 'dulces-2026';
/** Se calcula una sola vez: bcrypt con costo 12 es lento a propósito. */
let passwordHash: string;

beforeAll(async () => {
  passwordHash = await hashPassword(PASSWORD);
});

beforeEach(() => {
  Object.assign(prismaMock, createPrismaMock());
});

function duplicateEmailError() {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
  });
}

describe('GET /api/productos', () => {
  it('el catálogo es público: se ve sin iniciar sesión', async () => {
    prismaMock.product.findMany.mockResolvedValue([
      { id: 'p-chirlito', name: 'Chirlito Suffle', price: 300, emoji: '🍪', visible: true, position: 1, images: [] },
    ]);
    prismaMock.promo.findMany.mockResolvedValue([]);

    const response = await request(app).get('/api/productos');

    expect(response.status).toBe(200);
    expect(response.body.items).toEqual([
      { kind: 'producto', id: 'p-chirlito', name: 'Chirlito Suffle', price: 300, emoji: '🍪', images: [] },
    ]);
  });

  it('entrega productos y combos mezclados por su posición', async () => {
    prismaMock.product.findMany.mockResolvedValue([
      { id: 'p-chirlito', name: 'Chirlito Suffle', price: 300, emoji: '🍪', visible: true, position: 1, images: [] },
      { id: 'p-grosso', name: 'Grosso Crunch', price: 200, emoji: '🍬', visible: true, position: 3, images: [] },
    ]);
    prismaMock.promo.findMany.mockResolvedValue([
      {
        id: 'c-recreo',
        name: 'Combo recreo',
        price: 600,
        emoji: '🎁',
        visible: true,
        position: 2,
        images: [],
        items: [
          { quantity: 1, product: { id: 'p-chirlito', name: 'Chirlito Suffle', emoji: '🍪', price: 300, visible: true } },
          { quantity: 2, product: { id: 'p-grosso', name: 'Grosso Crunch', emoji: '🍬', price: 200, visible: true } },
        ],
      },
    ]);

    const { body } = await request(app).get('/api/productos');

    expect(body.items.map((i: { id: string }) => i.id)).toEqual(['p-chirlito', 'c-recreo', 'p-grosso']);
    // El ahorro se calcula para mostrarlo; el precio que se cobra es el del combo.
    expect(body.items[1]).toMatchObject({ kind: 'combo', price: 600, fullPrice: 700 });
  });

  it('esconde un combo si alguno de sus productos está oculto', async () => {
    prismaMock.product.findMany.mockResolvedValue([]);
    prismaMock.promo.findMany.mockResolvedValue([
      {
        id: 'c-recreo',
        name: 'Combo recreo',
        price: 600,
        emoji: '🎁',
        visible: true,
        position: 1,
        images: [],
        items: [
          { quantity: 1, product: { id: 'p-grosso', name: 'Grosso Crunch', emoji: '🍬', price: 200, visible: false } },
        ],
      },
    ]);

    const { body } = await request(app).get('/api/productos');
    expect(body.items).toEqual([]);
  });

  it('solo entrega lo visible', async () => {
    prismaMock.product.findMany.mockResolvedValue([]);
    prismaMock.promo.findMany.mockResolvedValue([]);
    await request(app).get('/api/productos');
    // El filtro lo aplica la consulta, no el navegador.
    expect(prismaMock.product.findMany.mock.calls[0]![0]).toMatchObject({ where: { visible: true } });
    expect(prismaMock.promo.findMany.mock.calls[0]![0]).toMatchObject({ where: { visible: true } });
  });
});

describe('POST /api/auth/register', () => {
  it('crea la cuenta del cliente, normaliza el correo y guarda solo el hash', async () => {
    prismaMock.user.create.mockImplementation(async ({ data }: { data: { email: string } }) => ({
      id: 'u-nueva',
      ...data,
    }));

    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: '  Ana@Correo.CL ', password: PASSWORD });

    expect(response.status).toBe(201);
    expect(response.body.user).toEqual({ id: 'u-nueva', email: 'ana@correo.cl', role: 'CLIENTE' });

    const { data } = prismaMock.user.create.mock.calls[0]![0] as {
      data: { email: string; role: string; passwordHash: string };
    };
    expect(data.email).toBe('ana@correo.cl');
    expect(data.role).toBe('CLIENTE');
    // La contraseña nunca se guarda en claro.
    expect(data.passwordHash).not.toBe(PASSWORD);
    expect(data.passwordHash.startsWith('$2')).toBe(true);
  });

  it('deja la sesión iniciada al registrarse', async () => {
    prismaMock.user.create.mockResolvedValue({ id: 'u-nueva', email: 'ana@correo.cl', role: 'CLIENTE' });

    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'ana@correo.cl', password: PASSWORD });

    const cookies = response.headers['set-cookie'] as unknown as string[];
    expect(cookies.join(';')).toContain(SESSION_COOKIE);
  });

  it('rechaza una contraseña de menos de 8 caracteres y no crea la cuenta', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'ana@correo.cl', password: 'corta' });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/al menos 8 caracteres/);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it('rechaza un correo inválido', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'no-es-un-correo', password: PASSWORD });

    expect(response.status).toBe(400);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it('responde 409 si el correo ya tiene cuenta', async () => {
    prismaMock.user.create.mockRejectedValue(duplicateEmailError());

    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'ana@correo.cl', password: PASSWORD });

    expect(response.status).toBe(409);
    expect(response.body.error).toMatch(/Ya existe una cuenta/);
  });

  it('no permite registrar el correo del administrador', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: ADMIN_EMAIL, password: PASSWORD });

    expect(response.status).toBe(409);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });
});

describe('POST /api/auth/login', () => {
  it('el cliente ahora necesita contraseña: sin ella responde 400', async () => {
    const response = await request(app).post('/api/auth/login').send({ email: 'ana@correo.cl' });

    expect(response.status).toBe(400);
    expect(response.body.needsPassword).toBe(true);
    // Ya no se crean cuentas al entrar: para eso está /register.
    expect(prismaMock.user.create).not.toHaveBeenCalled();
    expect(prismaMock.user.upsert).not.toHaveBeenCalled();
  });

  it('un correo sin cuenta no entra y no crea la cuenta', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'desconocida@correo.cl', password: PASSWORD });

    expect(response.status).toBe(401);
    expect(response.body.error).toMatch(/Correo o contraseña incorrectos/);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
    expect(prismaMock.user.upsert).not.toHaveBeenCalled();
  });

  it('rechaza la contraseña equivocada con el mismo mensaje', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u-cliente',
      email: 'ana@correo.cl',
      role: 'CLIENTE',
      passwordHash,
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ana@correo.cl', password: 'otra-clave' });

    expect(response.status).toBe(401);
    expect(response.body.error).toMatch(/Correo o contraseña incorrectos/);
  });

  it('una cuenta sin contraseña guardada no puede entrar', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u-antigua',
      email: 'antigua@correo.cl',
      role: 'CLIENTE',
      passwordHash: null,
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'antigua@correo.cl', password: PASSWORD });

    expect(response.status).toBe(401);
  });

  it('el cliente entra con su contraseña correcta', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u-cliente',
      email: 'ana@correo.cl',
      role: 'CLIENTE',
      passwordHash,
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ana@correo.cl', password: PASSWORD });

    expect(response.status).toBe(200);
    expect(response.body.user).toEqual({ id: 'u-cliente', email: 'ana@correo.cl', role: 'CLIENTE' });
  });

  it('el administrador entra con su contraseña y queda con perfil ADMIN', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u-admin',
      email: ADMIN_EMAIL,
      role: 'ADMIN',
      passwordHash,
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: ADMIN_EMAIL, password: PASSWORD });

    expect(response.status).toBe(200);
    expect(response.body.user.role).toBe('ADMIN');
  });

  it('el perfil se deriva del correo: un rol ADMIN guardado en otra cuenta no sirve', async () => {
    // Fila manipulada en la base: el correo no es el del admin, así que entra como CLIENTE.
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u-falsa',
      email: 'ana@correo.cl',
      role: 'ADMIN',
      passwordHash,
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ana@correo.cl', password: PASSWORD });

    expect(response.status).toBe(200);
    expect(response.body.user.role).toBe('CLIENTE');
  });
});
