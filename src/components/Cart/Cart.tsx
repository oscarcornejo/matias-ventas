import { useCart } from '../../catalog/useCart';
import { formatCLP } from '../../../shared/format';
import { CartItem } from './CartItem';
import { CheckoutButton } from './CheckoutButton';
import { Icon } from '../Icon/Icon';
import styles from './Cart.module.scss';

/**
 * Contenido del carrito. El título lo pone la página que lo contiene
 * (/carrito), para no rotular dos veces lo mismo.
 */
export function Cart() {
  const { lines, total } = useCart();
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);

  if (lines.length === 0) {
    return (
      <section className={styles.cart} aria-label="Carrito vacío">
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>
            <Icon name="carrito" size={26} />
          </span>
          <p className={styles.emptyTitle}>Tu carrito está vacío.</p>
          <p className={styles.emptyHint}>Agrega un dulce para empezar.</p>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.cart}>
      <p className={styles.count}>
        {count} {count === 1 ? 'producto' : 'productos'}
      </p>

      <ul role="list" className={styles.list}>
        {lines.map((line) => (
          <CartItem key={line.product.id} line={line} />
        ))}
      </ul>

      <dl className={styles.summary}>
        <div className={styles.totalRow}>
          <dt>Total</dt>
          <dd data-testid="cart-total">{formatCLP(total)}</dd>
        </div>
      </dl>

      <CheckoutButton />
      <p className={styles.secure}>
        <Icon name="candado" size={15} />
        Pagas con Mercado Pago
      </p>
    </section>
  );
}
