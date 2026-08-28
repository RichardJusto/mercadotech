import type { TicketStatus } from "@/lib/constants/roles";

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  abierto: "Abierto",
  en_proceso: "En proceso",
  resuelto: "Resuelto",
  cerrado: "Cerrado",
};

export const TICKET_STATUS_BADGE_VARIANT: Record<
  TicketStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  abierto: "outline",
  en_proceso: "secondary",
  resuelto: "default",
  cerrado: "destructive",
};
