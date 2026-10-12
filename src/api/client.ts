import type { CartItemInput, OrderDTO, SessionUser } from '../../shared/types';

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

export const api = {
  me: () => request<{ user: SessionUser }>('/auth/me'),
  login: (email: string, password?: string) =>
    request<{ user: SessionUser }>('/auth/login', {
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
};
