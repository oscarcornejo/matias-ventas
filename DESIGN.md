# Design

<!-- impeccable:design-schema 1 -->

## El mundo

**El estándar del ecommerce, ejecutado en serio.** El usuario eligió explícitamente la
convención por sobre las direcciones fundamentadas que se le ofrecieron: la grilla de
tarjetas pastel con radios amplios, acento azul y fotografía grande de su imagen de
referencia. Eso no es una concesión, es el compromiso. Se ejecuta a fondo, sin ironía y
sin colar un mundo distinto por la puerta de atrás.

**Listón de acabado: Mercado Libre y Falabella.** El usuario los nombró como los
productos al lado de los cuales esto tiene que poder pararse. Se toman sus
**convenciones**, no su densidad visual:

- El precio es lo más fuerte de la tarjeta, nunca se esconde tras un hover.
- "Agregar" es inconfundible y está siempre visible.
- Cero misterio: lo que se puede hacer se ve, y dice lo que hace.
- La información que importa para decidir cabe sin scroll horizontal ni foco previo.

Esas convenciones se sirven con la calidad visual de la referencia: superficies limpias,
mucho aire, un solo acento, bordes sutiles.

## Escena de uso

Un compañero de colegio, de pie, en el recreo, con una mano, en un celular, con poco
tiempo y posiblemente mala señal. **Claro, no oscuro**: la pantalla se mira con luz de
día. El diseño se juzga primero a 390px.

## Color

Tema único claro. Un solo acento para acción.

| Token | Valor | Uso |
| --- | --- | --- |
| `$color-bg` | `#FCFBF9` | Fondo de página, blanco cálido |
| `$color-surface` | `#FFFFFF` | Tarjetas y paneles |
| `$color-surface-sunken` | `#F4F2EE` | Campos, zonas hundidas, cabecera de tabla |
| `$color-border` | `#E6E1D9` | Hairline 1px, única fuente de elevación en tarjetas |
| `$color-border-strong` | `#8D8578` | Borde de campos y botones secundarios. **3,65:1 sobre blanco**, 3,53:1 sobre el fondo de página y 3,26:1 sobre superficie hundida: WCAG 2.2 SC 1.4.11 exige 3:1 para el contorno de un control |
| `$color-text` | `#16140F` | Texto principal (15,9:1 sobre fondo) |
| `$color-text-muted` | `#6B645A` | Secundario (5,2:1 sobre fondo) |
| `$color-accent` | `#2A4FD7` | Acción: botones primarios, enlaces, foco (7,3:1 sobre blanco) |
| `$color-accent-hover` | `#1E3BAD` | Hover del acento |
| `$color-accent-soft` | `#EDF1FE` | Fondo de realce del acento |

**Planos de producto.** Cada dulce tiene su propio pastel de fondo, tomado de la
referencia. Es identificación, no decoración: el mismo color acompaña al producto en el
catálogo y en el carrito.

El catálogo puede tener cualquier cantidad de productos, así que el color **rota por
posición**, no por producto:

| Posición | Plano |
| --- | --- |
| 1.ª, 4.ª, 7.ª… | `#E7EFDB` salvia |
| 2.ª, 5.ª, 8.ª… | `#F7E9B9` mantequilla |
| 3.ª, 6.ª, 9.ª… | `#F3DFD7` arcilla |

Cuando un producto tiene foto, la foto ocupa el hueco completo y el plano queda detrás.

**Los combos no rotan de color:** usan siempre `$color-accent-soft`, para que se
distingan de un vistazo entre los productos sueltos. Su tarjeta lleva, en este orden,
la etiqueta "Combo", el nombre, qué trae, el precio con el normal tachado al lado, y
cuánto se ahorra.

**Estado de pago.** Fondo suave + texto oscuro del mismo matiz, nunca gris.

| Estado | Fondo | Texto |
| --- | --- | --- |
| Pendiente | `#FBEFD3` | `#7A5410` |
| Pagada | `#DCEDE0` | `#1D5B33` |
| Rechazada | `#F8DFDC` | `#962018` |

## Tipografía

**Plus Jakarta Sans Variable**, auto-hospedada (`@fontsource-variable`, subconjunto
latin, woff2). Una sola familia para display y texto; el peso y la escala hacen la
jerarquía. Sin itálicas, sin segunda familia, sin fuente del sistema como voz de display.

- Display: `clamp(2.25rem, 1.6rem + 3.2vw, 4rem)`, peso 800, tracking `-0.03em`.
  **Solo el hero de la tienda.** Es la excepción, no el valor por defecto.
- H1 de pantalla de trabajo: `clamp(1.75rem, 1.5rem + 1.1vw, 2.375rem)`, peso 800.
- H2: `clamp(1.375rem, 1.2rem + 0.8vw, 1.75rem)`, peso 700, tracking `-0.02em`.
- Cuerpo: `1rem`/`1.55`, peso 400. Medida máxima `68ch`.
- Etiqueta: `0.8125rem`, peso 600, tracking `0.01em`.
- **Precios y cantidades: `font-variant-numeric: tabular-nums`**, siempre. Las cifras
  tienen que alinearse en columna y no bailar al cambiar la cantidad.

