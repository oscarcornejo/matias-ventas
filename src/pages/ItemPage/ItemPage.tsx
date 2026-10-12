import { Link, Navigate, useParams } from 'react-router';
import { useCatalog } from '../../catalog/CatalogContext';
import { useSession } from '../../auth/SessionContext';
import { useCartStore } from '../../store/cart';
import { canUseCart } from '../../../shared/permissions';
import { formatCLP } from '../../../shared/format';
import { savings } from '../../../shared/products';
import { Carousel } from '../../components/Carousel/Carousel';
import { Loading } from '../../components/Loading/Loading';
import { Icon } from '../../components/Icon/Icon';
import styles from './ItemPage.module.scss';

/** Detalle de un producto o de un combo, con el carrusel de fotos. */
export function ItemPage({ kind }: { kind: 'producto' | 'combo' }) {
  const { id } = useParams<{ id: string }>();
  const { findItem, loading, error } = useCatalog();
  const { user } = useSession();
  const add = useCartStore((state) => state.add);
  const lines = useCartStore((state) => state.lines);
  const puedeComprar = canUseCart(user?.role ?? null);

  if (loading) return <Loading label="Cargando el producto…" />;
  if (error) {
    return (
      <p className={styles.error} role="alert">
        {error}
      </p>
    );
  }

  const item = id ? findItem(id) : undefined;
  // Si no existe o ya no se vende, se vuelve a la tienda en vez de mostrar un vacío.
  if (!item || item.kind !== kind) return <Navigate to="/" replace />;

  const enCarrito = lines.find((line) => line.id === item.id)?.quantity ?? 0;
  const combo = item.kind === 'combo' ? item : null;
  const ahorro = combo ? savings(combo) : 0;

  return (
    <article className={styles.page}>
      <Link to="/" className={styles.volver}>
        <Icon name="flecha" size={18} />
        Volver a la tienda
      </Link>

      <div className={styles.contenido}>
        <div className={styles.fotos}>
          {item.images.length > 0 ? (
            <Carousel images={item.images} label={item.name} />
          ) : (
            <div className={styles.sinFoto}>
              <span aria-hidden="true">{item.emoji}</span>
            </div>
          )}
        </div>

        <div className={styles.datos}>
          {combo && <p className={styles.promoTag}>Combo</p>}

          <h1>{item.name}</h1>

          {combo && (
            <ul role="list" className={styles.lleva}>
              {combo.items.map((parte) => (
                <li key={parte.productId}>
                  <span aria-hidden="true">{parte.emoji}</span> {parte.quantity} × {parte.name}
                </li>
              ))}
            </ul>
          )}

          <p className={styles.precio}>
            {formatCLP(item.price)}
            {ahorro > 0 && combo && (
              <span className={styles.antes}>
                <span className="visually-hidden">, en vez de </span>
                {formatCLP(combo.fullPrice)}
              </span>
            )}
          </p>

          {ahorro > 0 && <p className={styles.ahorro}>Ahorras {formatCLP(ahorro)}</p>}

          {puedeComprar ? (
            <>
              <button type="button" className={styles.agregar} onClick={() => add(item.id, item.kind)}>
                <Icon name="mas" size={18} />
                Agregar al carrito
                {enCarrito > 0 && <span className={styles.enCarrito}>{enCarrito}</span>}
              </button>
              {enCarrito > 0 && (
                <Link to="/carrito" className={styles.irAlCarrito}>
                  Ir al carrito
                  <Icon name="flecha" size={18} />
                </Link>
              )}
            </>
          ) : (
            <p className={styles.nota} role="note">
              El perfil administrador no puede comprar.
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
