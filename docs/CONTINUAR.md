# Mati Ventas: guía para continuar el proyecto

Actualizado: 2026-10-12. Versión en línea (puede tener cambios posteriores): https://claude.ai/code/artifact/821b51c7-66f5-4b1e-ac40-c4a233aaa526

## Estado actual

El código de la tienda está completo, pasan los 43 tests, el chequeo de tipos y el build de producción, pero **nunca se ha probado con una base PostgreSQL real ni con un pago real de Mercado Pago**. Esos son los próximos pasos.

Mati Ventas es una tienda web de dulces en español de Chile: React + Vite en el frontend, una API Express con Prisma y PostgreSQL, y pagos con Mercado Pago Checkout Pro en pesos chilenos (CLP).

| Área | Estado | Cómo se verificó |
| --- | --- | --- |
| Login de cliente (solo correo) y de admin (correo + contraseña) | Hecho | Tests de servidor y revisión manual del código |
| Regla "el administrador no puede comprar" | Hecho | Tests de UI y de API (403). Se probó quitando el bloqueo: los tests fallaron, así que sí lo detectan |
| Carrito con Zustand persistido | Hecho | Tests de store y de componente, incluido el uso con teclado |
| Checkout con precios calculados en el servidor | Hecho | Tests con Mercado Pago simulado |
| Webhook con validación de firma | Hecho | Tests con firmas válidas e inválidas; el servidor compilado responde 401 sin firma |
| Páginas de retorno (aprobado, pendiente, rechazado) | Hecho | Solo revisión de código |
| Base de datos PostgreSQL | Esquema y migración inicial listos | **Sin probar contra una base real** |
| Pago real en el sandbox de Mercado Pago | Pendiente | Faltan credenciales de prueba |
| Repositorio remoto (GitHub) | Pendiente | Hay `git init`, pero ningún commit |

Productos y precios fijos (en `shared/products.ts`): Chirlito Suffle $300, Grosso Crunch $200 y Alfajor Panchito $400. El único administrador es `matiasalecornejo@gmail.com`.

## Llevar el código a otra computadora

Hay que subir el código a un repositorio privado de GitHub y clonarlo en el otro equipo. El archivo `.env` (con secretos) **nunca** se sube; se vuelve a crear a mano en cada equipo.

**En el computador original** (una sola vez):

1. Crea un repositorio **privado** vacío en https://github.com/new (por ejemplo `mati-ventas`), sin README ni .gitignore.
2. Confirma que `.env` no se va a subir. `git status` no debe mostrar `.env`; ya está en `.gitignore`.
3. Haz el primer commit y súbelo:

```bash
cd ~/Documents/apps_matias
git add .
git status            # revisa: no debe aparecer .env, node_modules, dist ni dist-server
git commit -m "Mati Ventas: versión inicial"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/mati-ventas.git
git push -u origin main
```

**En la otra computadora:**

```bash
git clone https://github.com/TU_USUARIO/mati-ventas.git
cd mati-ventas
```

Luego sigue la sección "Levantar el proyecto en local". Los valores secretos de `.env` (contraseña del admin, credenciales de Mercado Pago) pásalos por un gestor de contraseñas, nunca por el repositorio ni por chat. `SESSION_SECRET` puede ser distinto en cada equipo: solo obliga a volver a iniciar sesión.

Qué queda fuera del repositorio y se regenera solo:

| Carpeta o archivo | Por qué no se sube | Cómo se recrea |
| --- | --- | --- |
| `.env` | Contiene secretos | `cp .env.example .env` y completarlo |
| `node_modules/` | Dependencias pesadas | `npm install` |
| `dist/` y `dist-server/` | Resultado del build | `npm run build` |
| Datos de la base | Viven en PostgreSQL, no en archivos del proyecto | `npm run db:migrate` + `npm run db:seed` (se parte con la base vacía) |

## Levantar el proyecto en local

Se necesitan Node 22 y un PostgreSQL; con eso, cuatro comandos dejan la tienda corriendo en http://localhost:5173. Los pasos son iguales en cualquier Mac; en Windows cambian solo los instaladores.

### 1. Instalar Node 22

El proyecto exige **Node 20.19 o superior** (recomendado 22 LTS; está fijado en `.nvmrc`). El computador original tiene Node 14.15.1, que no sirve.

