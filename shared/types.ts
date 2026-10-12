export const ROLES = ['ADMIN', 'CLIENTE'] as const;
export type Role = (typeof ROLES)[number];

export const ORDER_STATUSES = ['PENDIENTE', 'PAGADA', 'RECHAZADA'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface SessionUser {
  id: string;
  email: string;
  role: Role;
}

export interface CartItemInput {
  productId: string;
  quantity: number;
}

export interface OrderItemDTO {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

export interface OrderDTO {
  id: string;
  status: OrderStatus;
  total: number;
  createdAt: string;
  items: OrderItemDTO[];
  customerEmail?: string;
}
