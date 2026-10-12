import { useEffect, useRef, useState } from 'react';
import { Icon } from '../Icon/Icon';
import { formatCLP } from '../../../shared/format';
import { coverUrl, describePromo, imageUrl, savings, type CatalogItem } from '../../../shared/products';
import styles from './ProductCard.module.scss';

interface ProductCardProps {
  item: CatalogItem;
  /** Si no se entrega (perfil administrador), la tarjeta no muestra botón de compra. */
  onAdd?: () => void;
  quantityInCart?: number;
  /**
   * Plano de color de fondo. Rota por posición en el catálogo en vez de atarse a
   * un producto concreto, porque el catálogo lo administra Matías y puede tener
   * cualquier cantidad de productos.
   */
  tone?: number;
}

export function ProductCard({ item, onAdd, quantityInCart = 0, tone = 0 }: ProductCardProps) {
  const titleId = `item-${item.id}`;
  // Se guarda el combo ya acotado: un booleano no le sirve a TypeScript para
  // saber que `fullPrice` existe.
  const combo = item.kind === 'combo' ? item : null;
  const ahorro = combo ? savings(combo) : 0;

  return (
    <article className={styles.card} data-tone={tone % 3} data-combo={combo ? 'true' : undefined} aria-labelledby={titleId}>
      {/*
        Hueco reservado para la fotografía. Si todavía no hay una, se muestra el
        emoji sobre el plano de color. El alt va vacío a propósito: el nombre está
        justo debajo y repetirlo solo agrega ruido.
      */}
      <Media item={item} />

      <div className={styles.body}>
        {combo && <p className={styles.promoTag}>Combo</p>}

        <h3 id={titleId} className={styles.name}>
          {item.name}
        </h3>

        {combo && <p className={styles.contents}>{describePromo(combo)}</p>}

        <p className={styles.price}>
          <span className="visually-hidden">Precio: </span>
          {formatCLP(item.price)}
          {combo && ahorro > 0 && (
            <span className={styles.before}>
              <span className="visually-hidden">, en vez de </span>
              {formatCLP(combo.fullPrice)}
            </span>
          )}
        </p>

        {ahorro > 0 && <p className={styles.savings}>Ahorras {formatCLP(ahorro)}</p>}

        {onAdd && (
          <button type="button" className={styles.add} onClick={onAdd}>
            <Icon name="mas" size={18} />
            Agregar
            <span className="visually-hidden"> {item.name} al carrito</span>
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

/**
 * Hueco de la fotografía. Con más de una foto, pasar el mouse por encima las va
 * mostrando una tras otra, para poder ver el producto sin entrar a su página.
 *
 * Es solo para mouse: en una pantalla táctil no existe el "pasar por encima", así
 * que ahí la tarjeta muestra la portada y las demás fotos se ven al abrir el
 * producto, donde está el carrusel completo con gesto nativo.
 */
function Media({ item }: { item: CatalogItem }) {
  const portada = coverUrl(item);
  const fotos = item.images;
  const [indice, setIndice] = useState(0);
  const [encima, setEncima] = useState(false);
  const precargadas = useRef(false);

  const puedeRotar = fotos.length > 1;

  useEffect(() => {
    if (!encima || !puedeRotar) {
      setIndice(0);
      return;
    }
    // Quien pidió menos movimiento no recibe una rotación automática.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const id = setInterval(() => setIndice((i) => (i + 1) % fotos.length), 1100);
    return () => clearInterval(id);
  }, [encima, puedeRotar, fotos.length]);

  // Las siguientes se piden recién al apuntar: no conviene bajar ocho fotos por
  // producto en una tienda que se usa con mala señal.
  function precargar() {
    if (precargadas.current || !puedeRotar) return;
    precargadas.current = true;
    fotos.slice(1).forEach((id) => {
      const img = new Image();
      img.src = imageUrl(id);
    });
  }

  if (!portada) {
    return (
      <div className={styles.media}>
        <span className={styles.stand} aria-hidden="true">
          {item.emoji}
        </span>
      </div>
    );
  }

  return (
    <div
      className={styles.media}
      onPointerEnter={(e) => {
        if (e.pointerType !== 'mouse') return;
        precargar();
        setEncima(true);
      }}
      onPointerLeave={() => setEncima(false)}
    >
      {fotos.map((id, i) => (
        <img
          key={id}
          src={imageUrl(id)}
          alt=""
          className={styles.photo}
          data-activa={i === indice ? 'true' : undefined}
          loading={i === 0 ? 'lazy' : undefined}
          decoding="async"
          aria-hidden={i === indice ? undefined : true}
        />
      ))}

      {puedeRotar && (
        <span className={styles.puntos} data-visible={encima ? 'true' : undefined} aria-hidden="true">
          {fotos.map((id, i) => (
            <span key={id} className={styles.punto} data-activo={i === indice ? 'true' : undefined} />
          ))}
        </span>
      )}
    </div>
  );
}
