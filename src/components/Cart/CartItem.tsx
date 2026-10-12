import { MAX_QUANTITY, useCartStore } from '../../store/cart';
import { formatCLP } from '../../../shared/format';
import { coverUrl, describePromo } from '../../../shared/products';
import { Icon } from '../Icon/Icon';
import type { CartLineView } from '../../catalog/useCart';
import styles from './Cart.module.scss';

export function CartItem({ line }: { line: CartLineView }) {
  const increment = useCartStore((state) => state.increment);
  const decrement = useCartStore((state) => state.decrement);
  const remove = useCartStore((state) => state.remove);
  const { item, quantity, subtotal } = line;
  const imagen = coverUrl(item);

  return (
    <li className={styles.item}>
      <span className={styles.itemThumb} aria-hidden="true">
        {imagen ? <img src={imagen} alt="" className={styles.itemImg} /> : item.emoji}
      </span>

      <div className={styles.itemInfo}>
        <p className={styles.itemName}>{item.name}</p>
        {item.kind === 'combo' && <p className={styles.itemContents}>{describePromo(item)}</p>}
        <p className={styles.itemUnit}>{formatCLP(item.price)} c/u</p>
      </div>

      <div className={styles.stepper} role="group" aria-label={`Cantidad de ${item.name}`}>
        <button
          type="button"
          className={styles.stepButton}
          onClick={() => decrement(item.id)}
          disabled={quantity <= 1}
          aria-label={`Restar uno de ${item.name}`}
        >
          <Icon name="menos" size={16} />
        </button>
        <output className={styles.quantity} aria-live="polite">
          {quantity}
        </output>
        <button
          type="button"
          className={styles.stepButton}
          onClick={() => increment(item.id)}
          disabled={quantity >= MAX_QUANTITY}
          aria-label={`Sumar uno de ${item.name}`}
        >
          <Icon name="mas" size={16} />
        </button>
      </div>

      <p className={styles.itemSubtotal}>
        <span className="visually-hidden">Subtotal: </span>
        {formatCLP(subtotal)}
      </p>

      <button
        type="button"
        className={styles.remove}
        onClick={() => remove(item.id)}
        aria-label={`Eliminar ${item.name} del carrito`}
      >
        <Icon name="basurero" size={16} />
      </button>
    </li>
  );
}
