import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { StorePage } from '../../src/pages/StorePage/StorePage';
import { CartPage } from '../../src/pages/CartPage/CartPage';
import { Header } from '../../src/components/Header/Header';
import { useCartStore } from '../../src/store/cart';
import { api } from '../../src/api/client';
import { canUseCart } from '../../shared/permissions';
import { adminUser, clientUser, renderWithSession } from './renderWithSession';

/** La tienda, el carrito y un destino simulado para /registro. */
function renderTienda(user: Parameters<typeof renderWithSession>[1] = null, initialPath = '/') {
  return renderWithSession(
    <Routes>
      <Route path="/" element={<StorePage />} />
      <Route path="/carrito" element={<CartPage />} />
      <Route path="/registro" element={<h1>Crear cuenta</h1>} />
    </Routes>,
    user,
    { initialPath },
  );
}

describe('visita sin cuenta: ve la tienda y se registra para comprar', () => {
  beforeEach(() => {
    useCartStore.getState().clear();
    vi.restoreAllMocks();
  });

  it('canUseCart permite al cliente y a la visita sin cuenta, nunca al administrador', () => {
    expect(canUseCart(null)).toBe(true);
    expect(canUseCart('CLIENTE')).toBe(true);
    expect(canUseCart('ADMIN')).toBe(false);
  });

  it('ve los productos con precio y puede agregarlos sin tener cuenta', async () => {
    const user = userEvent.setup();
    renderTienda();

    expect(screen.getByRole('heading', { name: 'Chirlito Suffle' })).toBeInTheDocument();
    expect(screen.getByText('$400')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Agregar Grosso Crunch al carrito/ }));

    expect(useCartStore.getState().lines).toEqual([{ productId: 'p-grosso', quantity: 1 }]);
  });

  it('el carrito tiene su propia página y muestra el total', () => {
    useCartStore.getState().add('p-grosso');
    useCartStore.getState().increment('p-grosso');
    renderTienda(null, '/carrito');

    expect(screen.getByRole('heading', { name: 'Tu carrito' })).toBeInTheDocument();
    expect(screen.getByText('Grosso Crunch')).toBeInTheDocument();
    expect(screen.getByTestId('cart-total').textContent?.replace(/\s/g, '')).toBe('$400');
  });

  it('avisa en el carrito que se pedirá una cuenta antes de pagar', () => {
    useCartStore.getState().add('p-chirlito');
    renderTienda(null, '/carrito');

    expect(screen.getByText(/Te pediremos crear una cuenta antes de pagar/)).toBeInTheDocument();
  });

  it('"Comprar" lleva al registro y no llama al checkout', async () => {
    const user = userEvent.setup();
    const checkout = vi.spyOn(api, 'checkout');
    useCartStore.getState().add('p-alfajor');
    renderTienda(null, '/carrito');

    await user.click(screen.getByRole('button', { name: 'Comprar' }));

    expect(screen.getByRole('heading', { name: 'Crear cuenta' })).toBeInTheDocument();
    expect(checkout).not.toHaveBeenCalled();
  });

  it('el carrito sobrevive al registro: sigue guardado en el navegador', async () => {
    const user = userEvent.setup();
    useCartStore.getState().add('p-alfajor');
    renderTienda(null, '/carrito');

    await user.click(screen.getByRole('button', { name: 'Comprar' }));

    expect(useCartStore.getState().lines).toEqual([{ productId: 'p-alfajor', quantity: 1 }]);
  });

  it('desde la tienda, la barra de celular lleva al carrito', async () => {
    useCartStore.getState().add('p-chirlito');
    renderTienda();

    const irAlCarrito = screen.getByRole('link', { name: /Ver carrito/ });
    expect(irAlCarrito).toHaveAttribute('href', '/carrito');
  });

  it('el encabezado sin cuenta ofrece entrar, crear cuenta y ver el carrito', () => {
    renderWithSession(<Header />, null);

    expect(screen.getByRole('link', { name: 'Entrar' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Crear cuenta' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ver carrito/ })).toHaveAttribute('href', '/carrito');
    expect(screen.getByRole('link', { name: 'Mati Ventas' })).toBeInTheDocument();
    // Sin cuenta solo existe la tienda, así que no se muestra navegación.
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cerrar sesión' })).not.toBeInTheDocument();
  });

  it('con sesión de cliente el encabezado ofrece navegar a "Mis compras"', () => {
    renderWithSession(<Header />, clientUser);

    const nav = screen.getByRole('navigation');
    expect(within(nav).getByRole('link', { name: 'Productos' })).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Mis compras' })).toBeInTheDocument();
  });

  it('el administrador sigue sin ver el carrito en la tienda pública', () => {
    useCartStore.getState().add('p-chirlito');
    renderWithSession(<StorePage />, adminUser);

    expect(screen.queryByRole('button', { name: /Agregar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Ver carrito/ })).not.toBeInTheDocument();
  });
});
