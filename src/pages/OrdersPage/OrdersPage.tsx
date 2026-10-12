import { Link } from 'react-router';
import { api } from '../../api/client';
import { useAsync } from '../../hooks/useAsync';
import { Loading } from '../../components/Loading/Loading';
import { OrdersTable } from '../../components/OrdersTable/OrdersTable';
import { formatCLP } from '../../../shared/format';
import styles from './OrdersPage.module.scss';

/** Compras del cliente actual. */
export function MyOrdersPage() {
  const result = useAsync(() => api.myOrders(), []);

  return (
    <section aria-labelledby="mis-compras-titulo" className={styles.page}>
      <h1 id="mis-compras-titulo">Mis compras</h1>
      {result.status === 'loading' && <Loading label="Cargando tus compras…" />}
      {result.status === 'error' && <LoadError message={result.error} onRetry={result.retry} />}
      {result.status === 'success' &&
        (result.data.orders.length === 0 ? (
          <div className={styles.empty}>
            <p>Todavía no tienes compras.</p>
            <Link to="/" className={styles.cta}>
              Ver productos
            </Link>
          </div>
        ) : (
          <OrdersTable orders={result.data.orders} caption="Tus compras" />
        ))}
    </section>
  );
}

/** Todas las compras de los clientes (solo administrador). */
export function AdminOrdersPage() {
  const result = useAsync(() => api.adminOrders(), []);
  const orders = result.status === 'success' ? result.data.orders : [];
  const paid = orders.filter((order) => order.status === 'PAGADA');

  return (
    <section aria-labelledby="admin-compras-titulo" className={styles.page}>
      <div className={styles.headRow}>
        <h1 id="admin-compras-titulo">Compras de clientes</h1>
        <button type="button" className={styles.refresh} onClick={result.retry}>
          Actualizar
        </button>
      </div>

      {result.status === 'success' && (
        <dl className={styles.stats}>
          <div>
            <dt>Compras</dt>
            <dd>{orders.length}</dd>
          </div>
          <div>
            <dt>Pagadas</dt>
            <dd>{paid.length}</dd>
          </div>
          <div>
            <dt>Recaudado</dt>
            <dd>{formatCLP(paid.reduce((sum, order) => sum + order.total, 0))}</dd>
          </div>
        </dl>
      )}

      {result.status === 'loading' && <Loading label="Cargando compras…" />}
      {result.status === 'error' && <LoadError message={result.error} onRetry={result.retry} />}
      {result.status === 'success' &&
        (orders.length === 0 ? (
          <p className={styles.empty}>Aún no hay compras registradas.</p>
        ) : (
          <OrdersTable orders={orders} caption="Compras de todos los clientes" showCustomer />
        ))}
    </section>
  );
}

function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className={styles.error} role="alert">
      <p>{message}</p>
      <button type="button" className={styles.refresh} onClick={onRetry}>
        Reintentar
      </button>
    </div>
  );
}
