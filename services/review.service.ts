import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Review } from "@/types/review";

type Client = SupabaseClient<Database>;

export async function listByProduct(
  productId: string,
  supabase: Client = createClient(),
): Promise<Review[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getAverage(
  productId: string,
  supabase: Client = createClient(),
): Promise<{ average: number; count: number }> {
  const { data, error } = await supabase
    .from("reviews")
    .select("rating")
    .eq("product_id", productId);
  if (error) throw error;

  const count = data.length;
  const average = count > 0 ? data.reduce((sum, r) => sum + r.rating, 0) / count : 0;
  return { average, count };
}

export interface CanReviewResult {
  allowed: boolean;
  orderId: string | null;
}

// Defensa en profundidad: la política RLS de reviews ya exige un pedido
// 'entregado' con el producto; esto solo decide si se muestra el formulario.
export async function canReview(
  productId: string,
  userId: string,
  supabase: Client = createClient(),
): Promise<CanReviewResult> {
  const { data: existingReview, error: reviewError } = await supabase
    .from("reviews")
    .select("id")
    .eq("product_id", productId)
    .eq("buyer_id", userId)
    .maybeSingle();
  if (reviewError) throw reviewError;
  if (existingReview) return { allowed: false, orderId: null };

  const { data: orderItem, error: orderError } = await supabase
    .from("order_items")
    .select("order_id, orders!inner(status, buyer_id)")
    .eq("product_id", productId)
    .eq("orders.buyer_id", userId)
    .eq("orders.status", "entregado")
    .limit(1)
    .maybeSingle();
  if (orderError) throw orderError;

  return { allowed: !!orderItem, orderId: orderItem?.order_id ?? null };
}

export interface CreateReviewInput {
  productId: string;
  orderId: string;
  rating: number;
  comment?: string;
}

export async function create(
  { productId, orderId, rating, comment }: CreateReviewInput,
  supabase: Client = createClient(),
): Promise<Review> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("No hay sesión activa");

  const { data, error } = await supabase
    .from("reviews")
    .insert({
      product_id: productId,
      buyer_id: user.id,
      order_id: orderId,
      rating,
      comment,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}
