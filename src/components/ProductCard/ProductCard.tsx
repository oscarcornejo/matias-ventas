import { Icon } from '../Icon/Icon';
import { formatCLP } from '../../../shared/format';
import { productImageUrl, type Product } from '../../../shared/products';
import styles from './ProductCard.module.scss';

interface ProductCardProps {
  product: Product;
  /** Si no se entrega (perfil administrador), la tarjeta no muestra botón de compra. */
  onAdd?: () => void;
  quantityInCart?: number;
  /**
   * Plano de color de fondo. Rota por posición en el catálogo en vez de atarse a
   * un producto concreto, porque ahora el catálogo lo administra Matías y puede
   * tener cualquier cantidad de productos.
   */
  tone?: number;
}

export function ProductCard({ product, onAdd, quantityInCart = 0, tone = 0 }: ProductCardProps) {
  const titleId = `producto-${product.id}`;
  const imagen = productImageUrl(product);
  return (
    <article className={styles.card} data-tone={tone % 3} aria-labelledby={titleId}>
      {/*
        Hueco reservado para la fotografía. Si Matías todavía no subió una, se
        muestra el emoji del producto sobre el plano de color. El alt va vacío a
        propósito: el nombre está justo debajo y repetirlo solo agrega ruido.
      */}
      <div className={styles.media}>
        {imagen ? (
          <img src={imagen} alt="" className={styles.photo} loading="lazy" decoding="async" />
        ) : (
          <span className={styles.stand} aria-hidden="true">
            {product.emoji}
          </span>
        )}
      </div>

      <div className={styles.body}>
        <h3 id={titleId} className={styles.name}>
          {product.name}
        </h3>
        <p className={styles.price}>
          <span className="visually-hidden">Precio: </span>
          {formatCLP(product.price)}
        </p>

        {onAdd && (
          <button type="button" className={styles.add} onClick={onAdd}>
            <Icon name="mas" size={18} />
            Agregar
            <span className="visually-hidden"> {product.name} al carrito</span>
            {quantityInCart > 0 && (
              <span className={styles.inCart}>
                <span aria-hidden="true">{quantityInCart}</span>
                <span className="visually-hidden">, ya tienes {quantityInCart} en el carrito</span>
              </span>
            )}
          </button>
        )}
      </div>
    </article>
  );
}
