import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Product } from "@/types/product";
import { mapProductRow, type RawProductRow } from "@/services/product.service";

type Client = SupabaseClient<Database>;

export async function isFavorite(
  productId: string,
  userId: string,
  supabase: Client = createClient(),
): Promise<boolean> {
  const { data, error } = await supabase
    .from("favorites")
    .select("id")
    .eq("product_id", productId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function toggle(
  productId: string,
  userId: string,
  supabase: Client = createClient(),
): Promise<boolean> {
  const currentlyFavorite = await isFavorite(productId, userId, supabase);

  if (currentlyFavorite) {
    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("product_id", productId)
      .eq("user_id", userId);
    if (error) throw error;
    return false;
  }

  const { error } = await supabase
    .from("favorites")
    .insert({ product_id: productId, user_id: userId });
  if (error) throw error;
  return true;
}

export async function listMine(supabase: Client = createClient()): Promise<Product[]> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) return [];

  const { data, error } = await supabase
    .from("favorites")
    .select("product_id, products(*, product_images(*), reviews(rating))")
    .eq("user_id", user.id);
  if (error) throw error;

  return data
    .filter((row) => row.products !== null)
    .map((row) => mapProductRow(row.products as unknown as RawProductRow));
}
