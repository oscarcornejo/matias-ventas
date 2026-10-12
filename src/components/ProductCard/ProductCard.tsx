import { formatCLP } from '../../../shared/format';
import type { Product } from '../../../shared/products';
import styles from './ProductCard.module.scss';

interface ProductCardProps {
  product: Product;
  /** Si no se entrega (perfil administrador), la tarjeta no muestra botón de compra. */
  onAdd?: () => void;
  quantityInCart?: number;
}

export function ProductCard({ product, onAdd, quantityInCart = 0 }: ProductCardProps) {
  const titleId = `producto-${product.id}`;
  return (
    <article className={styles.card} aria-labelledby={titleId}>
      <div className={styles.media} aria-hidden="true">
        <span className={styles.emoji}>{product.emoji}</span>
      </div>
      <div className={styles.body}>
        <h3 id={titleId} className={styles.name}>
          {product.name}
        </h3>
        <p className={styles.price}>
          <span className="visually-hidden">Precio: </span>
          {formatCLP(product.price)}
        </p>
      </div>
      {onAdd && (
        <button type="button" className={styles.add} onClick={onAdd}>
          <span aria-hidden="true">＋</span> Agregar
          <span className="visually-hidden"> {product.name} al carrito</span>
          {quantityInCart > 0 && (
            <span className={styles.inCart}>
              <span aria-hidden="true">· {quantityInCart}</span>
              <span className="visually-hidden">, ya tienes {quantityInCart}</span>
            </span>
          )}
        </button>
      )}
    </article>
  );
}
