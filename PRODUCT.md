# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primario: compañeros de colegio de Matías.** Chicos que compran entre clases o en el
recreo. Casi siempre desde el celular, de pie, con una mano, con poco tiempo y
posiblemente con señal mala. Conocen a Matías, no necesitan que la tienda les explique
quién es. Lo que necesitan es elegir y pagar antes de que toque el timbre.

Consecuencias que el diseño no puede ignorar:

- El celular es el dispositivo real, no el caso secundario.
- El recorrido entra → elige → paga tiene que caber en pocos toques y poco scroll.
- Los controles tienen que alcanzarse con el pulgar.
- Un hero que empuje los productos fuera de la primera pantalla trabaja en contra.

**Secundario: Matías (administrador).** Revisa qué se vendió y en qué estado quedó cada
pago. No compra: el perfil administrador tiene la compra bloqueada por regla de negocio.

## Product Purpose

Vender tres dulces por internet y cobrarlos con Mercado Pago, para que Matías no tenga
que manejar efectivo ni anotar pedidos a mano. Éxito es que un compañero pueda comprar
sin preguntarle nada a nadie, y que Matías vea el pago confirmado sin perseguir a nadie.

## Positioning

Es la tienda de una persona concreta y conocida, con un catálogo de tres productos que
cabe entero en una pantalla. No compite por variedad: compite por ser más rápida que
pedirle el dulce a Matías en persona.

## Operating Context

- Se usa en el colegio, en minutos de recreo, desde el celular.
- El pago sale de la app hacia Mercado Pago y vuelve a una página de retorno.
- El estado real de la compra lo confirma un webhook firmado, no el navegador.
- El catálogo es público: se puede ver sin cuenta. Comprar exige cuenta.

## Capabilities and Constraints

**Funciona hoy:**

- Catálogo público (`GET /api/productos` sin sesión), administrado desde la base.
- Panel de productos del administrador, con subida de foto desde cualquier dispositivo.
- El carrito tiene su propia página (`/carrito`).
- Registro de cliente: correo + contraseña de 8 caracteres o más.
- Login con contraseña para clientes y para el administrador.
- Carrito persistido en el navegador; sobrevive al registro.
- Checkout con precios calculados en el servidor y pago con Mercado Pago (CLP).
- Páginas de retorno: aprobado, pendiente, rechazado.
- "Mis compras" para el cliente y "Compras" para el administrador.

**Restricciones que ningún rediseño puede romper:**

- El catálogo lo administra Matías desde `/admin/productos`: puede crear productos,
  editarlos, subirles una foto y ocultarlos. **No es un catálogo de tres productos
  fijos**, y ningún texto de la interfaz debe decir cuántos hay.
- Un producto oculto deja de verse en la tienda y no se puede comprar, pero se
  conserva junto con su historial de ventas. No existe borrado.
- La tienda nació con Chirlito Suffle $300, Grosso Crunch $200 y Alfajor Panchito
  $400; eso es la siembra inicial de una base vacía, no una restricción.
- El nombre de la marca es "Mati Ventas".
- El administrador (`matiasalecornejo@gmail.com`) **no puede comprar**: ni en la
  interfaz ni en la API, que responde 403.
- Los precios se calculan solo en el servidor, leyéndolos de la base de datos.
  El navegador nunca envía precios y el servidor nunca los acepta.
- Montos en pesos chilenos, siempre enteros.
- Toda la interfaz en español de Chile.
- Stack existente: React 19 + Vite + TypeScript estricto + SCSS Modules + Zustand +
  React Router 7; API Express 5 + Prisma 6 + PostgreSQL.

**No decidido:** si habrá más productos en el futuro; si habrá despacho o solo entrega
en mano.

## Brand Commitments

- Nombre: **Mati Ventas** (se mantiene).
- Idioma: español de Chile, en toda la interfaz.
- El acento naranja actual (`#c2410c`) **no** es un compromiso: el usuario lo dejó
  libre para reemplazar.
- Sin logo ni manual de estilo previos.
- **Preferencia declarada por el estándar.** Enfrentado a direcciones visuales
  fundamentadas y a la convención del rubro, el usuario eligió explícitamente la
  convención: el storefront de tarjetas con grilla, acento único y fotografía, tal como
  su imagen de referencia. El trabajo futuro ejecuta esa convención a fondo en vez de
  proponer un mundo propio, salvo que el usuario lo cambie.
- **Listón de acabado: Mercado Libre y Falabella.** Se toman sus convenciones
  (precio imposible de perder, comprar obvio, cero misterio), no su densidad visual.

## Evidence on Hand

- El catálogo real vive en la base de datos y lo mantiene Matías.
- **Las fotos las sube Matías.** Se guardan en PostgreSQL, no en disco: el sistema
  de archivos de los servicios gestionados se borra en cada despliegue. El navegador
  las redimensiona antes de subirlas (medido: 3,8 MB → 7,6 KB). Mientras un producto
  no tenga foto, se muestra su emoji.
- No hay testimonios, cifras de venta, reseñas ni clientes citables. No se deben
  inventar: la tienda es nueva y pequeña.
- No hay sello de "pago seguro" certificado más allá del hecho real de usar Mercado
  Pago.

## Product Principles

1. **El celular manda.** Cada decisión se juzga primero en una pantalla de 390px de
   ancho, con una mano y poco tiempo.
2. **El producto antes que el discurso.** Tres dulces y sus precios son el contenido;
   nada debe retrasar su aparición.
3. **El servidor es la autoridad.** Precios, permisos y estado de pago nunca se
   deciden en el navegador, y la interfaz nunca promete lo que el servidor no confirmó.
4. **No fingir tamaño.** Es la tienda de una persona con tres productos. Nada de
   testimonios inventados, catálogos falsos ni señales de empresa grande.
5. **Comprar no es un obstáculo.** Ver es libre; la cuenta se pide en el momento de
   pagar y nunca cuesta el carrito que la persona ya armó.

## Accessibility & Inclusion

- Objetivo WCAG 2.2 AA en contraste y foco visible.
- Todo el flujo de compra debe poder hacerse solo con teclado (ya cubierto por tests).
- Objetivos táctiles cómodos para uso a una mano: el carrito y "Agregar" son los
  controles críticos.
- Se usa en condiciones reales de mala señal: el peso de la página importa.
