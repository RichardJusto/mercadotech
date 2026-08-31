import { Badge } from "@/components/ui/badge";
import { ORDER_STATUS_BADGE_VARIANT, ORDER_STATUS_LABELS } from "@/lib/constants/orders";
import type { OrderStatus } from "@/lib/constants/roles";

interface OrderStatusBadgeProps {
  status: OrderStatus;
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  return (
    <Badge data-testid="order-status-badge" variant={ORDER_STATUS_BADGE_VARIANT[status]}>
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}
