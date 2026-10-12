import { Link, NavLink, useNavigate } from 'react-router';
import { useSession } from '../../auth/SessionContext';
import { selectCount, useCartStore } from '../../store/cart';
import { canPurchase } from '../../../shared/permissions';
import styles from './Header.module.scss';

export function Header() {
  const { user, logout } = useSession();
  const count = useCartStore(selectCount);
  const navigate = useNavigate();
  const isClient = user ? canPurchase(user.role) : false;

  async function handleLogout() {
    await logout();
    navigate('/acceso', { replace: true });
  }

  const navClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? `${styles.navLink} ${styles.active}` : styles.navLink;

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        {user && (
          <nav aria-label="Principal" className={styles.nav}>
            <NavLink to="/" end className={navClass}>
              Productos
            </NavLink>
            {isClient ? (
              <NavLink to="/mis-compras" className={navClass}>
                Mis compras
              </NavLink>
            ) : (
              <NavLink to="/admin/compras" className={navClass}>
                Compras
              </NavLink>
            )}
          </nav>
        )}

        <div className={styles.end}>
          {user && (
            <div className={styles.account}>
              {isClient && (
                <Link to="/#carrito" className={styles.cartLink}>
                  <span aria-hidden="true">🛒</span>
                  <span className="visually-hidden">Ver carrito, </span>
                  <span className={styles.badge}>
                    {count}
                    <span className="visually-hidden"> {count === 1 ? 'producto' : 'productos'}</span>
                  </span>
                </Link>
              )}
              <span className={styles.email} title={user.email}>
                {user.role === 'ADMIN' && <span className={styles.roleTag}>Admin</span>}
                {user.email}
              </span>
              <button type="button" className={styles.logout} onClick={handleLogout}>
                Cerrar sesión
              </button>
            </div>
          )}
          <Link to="/" className={styles.brand} aria-label="Mati Ventas, ir al inicio">
            Mati Ventas
          </Link>
        </div>
      </div>
    </header>
  );
}
