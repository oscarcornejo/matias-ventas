import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Cart } from '../../src/components/Cart/Cart';
import { redirectTo } from '../../src/components/Cart/CheckoutButton';
import { useCartStore } from '../../src/store/cart';
import { api, ApiError } from '../../src/api/client';
import { clientUser, renderWithSession } from './renderWithSession';

/** El carrito de un cliente con sesión: el caso que cubren estas pruebas. */
const renderCart = () => renderWithSession(<Cart />, clientUser);
import { StorePage } from '../../src/pages/StorePage/StorePage';

/** Normaliza espacios (Intl usa espacios especiales en algunos entornos). */
const total = () => screen.getByTestId('cart-total').textContent?.replace(/\s/g, '');

describe('<Cart />', () => {
  beforeEach(() => {
    useCartStore.getState().clear();
    vi.restoreAllMocks();
  });

  it('muestra el estado vacío y no muestra "Comprar"', () => {
    renderCart();
    expect(screen.getByText('Tu carrito está vacío.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Comprar' })).not.toBeInTheDocument();
  });

  it('muestra productos, subtotal y total en pesos chilenos', () => {
    useCartStore.getState().add('p-chirlito', 'producto');
    useCartStore.getState().add('p-alfajor', 'producto');
    renderCart();

    expect(screen.getByText('Chirlito Suffle')).toBeInTheDocument();
    expect(screen.getByText('Alfajor Panchito')).toBeInTheDocument();
    expect(total()).toBe('$700');
    expect(screen.getByRole('button', { name: 'Comprar' })).toBeEnabled();
  });

  it('sube, baja y elimina productos actualizando el total', async () => {
    const user = userEvent.setup();
    useCartStore.getState().add('p-grosso', 'producto');
    renderCart();

    const sumar = screen.getByRole('button', { name: 'Sumar uno de Grosso Crunch' });
    const restar = screen.getByRole('button', { name: 'Restar uno de Grosso Crunch' });
    expect(restar).toBeDisabled();

    await user.click(sumar);
    await user.click(sumar);
    expect(total()).toBe('$600');
    expect(restar).toBeEnabled();

    await user.click(restar);
    expect(total()).toBe('$400');

    await user.click(screen.getByRole('button', { name: 'Eliminar Grosso Crunch del carrito' }));
    expect(screen.getByText('Tu carrito está vacío.')).toBeInTheDocument();
  });

  it('se puede usar completamente con teclado', async () => {
    const user = userEvent.setup();
    useCartStore.getState().add('p-chirlito', 'producto');
    useCartStore.getState().increment('p-chirlito');
    renderCart();

    await user.tab(); // "Restar uno"
    expect(screen.getByRole('button', { name: 'Restar uno de Chirlito Suffle' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(total()).toBe('$300');

    // "Restar" quedó deshabilitado (cantidad 1): el foco sigue el orden natural.
    await user.tab();
    expect(screen.getByRole('button', { name: 'Sumar uno de Chirlito Suffle' })).toHaveFocus();
    await user.keyboard(' ');
    expect(total()).toBe('$600');

    await user.tab();
    expect(screen.getByRole('button', { name: 'Eliminar Chirlito Suffle del carrito' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Comprar' })).toHaveFocus();
  });

  it('"Comprar" envía solo productos y cantidades y redirige al init_point de Mercado Pago', async () => {
    const user = userEvent.setup();
    const checkout = vi
      .spyOn(api, 'checkout')
      .mockResolvedValue({ orderId: 'orden-1', initPoint: 'https://www.mercadopago.cl/checkout/v1/redirect?pref_id=1' });
    const assign = vi.spyOn(redirectTo, 'assign').mockImplementation(() => undefined);

    useCartStore.getState().add('p-alfajor', 'producto');
    useCartStore.getState().increment('p-alfajor');
    renderCart();

    await user.click(screen.getByRole('button', { name: 'Comprar' }));

    expect(checkout).toHaveBeenCalledWith([{ id: 'p-alfajor', kind: 'producto', quantity: 2 }]);
    expect(assign).toHaveBeenCalledWith('https://www.mercadopago.cl/checkout/v1/redirect?pref_id=1');
  });

  it('muestra el error si el servidor rechaza la compra', async () => {
    const user = userEvent.setup();
    vi.spyOn(api, 'checkout').mockRejectedValue(new ApiError('No pudimos conectar con Mercado Pago.', 502));
    useCartStore.getState().add('p-grosso', 'producto');
    renderCart();

    await user.click(screen.getByRole('button', { name: 'Comprar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos conectar con Mercado Pago.');
    expect(screen.getByRole('button', { name: 'Comprar' })).toBeEnabled();
  });

  it('desde la tienda, "Agregar" suma el producto al carrito y lo anuncia', async () => {
    const user = userEvent.setup();
    renderWithSession(<StorePage />, clientUser);

    await user.click(screen.getByRole('button', { name: /Agregar Grosso Crunch al carrito/ }));
    await user.click(screen.getByRole('button', { name: /Agregar Grosso Crunch al carrito/ }));

    expect(useCartStore.getState().lines).toEqual([{ id: 'p-grosso', kind: 'producto', quantity: 2 }]);
    expect(screen.getByText(/Agregaste Grosso Crunch al carrito/)).toBeInTheDocument();
  });
});
