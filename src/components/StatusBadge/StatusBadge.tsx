import type { OrderStatus } from '../../../shared/types';
import styles from './StatusBadge.module.scss';

const LABELS: Record<OrderStatus, { text: string; icon: string; className: string }> = {
  PENDIENTE: { text: 'Pendiente', icon: '⏳', className: styles.pending ?? '' },
  PAGADA: { text: 'Pagada', icon: '✓', className: styles.paid ?? '' },
  RECHAZADA: { text: 'Rechazada', icon: '✕', className: styles.rejected ?? '' },
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const { text, icon, className } = LABELS[status];
  return (
    <span className={`${styles.badge} ${className}`}>
      <span aria-hidden="true">{icon}</span> {text}
    </span>
  );
}
