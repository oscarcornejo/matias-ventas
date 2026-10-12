import { Link } from 'react-router';
import { useCart } from '../../catalog/useCart';
import { useSession } from '../../auth/SessionContext';
import { canUseCart } from '../../../shared/permissions';
import { Cart } from '../../components/Cart/Cart';
import { Loading } from '../../components/Loading/Loading';
import { Icon } from '../../components/Icon/Icon';
import { Navigate } from 'react-router';
import styles from './CartPage.module.scss';

/** El carrito tiene página propia: en la tienda ya no hay panel lateral. */
export function CartPage() {
  const { user } = useSession();
  const { ready } = useCart();

  // El administrador no compra, así que el carrito no le corresponde.
  if (user && !canUseCart(user.role)) return <Navigate to="/admin/compras" replace />;

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1 id="carrito-titulo">Tu carrito</h1>
        <Link to="/" className={styles.back}>
          <Icon name="flecha" size={18} />
          Seguir comprando
        </Link>
      </div>

      {ready ? <Cart /> : <Loading label="Cargando tu carrito…" />}
    </div>
  );
}
