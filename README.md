# Mati Ventas 🍪🍬🍫

Tienda web de dulces con pago mediante **Mercado Pago Checkout Pro en pesos chilenos (CLP)**.

- **Frontend:** React 19 + Vite 7, TypeScript estricto, SCSS Modules, React Router, Zustand (carrito persistido en el navegador).
- **Backend:** Express 5 + Prisma + PostgreSQL, SDK oficial `mercadopago`.
- **Tests:** Vitest + React Testing Library + Supertest.

| Producto            | Precio |
| ------------------- | ------ |
| 🍪 Chirlito Suffle  | $300   |
| 🍬 Grosso Crunch    | $200   |
| 🍫 Alfajor Panchito | $400   |

## Perfiles

| Perfil            | Acceso                                                | Puede                                                                  |
| ----------------- | ----------------------------------------------------- | ---------------------------------------------------------------------- |
| **Administrador** | `matiasalecornejo@gmail.com` + contraseña (`ADMIN_PASSWORD`) | Ver productos y todas las compras con su estado de pago. **No puede comprar** (la UI lo oculta y la API responde `403`). |
| **Cliente**       | Solo correo electrónico (la cuenta se crea al entrar) | Ver productos, usar el carrito, comprar y ver sus propias compras.      |

La sesión es una cookie `httpOnly` firmada (JWT HS256). La contraseña del administrador nunca se guarda en texto plano: al arrancar el servidor (o con `npm run db:seed`) se guarda solo su hash bcrypt.

---

## 1. Requisitos

