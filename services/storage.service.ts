import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

const PRODUCT_IMAGES_BUCKET = "product-images";

export function getPublicUrl(
  bucket: string,
  path: string,
  supabase: Client = createClient(),
): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// Convención de path de la Fase 2.4: {seller_id}/{product_id}/{n}.{ext} — la
// política de Storage compara el primer segmento con auth.uid().
export async function uploadProductImage(
  file: File,
  sellerId: string,
  productId: string,
  n: number,
  supabase: Client = createClient(),
): Promise<{ path: string; publicUrl: string }> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${sellerId}/${productId}/${n}.${ext}`;

  const { error } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(path, file, { upsert: true });
  if (error) throw error;

  return { path, publicUrl: getPublicUrl(PRODUCT_IMAGES_BUCKET, path, supabase) };
}

export async function deleteProductImage(
  imagePath: string,
  supabase: Client = createClient(),
): Promise<void> {
  const { error: storageError } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .remove([imagePath]);
  if (storageError) throw storageError;

  const { error: dbError } = await supabase
    .from("product_images")
    .delete()
    .eq("image_path", imagePath);
  if (dbError) throw dbError;
}

export interface SaveImageOrderItem {
  id?: string;
  product_id: string;
  image_path: string;
  position: number;
}

// Upsert con filas COMPLETAS: un upsert parcial (solo id + position) viola
// los not null de product_images, porque PostgREST arma un INSERT ... ON
// CONFLICT y las columnas ausentes del payload no se tratan como "sin
// cambios" sino como NULL.
export async function saveImageOrder(
  items: SaveImageOrderItem[],
  supabase: Client = createClient(),
): Promise<void> {
  const { error } = await supabase.from("product_images").upsert(items);
  if (error) throw error;
}
