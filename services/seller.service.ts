import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Product } from "@/types/product";
import type { Order } from "@/types/order";
import type { OrderStatus, ProductCondition } from "@/lib/constants/roles";
import { mapProductRow, type RawProductRow } from "@/services/product.service";

type Client = SupabaseClient<Database>;

export interface SellerOrderItem {
  id: string;
  title_snapshot: string;
  price_snapshot: number;
  quantity: number;
}

export interface SellerOrder extends Order {
  // Solo los ítems de ESTE vendedor dentro del pedido (puede ser
  // multi-vendedor); no la lista completa de order_items.
  items: SellerOrderItem[];
}

// Incluye inactivos: la RLS de products permite al dueño ver los suyos
// aunque is_active = false (a diferencia del catálogo público).
export async function listMyProducts(
  sellerId: string,
  supabase: Client = createClient(),
): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*, product_images(*), reviews(rating)")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as RawProductRow[]).map(mapProductRow);
}

export interface ProductInput {
  categoryId: string;
  title: string;
  description?: string;
  brand?: string;
  condition: ProductCondition;
  price: number;
  stock: number;
}

export async function createProduct(
  sellerId: string,
  input: ProductInput,
  supabase: Client = createClient(),
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("products")
    .insert({
      seller_id: sellerId,
      category_id: input.categoryId,
      title: input.title,
      description: input.description,
      brand: input.brand,
      condition: input.condition,
      price: input.price,
      stock: input.stock,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data;
}

export async function updateProduct(
  productId: string,
  input: ProductInput,
  supabase: Client = createClient(),
): Promise<void> {
  const { error } = await supabase
    .from("products")
    .update({
      category_id: input.categoryId,
      title: input.title,
      description: input.description,
      brand: input.brand,
      condition: input.condition,
      price: input.price,
      stock: input.stock,
    })
    .eq("id", productId);
  if (error) throw error;
}

export async function toggleActive(
  productId: string,
  isActive: boolean,
  supabase: Client = createClient(),
): Promise<void> {
  const { error } = await supabase
    .from("products")
    .update({ is_active: isActive })
    .eq("id", productId);
  if (error) throw error;
}

// order_items.product_id es on delete restrict: si el producto tiene
// ventas, Postgres devuelve foreign_key_violation (23503). Se traduce a un
// mensaje que sugiere desactivar en vez de reintentar borrar.
export async function deleteProduct(
  productId: string,
  supabase: Client = createClient(),
): Promise<void> {
  const { error } = await supabase.from("products").delete().eq("id", productId);
  if (error) {
    if (error.code === "23503") {
      throw new Error("Este producto tiene ventas; desactívalo en lugar de eliminarlo.");
    }
    throw error;
  }
}

export async function listMyOrders(
  sellerId: string,
  supabase: Client = createClient(),
): Promise<SellerOrder[]> {
  const { data, error } = await supabase
    .from("order_items")
    .select("id, title_snapshot, price_snapshot, quantity, orders(*)")
    .eq("seller_id", sellerId);
  if (error) throw error;

  // Pedido multi-vendedor (ver decisión 9 de la spec): cada vendedor solo ve
  // SUS ítems dentro del pedido; el total de la tarjeta del kanban es la
  // suma de esos ítems propios, no orders.total (que incluye a todos).
  const map = new Map<string, SellerOrder>();
  for (const row of data) {
    const order = row.orders;
    if (!order) continue;
    if (!map.has(order.id)) {
      map.set(order.id, {
        ...order,
        status: order.status as OrderStatus,
        total: Number(order.total),
        items: [],
      });
    }
    map.get(order.id)!.items.push({
      id: row.id,
      title_snapshot: row.title_snapshot,
      price_snapshot: Number(row.price_snapshot),
      quantity: row.quantity,
    });
  }

  return [...map.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

// La RLS acepta cualquier estado que no sea 'cancelado' y no valida
// secuencia: la validación de "un paso adelante" vive en useSellerOrders.
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  supabase: Client = createClient(),
): Promise<void> {
  const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
  if (error) throw error;
}
