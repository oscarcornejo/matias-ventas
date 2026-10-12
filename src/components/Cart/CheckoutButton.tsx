import { useState } from 'react';
import { api } from '../../api/client';
import { useCartStore } from '../../store/cart';
import styles from './Cart.module.scss';

/** Redirección al checkout de Mercado Pago; separada para poder simularla en tests. */
export const redirectTo = {
  assign: (url: string) => window.location.assign(url),
};

export function CheckoutButton() {
  const lines = useCartStore((state) => state.lines);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    setPending(true);
    setError(null);
    try {
      // Solo se envían productos y cantidades: el servidor calcula los precios.
      const { initPoint } = await api.checkout(
        lines.map(({ productId, quantity }) => ({ productId, quantity })),
      );
      redirectTo.assign(initPoint);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos iniciar el pago.');
      setPending(false);
    }
  }

  return (
    <div className={styles.checkout}>
      <button
        type="button"
        className={styles.buy}
        onClick={handleCheckout}
        disabled={pending || lines.length === 0}
        aria-describedby={error ? 'checkout-error' : undefined}
      >
        {pending ? 'Redirigiendo a Mercado Pago…' : 'Comprar'}
      </button>
      {error && (
        <p id="checkout-error" className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