Tracking nunca baja de `-0.03em`. Display nunca supera `4rem`.

## Forma y elevación

- Radio de tarjeta: `14px`. Radio de campo y botón rectangular: `10px`. Pastilla
  (`999px`) solo en controles pequeños: chips, badges, stepper.
- **La elevación se declara una sola vez.** Las tarjetas en reposo usan borde hairline
  de 1px y **ninguna sombra**. La sombra aparece solo al elevar algo sobre la página
  (barra fija de móvil, hover de tarjeta interactiva) y entonces el borde se va.
- Sombra, cuando corresponde: `0 2px 4px rgba(22,20,15,.05), 0 12px 28px rgba(22,20,15,.09)`
  — con desplazamiento y difuminado reales, nunca un halo de color sin offset.

## Iconografía

Un solo juego de iconos SVG dibujados a mano en `src/components/Icon/Icon.tsx`:
trazo `1.75px`, `stroke-linecap: round`, `stroke-linejoin: round`, caja `24×24`,
`currentColor`. **Ningún emoji y ningún glifo Unicode hace de icono** en la interfaz.

Los emojis de producto (🍪 🍬 🍫) son otra cosa: son el marcador temporal del producto
mientras no haya fotografía, no un icono de interfaz.

## Fotografía de producto

**Las fotos reales no existen todavía.** Cada tarjeta reserva un hueco para la
fotografía sobre el plano de color del producto. Hoy ese hueco muestra el emoji
centrado, asentado con una sombra para que no flote. No lleva ninguna etiqueta de
"foto pendiente": eso sería ruido para quien viene a comprar. Cuando lleguen las tres
fotos se reemplaza el contenido del hueco sin tocar la composición.

El contrato del hueco: fondo del plano de color del producto, contenido centrado y
`object-fit: cover` cuando haya imagen. Desde `≥48rem` toma `aspect-ratio: 4/5`; en la
fila compacta de celular llena el alto de la fila.

## Composición

Una grilla, no una plantilla de tarjetas iguales.

- **Hero:** título de display, una línea de descripción, un CTA primario. Compacto en
  móvil a propósito: el primer producto tiene que asomar en la primera pantalla. El
  brief pedía un hero grande; la escena de uso manda que no empuje el catálogo fuera
  de vista.
- **Carrito:** tiene página propia en `/carrito`. La tienda no lleva panel lateral;
  se llega por el icono del encabezado y, en celular, por la barra fija de resumen.
- **Catálogo:** en celular cada producto es una **fila compacta** (plano de color a la
  izquierda, nombre, precio y "Agregar" a la derecha) para que los tres quepan en una
  pantalla y se pueda comprar sin scroll. Desde `≥48rem` pasa a tres columnas con la
  fotografía al mando. Los tres productos comparten escala y fondo idénticos, sin
  excepción, para que comparar precio sea honesto.
- **Carrito:** columna lateral pegajosa en `≥64rem`; en móvil va bajo el catálogo, con
  una barra fija de resumen que lleva a él.
- **Separación entre secciones:** `$space-8` (4rem) en móvil, `$space-9` (6rem) desde
  `≥48rem`.

## Movimiento

**Un solo momento de autoría: agregar al carrito.** Al presionar "Agregar", el contador
del carrito en el encabezado da un acuse breve y el total del carrito cambia con una
transición de número. Todo lo demás son transiciones de estado de 150ms.

Curva única: `cubic-bezier(.16,1,.3,1)` (salida exponencial) desde un estado ya visible.
Nada aparece con fade al hacer scroll. `prefers-reduced-motion` desactiva el acuse.

## Superficies del navegador

No se dejan en su valor por defecto:

- `::selection` usa `$color-accent-soft` con texto `$color-text`.
- `caret-color: $color-accent` en los campos.
- Barra de scroll teñida con `scrollbar-color`.
- Anillo de foco: `3px solid $color-accent` con `outline-offset: 2px`.
- `text-underline-offset: 0.18em` y `text-decoration-thickness: 0.08em` en enlaces.
- `font-variant-numeric: tabular-nums` en todo dato numérico.

## Reglas que el diseño no puede romper

1. El administrador nunca ve carrito, "Agregar" ni "Comprar".
2. Los precios y los nombres salen de la base de datos vía API; la interfaz no los
   inventa y **ningún texto afirma cuántos productos hay**.
3. Todo el texto en español de Chile.
4. Un solo vocabulario de etiquetas: nada se rotula dos veces.
5. Sin kicker ni eyebrow sobre los títulos.
6. La tabla de compras declara roles ARIA explícitos (`table`, `row`, `cell`,
   `columnheader`). En celular las filas pasan a bloques y las celdas a flex, lo que
   descarta los roles implícitos; sin los explícitos un lector de pantalla leería
   textos sueltos. La cabecera se oculta con `visually-hidden`, nunca con
   `display: none`, para que cada celda conserve su encabezado de columna.
6. Sin testimonios, cifras de venta ni sellos de confianza inventados. La tienda es
   nueva y pequeña, y se ve como lo que es.
