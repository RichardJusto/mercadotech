import Link from "next/link";
import { Price } from "@/components/shared/Price";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import type { Order } from "@/types/order";

interface OrderCardProps {
  order: Order;
}

export function OrderCard({ order }: OrderCardProps) {
  return (
    <Link
      href={`/pedidos/${order.id}`}
      className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted"
    >
      <div className="space-y-1">
        <p className="font-medium">Pedido #{order.id.slice(0, 8)}</p>
        <p className="text-sm text-muted-foreground">
          {new Date(order.created_at).toLocaleDateString("es-PE", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <OrderStatusBadge status={order.status} />
        <Price value={order.total} size="sm" />
      </div>
    </Link>
  );
}
