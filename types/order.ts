import type { Database } from "@/types/database";
import type { OrderStatus } from "@/lib/constants/roles";

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type OrderItemRow = Database["public"]["Tables"]["order_items"]["Row"];

export interface Order extends Omit<OrderRow, "status" | "total"> {
  status: OrderStatus;
  total: number;
}

export interface OrderItem extends Omit<OrderItemRow, "price_snapshot"> {
  price_snapshot: number;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
}
