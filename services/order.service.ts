import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Order, OrderItem, OrderWithItems } from "@/types/order";

type Client = SupabaseClient<Database>;

// Checkout SIMULADO: no se pide ni se almacena ningún dato de pago. El
// mensaje de error de Postgres (carrito vacío / stock insuficiente /
// producto no disponible) se propaga tal cual — el hook lo muestra en toast.
export async function checkout(
  userId: string,
  supabase: Client = createClient(),
): Promise<string> {
  const { data, error } = await supabase.rpc("create_order_from_cart", {
    p_buyer_id: userId,
  });
  if (error) throw error;
  return data;
}

function mapOrderRow(row: Omit<Order, "status" | "total"> & { status: string; total: string | number }): Order {
  return {
    ...row,
    status: row.status as Order["status"],
    total: Number(row.total),
  };
}

export async function listMyOrders(
  userId: string,
  supabase: Client = createClient(),
): Promise<Order[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("buyer_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(mapOrderRow);
}

export async function getOrderById(
  id: string,
  supabase: Client = createClient(),
): Promise<OrderWithItems> {
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .single();
  if (orderError) throw orderError;

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", id);
  if (itemsError) throw itemsError;

  return {
    ...mapOrderRow(order),
    items: items.map(
      (item): OrderItem => ({ ...item, price_snapshot: Number(item.price_snapshot) }),
    ),
  };
}

// Solo funciona si el pedido sigue 'pendiente' (RLS + WHERE lo garantizan);
// no restaura stock, limitación documentada — ver Fase 3.6 en la spec.
export async function cancelIfPending(
  id: string,
  supabase: Client = createClient(),
): Promise<void> {
  const { error } = await supabase
    .from("orders")
    .update({ status: "cancelado" })
    .eq("id", id)
    .eq("status", "pendiente");
  if (error) throw error;
}
