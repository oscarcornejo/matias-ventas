import { formatCLP, formatDateTime } from '../../../shared/format';
import type { OrderDTO } from '../../../shared/types';
import { StatusBadge } from '../StatusBadge/StatusBadge';
import styles from './OrdersTable.module.scss';

interface OrdersTableProps {
  orders: OrderDTO[];
  caption: string;
  showCustomer?: boolean;
}

function itemsSummary(order: OrderDTO): string {
  return order.items.map((item) => `${item.quantity} × ${item.name}`).join(', ');
}

/** Tabla en escritorio; en celular cada fila se muestra como tarjeta. */
export function OrdersTable({ orders, caption, showCustomer = false }: OrdersTableProps) {
  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Fecha</th>
            {showCustomer && <th scope="col">Cliente</th>}
            <th scope="col">Productos</th>
            <th scope="col" className={styles.numeric}>
              Total
            </th>
            <th scope="col">Estado de pago</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td data-label="Fecha">
                <time dateTime={order.createdAt}>{formatDateTime(order.createdAt)}</time>
              </td>
              {showCustomer && (
                <td data-label="Cliente" className={styles.customer}>
                  {order.customerEmail}
                </td>
              )}
              <td data-label="Productos">{itemsSummary(order)}</td>
              <td data-label="Total" className={`${styles.numeric} ${styles.total}`}>
                {formatCLP(order.total)}
              </td>
              <td data-label="Estado de pago">
                <StatusBadge status={order.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