- **Node.js 20.19 o superior** (recomendado 22 LTS; ver `.nvmrc`). Con nvm: `nvm install && nvm use`.
- **PostgreSQL 16**: con Docker (`docker compose`), [Postgres.app](https://postgresapp.com/), Homebrew (`brew install postgresql@16`) o una base gratuita en la nube (Neon, Supabase).
- Una cuenta de **Mercado Pago Chile**.

## 2. Instalación

```bash
npm install
cp .env.example .env          # luego completa los valores (ver sección 3)

npm run db:up                 # levanta PostgreSQL con Docker (omite si usas otro Postgres)
npm run db:migrate            # crea las tablas
npm run db:seed               # crea el administrador con el hash de ADMIN_PASSWORD

npm run dev                   # web en http://localhost:5173 · API en http://localhost:3000
```

En desarrollo, Vite redirige `/api/*` hacia Express, así que siempre debes abrir la app en **http://localhost:5173** (o en la URL de tu túnel, ver sección 4).

### Scripts

| Script               | Qué hace                                                        |
| -------------------- | --------------------------------------------------------------- |
| `npm run dev`        | Frontend (Vite) + API (tsx watch) en paralelo                   |
| `npm test`           | Ejecuta todos los tests                                         |
| `npm run typecheck`  | Revisa los tipos del frontend y del servidor                    |
| `npm run build`      | Compila el frontend (`dist/`) y el servidor (`dist-server/`)    |
| `npm start`          | Inicia en modo producción (Express sirve la app y la API)       |
| `npm run db:migrate` | Crea o aplica migraciones en desarrollo                         |
| `npm run db:deploy`  | Aplica migraciones en producción                                |
| `npm run db:seed`    | Crea o actualiza el administrador                               |

## 3. Variables de entorno

| Variable            | Descripción                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`      | Conexión a PostgreSQL                                                                             |
| `SESSION_SECRET`    | Clave para firmar la cookie (mín. 32 caracteres). Genera una con `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `ADMIN_PASSWORD`    | Contraseña del administrador (mín. 8 caracteres). Solo se guarda su hash.                         |
| `MP_ACCESS_TOKEN`   | Access Token de Mercado Pago                                                                      |
| `MP_WEBHOOK_SECRET` | Clave secreta de los Webhooks de Mercado Pago (para validar la firma)                             |
| `APP_URL`           | URL pública de la app, sin `/` final. Se usa para las URLs de retorno y del webhook.              |
| `PORT`              | Puerto de la API (por defecto `3000`)                                                             |

`.env` está en `.gitignore`: **nunca subas secretos al repositorio**.

### Credenciales de prueba de Mercado Pago (Chile)

1. Entra a <https://www.mercadopago.cl/developers/panel> con tu cuenta y crea una aplicación de tipo **Pagos online → Checkout Pro**.
2. En la aplicación, ve a **Cuentas de prueba** y crea dos usuarios de prueba con país **Chile**:
   - **Vendedor**: recibe los pagos.
   - **Comprador**: con el que pagarás.
3. Inicia sesión (en una ventana de incógnito) con el **usuario de prueba vendedor**, crea una aplicación en su panel y copia sus **Credenciales de producción → Access Token** (`APP_USR-...`) a `MP_ACCESS_TOKEN`.
   _Al ser credenciales de un usuario de prueba, no mueven dinero real._
4. Para pagar, abre el checkout en otra ventana de incógnito e inicia sesión con el **usuario de prueba comprador**.
5. Usa las tarjetas de prueba de Chile que aparecen en la documentación ([Tarjetas de prueba](https://www.mercadopago.cl/developers/es/docs/checkout-pro/additional-content/your-integrations/test/cards)), por ejemplo Mastercard `5416 7526 0258 2580` o Visa `4168 8188 4444 7115`, CVV `123` y cualquier fecha futura. **El nombre del titular** define el resultado:

   | Titular | Resultado              | Página de retorno  |
   | ------- | ---------------------- | ------------------ |
   | `APRO`  | Pago aprobado          | `/pago/aprobado`   |
   | `CONT`  | Pago pendiente         | `/pago/pendiente`  |
   | `OTHE`  | Rechazado (error general) | `/pago/rechazado` |
   | `FUND`  | Rechazado (fondos insuficientes) | `/pago/rechazado` |

> Las cuentas de prueba y las credenciales deben ser **del mismo país (Chile)**. Si se mezclan países, Mercado Pago rechaza la preferencia. Todos los montos se envían en `CLP` y como enteros.

## 4. Probar el webhook en local

Mercado Pago necesita una URL **pública** para enviar notificaciones y para las URLs de retorno. Usa un túnel hacia el puerto **5173** (Vite redirige `/api` a Express):

```bash
# Opción A: Cloudflare (sin cuenta)
cloudflared tunnel --url http://localhost:5173

# Opción B: ngrok
ngrok http 5173
```

1. Copia la URL `https://...` que te entrega el túnel en `APP_URL` dentro de `.env` y reinicia `npm run dev`.
2. En el panel de tu aplicación de Mercado Pago, ve a **Webhooks → Configurar notificaciones**:
   - **URL de prueba**: `https://TU-TUNEL/api/webhooks/mercadopago`
   - **Eventos**: marca **Pagos**.
   - Guarda y copia la **clave secreta** que se genera en `MP_WEBHOOK_SECRET`. Reinicia el servidor.
3. Abre la app **desde la URL del túnel** (la cookie de sesión se asocia a ese dominio), entra como cliente, agrega productos y presiona **Comprar**.
4. Paga con el comprador de prueba. En la terminal verás la notificación y la orden cambiará a **Pagada** o **Rechazada** (revísalo en "Mis compras" o como administrador en "Compras").

También puedes usar **Simular notificación** en el panel de Webhooks. Las notificaciones sin firma válida reciben `401`.

**Cómo se valida:** el servidor lee el encabezado `x-signature` (`ts=...,v1=...`), arma el manifiesto `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`, calcula el HMAC-SHA256 con `MP_WEBHOOK_SECRET` y lo compara en tiempo constante. Luego consulta el pago en la API de Mercado Pago (nunca confía en el cuerpo de la notificación) y, antes de marcar la orden como pagada, verifica que la moneda sea `CLP` y que el monto coincida con el total de la orden.

## 5. Despliegue (ejemplo: Render)

La app se despliega como **un solo servicio**: Express sirve el build de React y la API en el mismo dominio.

1. Crea una base **PostgreSQL** (Render, Neon o Supabase) y copia su `DATABASE_URL`.
2. Crea un **Web Service** conectado a tu repositorio:
   - **Build command:** `npm ci --include=dev && npm run build && npm run db:deploy`
   - **Start command:** `npm start`
   - **Variables de entorno:** `NODE_ENV=production`, `DATABASE_URL`, `SESSION_SECRET` (nueva y distinta a la de desarrollo), `ADMIN_PASSWORD`, `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `APP_URL=https://tu-dominio`.
3. Al arrancar, el servidor crea o actualiza el administrador con el hash de `ADMIN_PASSWORD`.
4. En Mercado Pago, configura la **URL de producción** del webhook (`https://tu-dominio/api/webhooks/mercadopago`) y usa las **credenciales de producción** de tu cuenta real cuando quieras recibir pagos reales.

Funciona igual en Railway, Fly.io o cualquier servicio que ejecute Node 20.19+.
En producción la cookie se marca `Secure`, por lo que la app debe servirse con HTTPS.

## 6. Tests

```bash
npm test
```

- `tests/web/cart.store.test.ts`: agregar, subir y bajar cantidades, eliminar, total, persistencia y datos corruptos.
- `tests/web/Cart.test.tsx`: carrito con React Testing Library, uso con teclado y botón "Comprar".
- `tests/web/AdminNoCompra.test.tsx`: el administrador no ve carrito, "Agregar" ni "Comprar".
- `tests/server/checkout.test.ts`: la API responde `403` al administrador (incluso con un token manipulado), ignora precios enviados por el navegador y crea la orden `PENDIENTE`.
- `tests/server/pricing.test.ts`: precios en CLP, enteros, y armado de la preferencia.
- `tests/server/webhook.test.ts`: validación de firma y conciliación de pagos (montos, moneda e idempotencia).

## Estructura

```
├── docs/              CONTINUAR.md: guía para seguir el proyecto en otro equipo
├── prisma/            schema.prisma, migraciones y seed del administrador
├── shared/            catálogo y precios, permisos, tipos y formato CLP (front + back)
├── server/            API Express: auth, checkout, órdenes, webhook de Mercado Pago
├── src/               app React: páginas, componentes, carrito (Zustand), estilos SCSS
└── tests/             tests web (jsdom) y de servidor (node)
```
