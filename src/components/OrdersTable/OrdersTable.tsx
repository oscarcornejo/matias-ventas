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
      {/*
        En celular las filas pasan a bloques y las celdas a flex para verse como
        tarjetas. Eso hace que el navegador descarte los roles implícitos de tabla,
        así que se declaran explícitos: sin ellos, un lector de pantalla leería una
        lista de textos sueltos en vez de filas con sus encabezados.
      */}
      <table role="table" className={styles.table}>
        <caption className="visually-hidden">{caption}</caption>
        <thead role="rowgroup" className={styles.head}>
          <tr role="row">
            <th role="columnheader" scope="col">
              Fecha
            </th>
            {showCustomer && (
              <th role="columnheader" scope="col">
                Cliente
              </th>
            )}
            <th role="columnheader" scope="col">
              Productos
            </th>
            <th role="columnheader" scope="col" className={styles.numeric}>
              Total
            </th>
            <th role="columnheader" scope="col">
              Estado de pago
            </th>
          </tr>
        </thead>
        <tbody role="rowgroup">
          {orders.map((order) => (
            <tr role="row" key={order.id}>
              <td role="cell" data-label="Fecha">
                <time dateTime={order.createdAt}>{formatDateTime(order.createdAt)}</time>
              </td>
              {showCustomer && (
                <td role="cell" data-label="Cliente" className={styles.customer}>
                  {order.customerEmail}
                </td>
              )}
              <td role="cell" data-label="Productos">
                {itemsSummary(order)}
              </td>
              <td role="cell" data-label="Total" className={`${styles.numeric} ${styles.total}`}>
                {formatCLP(order.total)}
              </td>
              <td role="cell" data-label="Estado de pago">
                <StatusBadge status={order.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
