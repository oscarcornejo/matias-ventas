import { MAX_QUANTITY, useCartStore, type CartLine } from '../../store/cart';
import { findProduct } from '../../../shared/products';
import { formatCLP } from '../../../shared/format';
import styles from './Cart.module.scss';

export function CartItem({ line }: { line: CartLine }) {
  const increment = useCartStore((state) => state.increment);
  const decrement = useCartStore((state) => state.decrement);
  const remove = useCartStore((state) => state.remove);
  const product = findProduct(line.productId);
  if (!product) return null;

  const quantityId = `cantidad-${product.id}`;

  return (
    <li className={styles.item}>
      <span className={styles.itemEmoji} aria-hidden="true">
        {product.emoji}
      </span>
      <div className={styles.itemInfo}>
        <p className={styles.itemName}>{product.name}</p>
        <p className={styles.itemUnit}>{formatCLP(product.price)} c/u</p>
      </div>

      <div className={styles.stepper} role="group" aria-label={`Cantidad de ${product.name}`}>
        <button
          type="button"
          className={styles.stepButton}
          onClick={() => decrement(line.productId)}
          disabled={line.quantity <= 1}
          aria-label={`Restar uno de ${product.name}`}
        >
          −
        </button>
        <output id={quantityId} className={styles.quantity} aria-live="polite">
          {line.quantity}
        </output>
        <button
          type="button"
          className={styles.stepButton}
          onClick={() => increment(line.productId)}
          disabled={line.quantity >= MAX_QUANTITY}
          aria-label={`Sumar uno de ${product.name}`}
        >
          +
        </button>
      </div>

      <p className={styles.itemSubtotal}>
        <span className="visually-hidden">Subtotal: </span>
        {formatCLP(product.price * line.quantity)}
      </p>

      <button
        type="button"
        className={styles.remove}
        onClick={() => remove(line.productId)}
        aria-label={`Eliminar ${product.name} del carrito`}
      >
        Eliminar
      </button>
    </li>
  );
}
