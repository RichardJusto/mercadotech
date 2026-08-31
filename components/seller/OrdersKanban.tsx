"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { OrderKanbanCard, type SellerOrderCardData } from "@/components/seller/OrderKanbanCard";
import { ORDER_STATUS_FLOW, ORDER_STATUS_LABELS } from "@/lib/constants/orders";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/lib/constants/roles";

interface OrdersKanbanProps {
  grouped: Record<OrderStatus, SellerOrderCardData[]>;
  onMove: (orderId: string, toStatus: OrderStatus) => void;
}

const COLUMNS: OrderStatus[] = [...ORDER_STATUS_FLOW, "cancelado"];

interface KanbanColumnProps {
  status: OrderStatus;
  orders: SellerOrderCardData[];
}

function KanbanColumn({ status, orders }: KanbanColumnProps) {
  // 'cancelado' no acepta drops: el vendedor no puede cancelar (RLS), solo
  // ve ahí los pedidos que canceló el comprador.
  const isCancelledColumn = status === "cancelado";
  const { setNodeRef, isOver } = useDroppable({ id: status, disabled: isCancelledColumn });

  return (
    <div
      ref={setNodeRef}
      data-testid={`kanban-column-${status}`}
      className={cn(
        "flex w-64 shrink-0 flex-col gap-2 rounded-lg border bg-muted/30 p-3",
        isOver && "ring-2 ring-primary",
      )}
    >
      <p className="text-sm font-semibold">
        {ORDER_STATUS_LABELS[status]} ({orders.length})
      </p>
      <div className="space-y-2">
        {orders.map((order) => (
          <OrderKanbanCard key={order.id} order={order} disabled={isCancelledColumn} />
        ))}
      </div>
    </div>
  );
}

// Drag & drop #2: arrastrar una tarjeta entre columnas llama a onMove, que
// (en useSellerOrders) valida que sea un paso adelante en ORDER_STATUS_FLOW.
export function OrdersKanban({ grouped, onMove }: OrdersKanbanProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const toStatus = over.id as OrderStatus;
    if (toStatus === "cancelado") return;
    onMove(String(active.id), toStatus);
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((status) => (
          <KanbanColumn key={status} status={status} orders={grouped[status]} />
        ))}
      </div>
    </DndContext>
  );
}
