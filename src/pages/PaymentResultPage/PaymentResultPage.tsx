import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { api } from '../../api/client';
import { useCartStore } from '../../store/cart';
import { StatusBadge } from '../../components/StatusBadge/StatusBadge';
import { Loading } from '../../components/Loading/Loading';
import { Icon, type IconName } from '../../components/Icon/Icon';
import { formatCLP } from '../../../shared/format';
import type { OrderDTO } from '../../../shared/types';
import styles from './PaymentResultPage.module.scss';

export type PaymentResult = 'aprobado' | 'pendiente' | 'rechazado';

const COPY: Record<PaymentResult, { icon: IconName; title: string; text: string }> = {
  aprobado: {
    icon: 'listo',
    title: 'Pago aprobado',
    text: 'Listo. Matías ya ve tu compra y te la entrega en el colegio.',
  },
  pendiente: {
    icon: 'reloj',
    title: 'Pago pendiente',
    text: 'Mercado Pago todavía está procesando tu pago. Cuando se confirme lo verás en "Mis compras".',
  },
  rechazado: {
    icon: 'cerrar',
    title: 'Pago rechazado',
    text: 'No se pudo completar el pago. Tu carrito sigue guardado para que lo intentes de nuevo.',
  },
};

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 10;

export function PaymentResultPage({ result }: { result: PaymentResult }) {
  const [params] = useSearchParams();
  const orderId = params.get('orden') ?? params.get('external_reference');
  const clearCart = useCartStore((state) => state.clear);
  const [order, setOrder] = useState<OrderDTO | null>(null);
  const [loading, setLoading] = useState(Boolean(orderId));
  const headingRef = useRef<HTMLHeadingElement>(null);
  const copy = COPY[result];

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  // El pedido ya se creó en Mercado Pago: si no fue rechazado, el carrito se vacía.
  useEffect(() => {
    if (result !== 'rechazado') clearCart();
  }, [result, clearCart]);

  // El estado real viene de la base de datos (actualizada por el webhook), no de la URL.
  // Si aún está pendiente, se consulta algunas veces más mientras llega la notificación.
  useEffect(() => {
    if (!orderId) return;
    let active = true;
    let polls = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const load = async () => {
      try {
        const { order: current } = await api.order(orderId);
        if (!active) return;
        setOrder(current);
        polls += 1;
        if (current.status === 'PENDIENTE' && result !== 'pendiente' && polls < MAX_POLLS) {
          timer = setTimeout(load, POLL_INTERVAL_MS);
        }
      } catch {
        // Sin acceso a la orden: se muestra solo el mensaje de Mercado Pago.
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [orderId, result]);

  return (
    <section className={styles.page} aria-labelledby="resultado-titulo">
      <div className={`${styles.card} ${styles[result] ?? ''}`}>
        <span className={styles.icon}>
          <Icon name={copy.icon} size={28} />
        </span>
        <h1 id="resultado-titulo" ref={headingRef} tabIndex={-1}>
          {copy.title}
        </h1>
        <p className={styles.text}>{copy.text}</p>

        {loading && <Loading label="Consultando el estado de tu orden…" />}

        {order && (
          <dl className={styles.details}>
            <div>
              <dt>Orden</dt>
              <dd className={styles.mono}>{order.id}</dd>
            </div>
            <div>
              <dt>Total</dt>
              <dd>{formatCLP(order.total)}</dd>
            </div>
            <div>
              <dt>Estado</dt>
              <dd aria-live="polite">
                <StatusBadge status={order.status} />
              </dd>
            </div>
          </dl>
        )}

        <div className={styles.actions}>
          <Link to="/mis-compras" className={styles.primary}>
            Ver mis compras
          </Link>
          <Link to={result === 'rechazado' ? '/#carrito' : '/'} className={styles.secondary}>
            {result === 'rechazado' ? 'Volver al carrito' : 'Seguir comprando'}
          </Link>
        </div>
      </div>
    </section>
  );
}
