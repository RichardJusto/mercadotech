import type { OrderStatus } from "@/lib/constants/roles";

// Secuencia de avance que puede recorrer un vendedor. 'cancelado' queda
// aparte a propósito: la RLS de orders_update_seller_advance_status ya
// excluye que un vendedor lo fije (solo el comprador puede cancelar, y solo
// si el pedido sigue 'pendiente').
export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "pendiente",
  "pagado",
  "enviado",
  "entregado",
];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pendiente: "Pendiente",
  pagado: "Pagado",
  enviado: "Enviado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export const ORDER_STATUS_BADGE_VARIANT: Record<
  OrderStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pendiente: "outline",
  pagado: "secondary",
  enviado: "default",
  entregado: "default",
  cancelado: "destructive",
};
