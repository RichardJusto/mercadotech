import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Product, ProductImage } from "@/types/product";
import type { ProductCondition } from "@/lib/constants/roles";
import type { SortOption } from "@/lib/constants/catalog";
import { PRODUCTS_PAGE_SIZE } from "@/lib/constants/catalog";
import { getPublicUrl } from "@/services/storage.service";

type Client = SupabaseClient<Database>;
type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type ProductImageRow = Database["public"]["Tables"]["product_images"]["Row"];

const PRODUCT_IMAGES_BUCKET = "product-images";

export interface RawProductRow extends Omit<ProductRow, "price" | "condition"> {
  price: string | number;
  condition: string;
  product_images: ProductImageRow[];
  reviews: { rating: number }[];
}

export function mapProductRow(row: RawProductRow): Product {
  const { product_images, reviews, price, condition, ...rest } = row;

  const images = [...(product_images ?? [])].sort((a, b) => a.position - b.position);
  const cover = images[0];

  const reviewList = reviews ?? [];
  const reviewCount = reviewList.length;
  const averageRating =
    reviewCount > 0
      ? reviewList.reduce((sum, r) => sum + r.rating, 0) / reviewCount
      : 0;

  return {
    ...rest,
    price: Number(price),
    condition: condition as ProductCondition,
    image_url: cover ? getPublicUrl(PRODUCT_IMAGES_BUCKET, cover.image_path) : null,
    average_rating: averageRating,
    review_count: reviewCount,
  };
}

export interface ListActiveProductsParams {
  categorySlug?: string;
  search?: string;
  condition?: ProductCondition[];
  minPrice?: number;
  maxPrice?: number;
  sort?: SortOption;
  page?: number;
}

export interface ListActiveProductsResult {
  items: Product[];
  total: number;
}

export async function listActiveProducts(
  params: ListActiveProductsParams = {},
  supabase: Client = createClient(),
): Promise<ListActiveProductsResult> {
  const {
    categorySlug,
    search,
    condition,
    minPrice,
    maxPrice,
    sort = "recientes",
    page = 1,
  } = params;

  let categoryId: string | undefined;
  if (categorySlug) {
    const { data: category, error: categoryError } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", categorySlug)
      .single();
    if (categoryError) throw categoryError;
    categoryId = category.id;
  }

  // is_active ya lo garantiza RLS para anon, pero se filtra explícito acá
  // para que un vendedor autenticado no vea sus propios inactivos en la home.
  let query = supabase
    .from("products")
    .select("*, product_images(*), reviews(rating)", { count: "exact" })
    .eq("is_active", true);

  if (categoryId) query = query.eq("category_id", categoryId);
  if (condition && condition.length > 0) query = query.in("condition", condition);
  if (typeof minPrice === "number") query = query.gte("price", minPrice);
  if (typeof maxPrice === "number") query = query.lte("price", maxPrice);
  if (search) {
    // ilike sobre title y brand: provisional hasta la búsqueda semántica de
    // la sesión 4.
    query = query.or(`title.ilike.%${search}%,brand.ilike.%${search}%`);
  }

  if (sort === "precio_asc") {
    query = query.order("price", { ascending: true });
  } else if (sort === "precio_desc") {
    query = query.order("price", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const from = (page - 1) * PRODUCTS_PAGE_SIZE;
  const to = from + PRODUCTS_PAGE_SIZE - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    items: (data as unknown as RawProductRow[]).map(mapProductRow),
    total: count ?? 0,
  };
}

export async function getProductById(
  id: string,
  supabase: Client = createClient(),
): Promise<Product> {
  const { data, error } = await supabase
    .from("products")
    .select("*, product_images(*), reviews(rating)")
    .eq("id", id)
    .single();
  if (error) throw error;
  return mapProductRow(data as unknown as RawProductRow);
}

export async function getProductImages(
  productId: string,
  supabase: Client = createClient(),
): Promise<ProductImage[]> {
  const { data, error } = await supabase
    .from("product_images")
    .select("*")
    .eq("product_id", productId)
    .order("position", { ascending: true });
  if (error) throw error;

  return data.map((image) => ({
    ...image,
    image_url: getPublicUrl(PRODUCT_IMAGES_BUCKET, image.image_path),
  }));
}

// product_views.user_id es NOT NULL y la política exige authenticated:
// solo se llama con sesión activa (ver hooks/useProduct.ts).
export async function registerView(
  productId: string,
  userId: string,
  supabase: Client = createClient(),
): Promise<void> {
  const { error } = await supabase
    .from("product_views")
    .insert({ product_id: productId, user_id: userId });
  if (error) throw error;
}