- **Opción simple:** descarga el instalador `.pkg` de **Node 22 LTS** desde https://nodejs.org e instálalo. Cierra y abre la terminal y comprueba con `node -v`, que debe decir `v22.x`. Este instalador reemplaza el Node que tengas.
- **Si otros proyectos dependen de otra versión de Node**, usa nvm:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
# cierra y abre la terminal
cd <carpeta-del-proyecto> && nvm install && nvm use
```

En Windows: instalador `.msi` de nodejs.org, o nvm-windows.

En el computador original, `brew install node@22` falla porque las Command Line Tools de Xcode están desactualizadas para macOS 15. Se arregla desde Ajustes del Sistema → Actualización de software, o con `sudo rm -rf /Library/Developer/CommandLineTools && sudo xcode-select --install`.

### 2. Tener un PostgreSQL

Elige una opción:

| Opción | Pasos | `DATABASE_URL` |
| --- | --- | --- |
| **Postgres.app** (local, Mac) | Descárgala de https://postgresapp.com, ábrela y presiona **Initialize** | `postgresql://TU_USUARIO_DEL_MAC@localhost:5432/mati_ventas?schema=public` (sin contraseña; en el equipo original el usuario es `oscar`) |
| **Neon** (nube, gratis) | Crea un proyecto en https://neon.tech | La *connection string* que entrega Neon |
| **Docker** | `npm run db:up` (usa `docker-compose.yml`) | `postgresql://mati:mati@localhost:5432/mati_ventas?schema=public` |

No hace falta crear la base a mano: `npm run db:migrate` la crea si no existe. El equipo original no tiene Docker instalado.

### 3. Configurar `.env`

```bash
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"   # copia el resultado
```

Abre `.env` y completa:

```bash
DATABASE_URL="postgresql://oscar@localhost:5432/mati_ventas?schema=public"
SESSION_SECRET="<lo que imprimió el comando anterior>"
ADMIN_PASSWORD="<una contraseña de al menos 8 caracteres>"
MP_ACCESS_TOKEN="pendiente"
MP_WEBHOOK_SECRET="pendiente"
APP_URL="http://localhost:5173"
```

Los valores `pendiente` sirven para levantar la app y navegar sin credenciales de Mercado Pago; lo único que no funciona es "Comprar". El servidor valida el `.env` al arrancar y, si falta algo, muestra qué variable corregir.

### 4. Instalar, crear las tablas y arrancar

```bash
npm install
npm run db:migrate     # crea la base y las tablas
npm run db:seed        # crea el administrador (guarda solo el hash de ADMIN_PASSWORD)
npm run dev            # web en :5173 y API en :3000
```

Abre **http://localhost:5173** y prueba:

- **Como cliente:** entra con cualquier correo, sin contraseña.
- **Como administrador:** entra con `matiasalecornejo@gmail.com` y la contraseña de `ADMIN_PASSWORD`.

Para detener la app presiona `Ctrl + C`. Siempre abre la app por el puerto 5173 (o por la URL del túnel): Vite reenvía `/api` a Express, y así la cookie de sesión funciona.

### Comandos del proyecto

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Frontend (Vite) + API (tsx watch) en paralelo |
| `npm test` | Los 43 tests (web y servidor) |
| `npm run typecheck` | Tipos del frontend y del servidor |
| `npm run build` | Compila a `dist/` y `dist-server/` |
| `npm start` | Producción: Express sirve la app y la API |
| `npm run db:migrate` | Crea o aplica migraciones en desarrollo |
| `npm run db:deploy` | Aplica migraciones en producción |
| `npm run db:seed` | Crea o actualiza el administrador |

## Probar los pagos con Mercado Pago (Chile, CLP)

Para que "Comprar" funcione se necesitan credenciales de un usuario de prueba vendedor de Chile, una URL pública (túnel) y el webhook configurado en el panel. Todo está también en las secciones 3 y 4 del `README.md`.

### Credenciales de prueba

1. Entra a https://www.mercadopago.cl/developers/panel y crea una aplicación **Pagos online → Checkout Pro**.
2. En **Cuentas de prueba**, crea dos usuarios con país **Chile**: un **vendedor** y un **comprador**.
3. En una ventana de incógnito, inicia sesión con el **vendedor de prueba**, crea una aplicación en su panel y copia sus **Credenciales de producción → Access Token** (`APP_USR-...`) a `MP_ACCESS_TOKEN`. Como son de un usuario de prueba, no mueven dinero real.
4. Credenciales y usuarios deben ser del mismo país (Chile); si se mezclan países, Mercado Pago rechaza la preferencia.

### Túnel y webhook en local

