import { beforeEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { StorePage } from '../../src/pages/StorePage/StorePage';
import { CartPage } from '../../src/pages/CartPage/CartPage';
import { Header } from '../../src/components/Header/Header';
import { useCartStore } from '../../src/store/cart';
import { canPurchase } from '../../shared/permissions';
import { adminUser, clientUser, renderWithSession } from './renderWithSession';

describe('regla: el administrador no puede comprar (interfaz)', () => {
  beforeEach(() => {
    // Incluso con productos en el carrito del navegador, el admin no debe verlo.
    useCartStore.getState().clear();
    useCartStore.getState().add('p-chirlito');
  });

  it('canPurchase solo permite al perfil cliente', () => {
    expect(canPurchase('CLIENTE')).toBe(true);
    expect(canPurchase('ADMIN')).toBe(false);
  });

  it('el administrador ve los productos con nombre y precio', () => {
    renderWithSession(<StorePage />, adminUser);
    expect(screen.getByRole('heading', { name: 'Chirlito Suffle' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Grosso Crunch' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Alfajor Panchito' })).toBeInTheDocument();
    expect(screen.getByText('$400')).toBeInTheDocument();
  });

  it('el administrador NO ve carrito, botones "Agregar" ni "Comprar"', () => {
    renderWithSession(<StorePage />, adminUser);
    expect(screen.queryByRole('region', { name: 'Tu carrito' })).not.toBeInTheDocument();
    expect(screen.queryByRole('complementary', { name: 'Carrito de compras' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Agregar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Comprar' })).not.toBeInTheDocument();
    expect(screen.getByText(/este perfil no puede comprar/)).toBeInTheDocument();
  });

  it('el encabezado del administrador no tiene acceso al carrito', () => {
    renderWithSession(<Header />, adminUser);
    expect(screen.queryByRole('link', { name: /Ver carrito/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Compras' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mati Ventas' })).toBeInTheDocument();
  });

  it('el cliente sí ve "Agregar" en la tienda', () => {
    renderWithSession(<StorePage />, clientUser);
    expect(screen.getAllByRole('button', { name: /Agregar/ })).toHaveLength(3);
  });

  it('el cliente sí puede abrir el carrito y comprar', () => {
    useCartStore.getState().add('p-chirlito');
    renderWithSession(<CartPage />, clientUser);
    expect(screen.getByRole('heading', { name: 'Tu carrito' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Comprar' })).toBeInTheDocument();
  });
});
