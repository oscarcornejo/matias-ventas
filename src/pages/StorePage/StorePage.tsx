import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useSession } from '../../auth/SessionContext';
import { selectCount, selectTotal, useCartStore } from '../../store/cart';
import { PRODUCTS } from '../../../shared/products';
import { canPurchase } from '../../../shared/permissions';
import { formatCLP } from '../../../shared/format';
import { ProductCard } from '../../components/ProductCard/ProductCard';
import { Cart } from '../../components/Cart/Cart';
import styles from './StorePage.module.scss';

export function StorePage() {
  const { user } = useSession();
  const isClient = user ? canPurchase(user.role) : false;

  return (
    <div className={isClient ? styles.withCart : undefined}>
      <section aria-labelledby="productos-titulo" className={styles.catalog}>
        <div className={styles.intro}>
          <h1 id="productos-titulo">Productos</h1>
          <p className={styles.subtitle}>Galletas, dulces y alfajores para tu antojo.</p>
        </div>

        {!isClient && (
          <p className={styles.adminNote} role="note">
            Estás viendo la tienda como <strong>administrador</strong>: este perfil no puede comprar.{' '}
            <Link to="/admin/compras">Ver compras de los clientes</Link>
          </p>
        )}

        {isClient ? <ClientCatalog /> : <ProductList />}
      </section>

      {isClient && <ClientCart />}
    </div>
  );
}

function ProductList({ onAdd }: { onAdd?: (id: (typeof PRODUCTS)[number]['id']) => void }) {
  const lines = useCartStore((state) => state.lines);
  return (
    <ul role="list" className={styles.grid}>
      {PRODUCTS.map((product) => (
        <li key={product.id}>
          <ProductCard
            product={product}
            {...(onAdd
              ? {
                  onAdd: () => onAdd(product.id),
                  quantityInCart: lines.find((line) => line.productId === product.id)?.quantity ?? 0,
                }
              : {})}
          />
        </li>
      ))}
    </ul>
  );
}

function ClientCatalog() {
  const add = useCartStore((state) => state.add);
  const [announcement, setAnnouncement] = useState('');

  function handleAdd(productId: (typeof PRODUCTS)[number]['id']) {
    add(productId);
    const product = PRODUCTS.find((item) => item.id === productId);
    // Se agrega un espacio invisible para que el lector de pantalla repita el aviso si se presiona dos veces.
    setAnnouncement((prev) => `Agregaste ${product?.name ?? 'el producto'} al carrito.${prev.endsWith(' ') ? '' : ' '}`);
  }

  return (
    <>
      <ProductList onAdd={handleAdd} />
      <p className="visually-hidden" role="status" aria-live="polite">
        {announcement}
      </p>
    </>
  );
}

function ClientCart() {
  const location = useLocation();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const count = useCartStore(selectCount);
  const total = useCartStore(selectTotal);

  // Enlaces a /#carrito (desde el encabezado o la barra inferior) llevan el foco al carrito.
  useEffect(() => {
    if (location.hash === '#carrito') {
      headingRef.current?.scrollIntoView({ block: 'start' });
      headingRef.current?.focus({ preventScroll: true });
    }
  }, [location.hash, location.key]);

  return (
    <>
      <aside className={styles.cartColumn} aria-label="Carrito de compras">
        <Cart ref={headingRef} />
      </aside>

      {count > 0 && (
        <div className={styles.mobileBar}>
          <div>
            <span className={styles.mobileBarLabel}>
              {count} {count === 1 ? 'producto' : 'productos'}
            </span>
            <strong className={styles.mobileBarTotal}>{formatCLP(total)}</strong>
          </div>
          <Link to={{ hash: '#carrito' }} className={styles.mobileBarLink}>
            Ver carrito
          </Link>
        </div>
      )}
    </>
  );
}