1. Con `npm run dev` corriendo, abre un túnel hacia el puerto **5173** (Vite reenvía `/api` a Express):

   ```bash
   cloudflared tunnel --url http://localhost:5173     # o: ngrok http 5173
   ```

2. Copia la URL `https://...` del túnel en `APP_URL` dentro de `.env`.
3. En el panel de la aplicación: **Webhooks → Configurar notificaciones**. URL de prueba: `https://TU-TUNEL/api/webhooks/mercadopago`. Evento: **Pagos**. Guarda y copia la **clave secreta** en `MP_WEBHOOK_SECRET`.
4. Reinicia `npm run dev` y abre la app **desde la URL del túnel**, no desde localhost: la cookie de sesión queda asociada a ese dominio.
5. Entra como cliente, agrega productos, presiona **Comprar** y paga en incógnito con el **comprador de prueba**.
6. Revisa que la orden cambie a Pagada o Rechazada en "Mis compras" y, como administrador, en "Compras".

Vite solo acepta túneles de `*.ngrok-free.app`, `*.ngrok.app` y `*.trycloudflare.com` (`server.allowedHosts` en `vite.config.ts`). Otro proveedor hay que agregarlo ahí.

### Tarjetas de prueba

El **nombre del titular** define el resultado. Usa CVV `123` y cualquier fecha futura. Los números pueden cambiar: verifícalos en la [documentación de tarjetas de prueba](https://www.mercadopago.cl/developers/es/docs/checkout-pro/additional-content/your-integrations/test/cards).

| Titular | Resultado | Página de retorno |
| --- | --- | --- |
| `APRO` | Pago aprobado | `/pago/aprobado` |
| `CONT` | Pago pendiente | `/pago/pendiente` |
| `OTHE` | Rechazado (error general) | `/pago/rechazado` |
| `FUND` | Rechazado (fondos insuficientes) | `/pago/rechazado` |

Tarjetas de ejemplo: Mastercard `5416 7526 0258 2580` y Visa `4168 8188 4444 7115`.

### Qué revisar en la primera prueba real

- [ ] La preferencia se crea sin error (si falla, el servidor responde 502 y borra la orden).
- [ ] Mercado Pago redirige a `/pago/aprobado?orden=...`. Con `APP_URL` en https se activa `auto_return`; en http no.
- [ ] Llega el webhook con firma válida y la orden pasa a PAGADA. Si responde 401, la clave secreta no coincide.
- [ ] En la consola no aparece `El monto o la moneda del pago no coinciden con la orden`.
- [ ] El mismo aviso repetido no cambia nada (idempotencia).

## Arquitectura

Una sola app Node: en desarrollo, Vite (:5173) reenvía `/api` a Express (:3000); en producción, Express sirve el build de React y la API en el mismo dominio. El servidor es el único que decide precios, permisos y el estado de las órdenes.

```
 Navegador (React)            Servidor Express                 Mercado Pago
 ─────────────────            ────────────────                 ────────────
 Carrito (Zustand) ──POST /api/checkout {productId, quantity}──▶
                              precios desde shared/products.ts
                              Order PENDIENTE ──▶ PostgreSQL
                              crea preferencia (CLP) ─────────▶ Checkout Pro
 ◀──────────── initPoint ─────
 redirige al checkout ────────────────────────────────────────▶ pago
 ◀──────────── /pago/aprobado | pendiente | rechazado ──────────
                              ◀── POST /api/webhooks/mercadopago (x-signature)
                              valida HMAC, consulta el pago,
                              Order PAGADA | RECHAZADA ──▶ PostgreSQL
```

El navegador nunca envía precios. La orden pasa a PAGADA solo cuando llega un webhook con firma válida y el pago consultado a Mercado Pago coincide en monto y moneda (CLP).

### Recorrido de una compra

1. El cliente presiona **Comprar**. `POST /api/checkout` recibe solo `{productId, quantity}`.
2. El servidor rechaza al admin (403), calcula los precios desde `shared/products.ts` y crea la `Order` en estado PENDIENTE con sus `OrderItem`.
3. Crea la preferencia (`currency_id: CLP`, `external_reference` = id de la orden, `back_urls`, `notification_url`) y responde con el `init_point`.
4. El navegador redirige al checkout de Mercado Pago. Al terminar, Mercado Pago lo devuelve a `/pago/aprobado`, `/pago/pendiente` o `/pago/rechazado` con `?orden=<id>`.
5. Mercado Pago llama a `POST /api/webhooks/mercadopago`. El servidor valida `x-signature` (HMAC-SHA256), consulta el pago y actualiza la orden a PAGADA o RECHAZADA. Una orden PAGADA no vuelve atrás.
6. La página de retorno lee el estado real desde la API y lo consulta varias veces mientras siga pendiente.

### Carpetas

| Carpeta | Contenido |
| --- | --- |
| `shared/` | Catálogo y precios, permisos (`ADMIN_EMAIL`, `canPurchase`), tipos y formato CLP. Lo usan el frontend y el servidor |
| `server/` | `app.ts` (crea la app), `index.ts` (arranque y admin), `env.ts`, `db.ts`, `lib/` (session, pricing, mercadopago, orders, admin), `middleware/auth.ts`, `routes/` |
| `src/` | App React: `pages/`, `components/`, `store/cart.ts`, `auth/` (SessionContext y guards), `api/client.ts`, `styles/` |
| `prisma/` | `schema.prisma`, migración inicial y `seed.ts` |
| `tests/web/` | Store del carrito, componente Cart y "el admin no puede comprar" en la UI |
| `tests/server/` | Checkout (403 al admin, precios del servidor), precios en CLP, firma del webhook y conciliación de pagos |
| `docs/` | Esta guía |

### API

| Método y ruta | Quién puede llamarla | Qué hace |
| --- | --- | --- |
| `POST /api/auth/login` | Pública, con límite de 30 intentos cada 15 minutos | Admin con contraseña (bcrypt); cliente solo con correo (crea la cuenta) |
| `POST /api/auth/logout` | Cualquiera | Borra la cookie |
| `GET /api/auth/me` | Con sesión | Usuario actual |
| `GET /api/products` | Con sesión | Catálogo |
| `POST /api/checkout` | Solo cliente | Crea la orden y la preferencia; devuelve `initPoint` |
| `GET /api/orders/mine` | Con sesión | Compras del usuario |
| `GET /api/orders/:id` | Dueño o admin | Una orden (para las páginas de retorno) |
| `GET /api/admin/orders` | Solo admin | Todas las compras, con el correo del cliente |
| `POST /api/webhooks/mercadopago` | Mercado Pago, con firma | Concilia el pago con la orden |

### Modelo de datos (Prisma + PostgreSQL)

| Tabla | Campos clave |
| --- | --- |
| `User` | `email` único, `role` (enum ADMIN o CLIENTE), `passwordHash` (solo el admin) |
| `Order` | `userId`, `status` (enum PENDIENTE, PAGADA o RECHAZADA), `total` Int en CLP, `mpPreferenceId`, `mpPaymentId` único |
| `OrderItem` | `orderId` (borrado en cascada), `productId`, `name`, `unitPrice` Int, `quantity`. Guarda el nombre y el precio del momento de la compra |

### Variables de entorno

| Variable | Para qué sirve |
| --- | --- |
| `DATABASE_URL` | Conexión a PostgreSQL |
| `SESSION_SECRET` | Firma de la cookie, mínimo 32 caracteres |
| `ADMIN_PASSWORD` | Contraseña del admin, mínimo 8 caracteres; en la base queda solo su hash |
| `MP_ACCESS_TOKEN` | Access Token de Mercado Pago |
| `MP_WEBHOOK_SECRET` | Clave secreta de los webhooks |
| `APP_URL` | URL pública, sin `/` final; se usa para las URLs de retorno y del webhook |
| `PORT` | Puerto de la API (por defecto 3000) |

## Pendientes y riesgos

Lo primero es subir el código a GitHub y probarlo con una base real; después, un pago completo en el sandbox de Mercado Pago.

### Próximos pasos, en orden

- [ ] Instalar Node 22 en el equipo de trabajo.
- [ ] Primer commit y subida a un repositorio privado de GitHub.
- [ ] Levantar PostgreSQL y correr `npm run db:migrate` + `npm run db:seed` (primera prueba real de la migración).
- [ ] Probar el login de cliente y de admin en el navegador, en escritorio y en celular.
- [ ] Crear credenciales de prueba de Mercado Pago Chile y hacer un pago completo con webhook (ver la lista de la sección anterior).
- [ ] Desplegar en Render (u otro servicio) con Postgres gestionado, siguiendo la sección 5 del `README.md`.
- [ ] Configurar la URL de producción del webhook y, al salir a producción, las credenciales reales.

### Riesgos y deuda técnica conocida

| Tema | Detalle | Qué hacer |
| --- | --- | --- |
| Migración sin probar | `prisma/migrations/20261011000000_init` se generó con `prisma migrate diff`, sin una base real | Correr `npm run db:migrate` y revisar que no pida crear otra migración |
| SDK `mercadopago` 2.x | `npm audit` avisa de `uuid` (moderado); la solución es la versión 3.x, con cambios importantes | Evaluar pasar a 3.x después de un pago de prueba que funcione con 2.x |
| Prisma 6.x | Avisos de `deepmerge-ts` solo en la herramienta de línea de comandos, no en lo que corre en el servidor. La configuración `package.json#prisma` (seed) dejará de funcionar en Prisma 7 | Mantener `^6`. Al pasar a 7, migrar a `prisma.config.ts` y cargar `.env` manualmente |
| Tabla en celular | La tabla de compras se convierte en tarjetas con CSS; algunos lectores de pantalla (Safari) pierden la semántica de tabla | Revisar con VoiceOver; si molesta, agregar roles ARIA explícitos |
| Orden de tabulación del encabezado en celular | El menú se ve en la segunda fila, pero en el teclado va primero | Menor; revisar si se pide auditoría de accesibilidad |
| Compras repetidas | Cada "Comprar" crea una orden nueva; un pago rechazado deja esa orden RECHAZADA y el reintento crea otra | Aceptable por ahora; documentado |
| Skill `ui-ux-pro-max` | Se pidió usarla, pero no estaba instalada | Instalarla en `~/.claude/skills/` y pedir una revisión visual |

## Continuar con otro Claude Code

Abre Claude Code en la carpeta del repositorio clonado y pégale el prompt de abajo; con eso tiene el contexto y las reglas para no romper lo que ya funciona.

### Prompt de arranque

```markdown
Estoy continuando el proyecto "Mati Ventas" (tienda web en español de Chile).
Lee primero README.md y luego docs/CONTINUAR.md.

Stack: React 19 + Vite 7 + TypeScript estricto + SCSS Modules + Zustand + React Router 7 (modo librería)
en src/; API Express 5 + Prisma 6 + PostgreSQL en server/; código compartido en shared/;
pagos con Mercado Pago Checkout Pro (SDK mercadopago 2.x, CLP); tests con Vitest 5 + RTL + Supertest.

Reglas que no se pueden romper:
- Todos los textos de la interfaz en español de Chile.
- El administrador (matiasalecornejo@gmail.com) NO puede comprar: ni en la UI ni en la API (403).
- Los precios se calculan solo en el servidor desde shared/products.ts; nunca se confía en el navegador.
- Montos en CLP y siempre enteros.
- Nunca subir .env ni secretos al repositorio.
- Antes de dar algo por terminado: npm run typecheck && npm test && npm run build.

Próxima tarea: <DESCRIBE LO QUE QUIERES HACER>
```

### Verificación antes de cerrar cualquier cambio

```bash
node -v                # 20.19 o superior
npm run typecheck      # tipos del frontend y del servidor
npm test               # 43 tests al día de hoy
npm run build          # build de Vite + compilación del servidor
```

### Convenciones del código

- **Imports del servidor con extensión `.js`** (`import { prisma } from '../db.js'`): el servidor compila con `module: NodeNext`. El frontend importa sin extensión.
- **Dos `tsconfig`**: `tsconfig.json` (frontend, tests y `shared`, sin emitir) y `tsconfig.server.json` (servidor, emite a `dist-server/`).
- **`shared/` es la única fuente** de productos y precios (`products.ts`), reglas de perfil (`permissions.ts`: `ADMIN_EMAIL`, `canPurchase`), tipos (`types.ts`) y formato CLP (`format.ts`).
- **Variables de entorno**: se validan con zod en `server/env.ts` mediante `getEnv()`, que es perezosa para que los tests puedan definirlas antes.
- **Estilos**: un `.module.scss` por componente, con tokens en `src/styles/_variables.scss` y mixins en `_mixins.scss`. El acento es `#c2410c` (contraste AA con blanco).
- **Tests del servidor**: Prisma y Mercado Pago se simulan con `vi.mock('../../server/db.js')` y `vi.mock('../../server/lib/mercadopago.js')`. El ayudante está en `tests/server/helpers.ts`.
- **Tests web**: `tests/web/renderWithSession.tsx` monta componentes con un usuario cliente o admin sin llamar a la API.
- **Sin commits automáticos**: el dueño del proyecto decide cuándo hacer commit y push.
