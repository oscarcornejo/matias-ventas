import { useState } from 'react';
import { Link } from 'react-router';
import { useSession } from '../../auth/SessionContext';
import { useCatalog } from '../../catalog/CatalogContext';
import type { CatalogItem } from '../../../shared/products';
import { useCart } from '../../catalog/useCart';
import { useCartStore } from '../../store/cart';
import { canUseCart } from '../../../shared/permissions';
import { formatCLP } from '../../../shared/format';
import { ProductCard } from '../../components/ProductCard/ProductCard';
import { Loading } from '../../components/Loading/Loading';
import { Icon } from '../../components/Icon/Icon';
import styles from './StorePage.module.scss';

export function StorePage() {
  const { user } = useSession();
  // La visita sin cuenta compra igual que un cliente: arma el carrito y se registra al pagar.
  const showCart = canUseCart(user?.role ?? null);
  const { items, loading, error, reload } = useCatalog();
  const productos = items.filter((item) => item.kind === 'producto');
  const combos = items.filter((item) => item.kind === 'combo');

  return (
    <div className={styles.page}>
      <Hero isAdmin={!showCart} />

      {loading && <Loading label="Cargando los productos…" />}

      {error && (
        <div className={styles.error} role="alert">
          <p>{error}</p>
          <button type="button" className={styles.retry} onClick={reload}>
            Reintentar
          </button>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <p className={styles.empty}>Todavía no hay productos a la venta. Vuelve a mirar más rato.</p>
      )}

      {/*
        Productos y combos van en secciones separadas, con el orden que definió
        Matías dentro de cada una. Las promociones van arriba: son la oferta, y
        quien llega apurado debería verlas antes de elegir un producto suelto.

        Como se leen sin haber visto el catálogo todavía, la sección lleva una línea
        que explica qué es un combo.
      */}
      {!loading && !error && combos.length > 0 && (
        <section aria-labelledby="combos-titulo" className={styles.catalog}>
          <h2 id="combos-titulo" className={styles.catalogTitle}>
            {combos.length === 1 ? 'La promoción' : 'Promociones'}
          </h2>
          <p className={styles.catalogLead}>
            Varios productos juntos, más baratos que comprándolos por separado.
          </p>
          {showCart ? <ClientCatalog items={combos} /> : <ProductList items={combos} />}
        </section>
      )}

      {!loading && !error && productos.length > 0 && (
        <section aria-labelledby="productos-titulo" className={styles.catalog}>
          <h2 id="productos-titulo" className={styles.catalogTitle}>
            {productos.length === 1 ? 'El producto' : 'Los productos'}
          </h2>
          {showCart ? <ClientCatalog items={productos} /> : <ProductList items={productos} />}
        </section>
      )}

      {showCart && <MobileBar />}
    </div>
  );
}

/**
 * Encabezado de la tienda: dice qué es esto, y nada más.
 *
 * No lleva botón a propósito. Primero hubo uno, "Ver todos los productos", que era
 * un ancla a la sección de abajo: desplazaba 132px de una pantalla de 844, hacia
 * productos que ya estaban a la vista. Después se probó con "Ir a pagar $X", que sí
 * tenía destino, pero repetía exactamente lo que ya dice la barra fija del carrito,
 * con el mismo monto y a la vista al mismo tiempo.
 *
 * En esta página el catálogo es el contenido: la acción real son los botones
 * "Agregar" de cada producto, y para ir al carrito están el icono del encabezado y
 * la barra fija. Un botón más solo empujaría los productos fuera de la pantalla.
 */
function Hero({ isAdmin }: { isAdmin: boolean }) {
  return (
    <section className={styles.hero} aria-labelledby="hero-titulo">
      <h1 id="hero-titulo" className={styles.heroTitle}>
        Dulces listos
        <br />
        en el recreo.
      </h1>
      <p className={styles.heroLead}>
        El kiosco de Matías, en tu teléfono. Eliges, pagas con Mercado Pago y lo retiras
        en mano.
      </p>

      {isAdmin && (
        <p className={styles.adminNote} role="note">
          Estás viendo la tienda como <strong>administrador</strong>: este perfil no puede
          comprar.{' '}
          <Link to="/admin/productos">Administrar los productos</Link>
        </p>
      )}
    </section>
  );
}

function ProductList({ items, onAdd }: { items: CatalogItem[]; onAdd?: (item: CatalogItem) => void }) {
  const lines = useCartStore((state) => state.lines);
  return (
    <ul role="list" className={styles.grid}>
      {items.map((item, index) => (
        <li key={item.id}>
          <ProductCard
            item={item}
            tone={index}
            {...(onAdd
              ? {
                  onAdd: () => onAdd(item),
                  quantityInCart: lines.find((line) => line.id === item.id)?.quantity ?? 0,
                }
              : {})}
          />
        </li>
      ))}
    </ul>
  );
}

function ClientCatalog({ items }: { items: CatalogItem[] }) {
  const add = useCartStore((state) => state.add);
  const [announcement, setAnnouncement] = useState('');

  function handleAdd(item: CatalogItem) {
    add(item.id, item.kind);
    // Se agrega un espacio invisible para que el lector de pantalla repita el aviso si se presiona dos veces.
    setAnnouncement((prev) => `Agregaste ${item.name} al carrito.${prev.endsWith(' ') ? '' : ' '}`);
  }

  return (
    <>
      <ProductList items={items} onAdd={handleAdd} />
      <p className="visually-hidden" role="status" aria-live="polite">
        {announcement}
      </p>
    </>
  );
}

/** Barra fija de celular: lleva al carrito, que ahora vive en su propia página. */
function MobileBar() {
  const { lines, total } = useCart();
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  if (count === 0) return null;

  return (
    <div className={styles.mobileBar}>
      <div className={styles.mobileBarInfo}>
        <span className={styles.mobileBarLabel}>
          {count} {count === 1 ? 'producto' : 'productos'}
        </span>
        <strong className={styles.mobileBarTotal}>{formatCLP(total)}</strong>
      </div>
      <Link to="/carrito" className={styles.mobileBarLink}>
        Ver carrito
        <Icon name="flecha" size={18} />
      </Link>
    </div>
  );
}
