import type { CartItemInput, OrderDTO, SessionUser } from '../../shared/types';
import type { AdminProduct, AdminPromo, CatalogItem } from '../../shared/products';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly needsPassword = false,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...init,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...init.headers },
    });
  } catch {
    throw new ApiError('No hay conexión con el servidor. Revisa tu internet.', 0);
  }

  if (response.status === 204) return undefined as T;

  const data = (await response.json().catch(() => ({}))) as { error?: string; needsPassword?: boolean };
  if (!response.ok) {
    throw new ApiError(data.error ?? 'Ocurrió un error inesperado.', response.status, Boolean(data.needsPassword));
  }
  return data as T;
}

export interface ProductInput {
  name: string;
  price: number;
  emoji: string;
  visible?: boolean;
}

export interface PromoInput extends ProductInput {
  items: { productId: string; quantity: number }[];
}

export const api = {
  me: () => request<{ user: SessionUser }>('/auth/me'),
  catalog: () => request<{ items: CatalogItem[] }>('/productos'),
  login: (email: string, password?: string) =>
    request<{ user: SessionUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (email: string, password: string) =>
    request<{ user: SessionUser }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  checkout: (items: CartItemInput[]) =>
    request<{ orderId: string; initPoint: string }>('/checkout', {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),
  myOrders: () => request<{ orders: OrderDTO[] }>('/orders/mine'),
  order: (id: string) => request<{ order: OrderDTO }>(`/orders/${encodeURIComponent(id)}`),
  adminOrders: () => request<{ orders: OrderDTO[] }>('/admin/orders'),

  adminProducts: () => request<{ products: AdminProduct[] }>('/admin/productos'),

  /** La imagen ya viene redimensionada por el navegador (ver lib/image.ts). */
  uploadImage: (kind: 'producto' | 'combo', itemId: string, type: string, data: string) =>
    request<{ id: string }>(
      `/admin/imagenes/${kind === 'combo' ? 'promociones' : 'productos'}/${encodeURIComponent(itemId)}`,
      { method: 'POST', body: JSON.stringify({ type, data }) },
    ),
  deleteImage: (imageId: string) =>
    request<void>(`/admin/imagenes/${encodeURIComponent(imageId)}`, { method: 'DELETE' }),
  reorderImages: (ids: string[]) =>
    request<void>('/admin/imagenes/orden', { method: 'PATCH', body: JSON.stringify({ ids }) }),

  /** Guarda el orden del catálogo completo (productos y combos juntos). */
  saveOrder: (items: { id: string; kind: 'producto' | 'combo' }[]) =>
    request<void>('/admin/orden', { method: 'PATCH', body: JSON.stringify({ items }) }),

  adminPromos: () => request<{ promos: AdminPromo[] }>('/admin/promociones'),
  createPromo: (promo: PromoInput) =>
    request<{ id: string }>('/admin/promociones', { method: 'POST', body: JSON.stringify(promo) }),
  updatePromo: (id: string, promo: Partial<PromoInput>) =>
    request<void>(`/admin/promociones/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(promo),
    }),
  createProduct: (product: ProductInput) =>
    request<{ id: string }>('/admin/productos', { method: 'POST', body: JSON.stringify(product) }),
  updateProduct: (id: string, product: Partial<ProductInput>) =>
    request<void>(`/admin/productos/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(product),
    }),
  /** La imagen ya viene redimensionada por el navegador (ver lib/image.ts). */
};
