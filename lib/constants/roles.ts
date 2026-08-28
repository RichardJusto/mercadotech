export const ROLES = ["buyer", "seller", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const ORDER_STATUSES = [
  "pendiente",
  "pagado",
  "enviado",
  "entregado",
  "cancelado",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const TICKET_STATUSES = [
  "abierto",
  "en_proceso",
  "resuelto",
  "cerrado",
] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const PRODUCT_CONDITIONS = [
  "nuevo",
  "usado",
  "reacondicionado",
] as const;
export type ProductCondition = (typeof PRODUCT_CONDITIONS)[number];
