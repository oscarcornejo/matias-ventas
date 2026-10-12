import type { OrderStatus } from '../../../shared/types';
import { Icon, type IconName } from '../Icon/Icon';
import styles from './StatusBadge.module.scss';

const LABELS: Record<OrderStatus, { text: string; icon: IconName; className: string }> = {
  PENDIENTE: { text: 'Pendiente', icon: 'reloj', className: styles.pending ?? '' },
  PAGADA: { text: 'Pagada', icon: 'listo', className: styles.paid ?? '' },
  RECHAZADA: { text: 'Rechazada', icon: 'cerrar', className: styles.rejected ?? '' },
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const { text, icon, className } = LABELS[status];
  return (
    <span className={`${styles.badge} ${className}`}>
      <Icon name={icon} size={14} />
      {text}
    </span>
  );
}
