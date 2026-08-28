import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getPublicUrl } from "@/services/storage.service";

type Client = SupabaseClient<Database>;

const PRODUCT_IMAGES_BUCKET = "product-images";

export interface CartItemWithProduct {
  id: string;
  productId: string;
  quantity: number;
  // null si el producto quedó inactivo: RLS lo oculta del embed, no un
  // producto borrado.
  product: {
    id: string;
    title: string;
    price: number;
    stock: number;
    image_url: string | null;
  } | null;
}

export async function getItems(
  userId: string,
  supabase: Client = createClient(),
): Promise<CartItemWithProduct[]> {
  const { data, error } = await supabase
    .from("cart_items")
    .select(
      "id, product_id, quantity, products(id, title, price, stock, product_images(image_path, position))",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  return data.map((row) => {
    const product = row.products;
    if (!product) {
      return { id: row.id, productId: row.product_id, quantity: row.quantity, product: null };
    }

    const images = [...(product.product_images ?? [])].sort(
      (a, b) => a.position - b.position,
    );
    const cover = images[0];

    return {
      id: row.id,
      productId: row.product_id,
      quantity: row.quantity,
      product: {
        id: product.id,
        title: product.title,
        price: Number(product.price),
        stock: product.stock,
        image_url: cover ? getPublicUrl(PRODUCT_IMAGES_BUCKET, cover.image_path) : null,
      },
    };
  });
}

// Si el producto ya está en el carrito, suma la cantidad (unique(user_id,
// product_id) no permite dos filas); siempre limitado al stock actual.
export async function addItem(
  userId: string,
  productId: string,
  quantity: number,
  supabase: Client = createClient(),
): Promise<void> {
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("stock")
    .eq("id", productId)
    .single();
  if (productError) throw productError;

  const { data: existing, error: existingError } = await supabase
    .from("cart_items")
    .select("id, quantity")
    .eq("user_id", userId)
    .eq("product_id", productId)
    .maybeSingle();
  if (existingError) throw existingError;

  const desiredQuantity = Math.min((existing?.quantity ?? 0) + quantity, product.stock);

  if (existing) {
    const { error } = await supabase
      .from("cart_items")
      .update({ quantity: desiredQuantity })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("cart_items")
      .insert({ user_id: userId, product_id: productId, quantity: desiredQuantity });
    if (error) throw error;
  }
}

export async function updateQuantity(
  cartItemId: string,
  quantity: number,
  supabase: Client = createClient(),
): Promise<void> {
  const { error } = await supabase
    .from("cart_items")
    .update({ quantity })
    .eq("id", cartItemId);
  if (error) throw error;
}

export async function removeItem(
  cartItemId: string,
  supabase: Client = createClient(),
): Promise<void> {
  const { error } = await supabase.from("cart_items").delete().eq("id", cartItemId);
  if (error) throw error;
}

export async function clear(
  userId: string,
  supabase: Client = createClient(),
): Promise<void> {
  const { error } = await supabase.from("cart_items").delete().eq("user_id", userId);
  if (error) throw error;
}
