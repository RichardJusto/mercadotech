"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Price } from "@/components/shared/Price";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/lib/constants/roles";

// Forma local, no importada de services/: coincide estructuralmente con
// SellerOrder (services/seller.service.ts).
export interface SellerOrderCardData {
  id: string;
  status: OrderStatus;
  created_at: string;
  items: { id: string; title_snapshot: string; price_snapshot: number; quantity: number }[];
}

interface OrderKanbanCardProps {
  order: SellerOrderCardData;
  disabled?: boolean;
}

// Pedido multi-vendedor: la tarjeta solo lista los ítems de ESTE vendedor y
// suma solo esos — no orders.total, que incluye ítems de otros vendedores.
export function OrderKanbanCard({ order, disabled }: OrderKanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: order.id,
    disabled,
  });

  const myTotal = order.items.reduce(
    (sum, item) => sum + item.price_snapshot * item.quantity,
    0,
  );

  return (
    <div
      ref={setNodeRef}
      data-testid={`kanban-card-${order.id}`}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(
        "touch-none space-y-1 rounded-md border bg-card p-3 text-sm shadow-sm",
        !disabled && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50",
        disabled && "opacity-70",
      )}
      {...(disabled ? {} : attributes)}
      {...(disabled ? {} : listeners)}
    >
      <p className="font-medium">Pedido #{order.id.slice(0, 8)}</p>
      <p className="text-xs text-muted-foreground">
        {new Date(order.created_at).toLocaleDateString("es-PE", {
          day: "numeric",
          month: "short",
        })}
      </p>
      <ul className="space-y-0.5 text-xs text-muted-foreground">
        {order.items.map((item) => (
          <li key={item.id}>
            {item.quantity}× {item.title_snapshot}
          </li>
        ))}
      </ul>
      <Price value={myTotal} size="sm" />
    </div>
  );
}
