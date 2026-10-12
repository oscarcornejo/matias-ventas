import { Link, NavLink, useNavigate } from 'react-router';
import { useSession } from '../../auth/SessionContext';
import { Icon } from '../Icon/Icon';
import { useCart } from '../../catalog/useCart';
import { canUseCart } from '../../../shared/permissions';
import styles from './Header.module.scss';

export function Header() {
  const { user, logout } = useSession();
  // El contador sale de las mismas líneas que muestra el carrito, no de las
  // líneas crudas del navegador: si no coincidieran, el encabezado prometería
  // productos que la página del carrito no puede mostrar.
  const { lines } = useCart();
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  const navigate = useNavigate();
  const showCart = canUseCart(user?.role ?? null);

  async function handleLogout() {
    await logout();
    // La tienda es pública: al cerrar sesión se vuelve al catálogo, no al acceso.
    navigate('/', { replace: true });
  }

  const navClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? `${styles.navLink} ${styles.active}` : styles.navLink;

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/" className={styles.brand}>
          Mati Ventas
        </Link>

        {user && (
          <nav aria-label="Principal" className={styles.nav}>
            {/* Para el admin el primer enlace se llama "Tienda": "Productos" es
                su panel de administración, y dos enlaces con el mismo nombre
                apuntando a sitios distintos confunden. */}
            <NavLink to="/" end className={navClass}>
              {showCart ? 'Productos' : 'Tienda'}
            </NavLink>
            {showCart ? (
              <NavLink to="/mis-compras" className={navClass}>
                Mis compras
              </NavLink>
            ) : (
              <>
                <NavLink to="/admin/productos" className={navClass}>
                  Productos
                </NavLink>
                <NavLink to="/admin/compras" className={navClass}>
                  Compras
                </NavLink>
              </>
            )}
          </nav>
        )}

        <div className={styles.account}>
          {showCart && (
            <Link to="/carrito" className={styles.cartLink}>
              <Icon name="carrito" size={20} />
              <span className="visually-hidden">Ver carrito, </span>
              <span className={styles.badge} data-filled={count > 0 ? 'true' : undefined}>
                {count}
                <span className="visually-hidden"> {count === 1 ? 'producto' : 'productos'}</span>
              </span>
            </Link>
          )}

          {user ? (
            <>
              <span className={styles.email} title={user.email}>
                {user.role === 'ADMIN' && <span className={styles.roleTag}>Admin</span>}
                <span className={styles.emailText}>{user.email}</span>
              </span>
              <button type="button" className={styles.ghost} onClick={handleLogout}>
                <Icon name="salir" size={18} />
                <span className={styles.ghostText}>Cerrar sesión</span>
              </button>
            </>
          ) : (
            <>
              <Link to="/acceso" className={styles.ghost}>
                <Icon name="persona" size={18} />
                <span className={styles.ghostText}>Entrar</span>
              </Link>
              <Link to="/registro" className={styles.signup}>
                Crear cuenta
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
