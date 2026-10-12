import { forwardRef } from 'react';
import { selectCount, selectTotal, useCartStore } from '../../store/cart';
import { formatCLP } from '../../../shared/format';
import { CartItem } from './CartItem';
import { CheckoutButton } from './CheckoutButton';
import styles from './Cart.module.scss';

export const Cart = forwardRef<HTMLHeadingElement>(function Cart(_props, headingRef) {
  const lines = useCartStore((state) => state.lines);
  const total = useCartStore(selectTotal);
  const count = useCartStore(selectCount);

  return (
    <section id="carrito" className={styles.cart} aria-labelledby="carrito-titulo">
      <div className={styles.head}>
        <h2 id="carrito-titulo" ref={headingRef} tabIndex={-1}>
          Tu carrito
        </h2>
        {count > 0 && (
          <span className={styles.count}>
            {count} {count === 1 ? 'producto' : 'productos'}
          </span>
        )}
      </div>

      {lines.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon} aria-hidden="true">
            🛒
          </span>
          <p>Tu carrito está vacío.</p>
          <p className={styles.emptyHint}>Agrega tus dulces favoritos para comenzar.</p>
        </div>
      ) : (
        <>
          <ul role="list" className={styles.list}>
            {lines.map((line) => (
              <CartItem key={line.productId} line={line} />
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
            <span aria-hidden="true">🔒</span> Pago seguro con Mercado Pago
          </p>
        </>
      )}
    </section>
  );
});
