import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Product, ProductImage } from "@/types/product";
import type { Question } from "@/types/question";
import { getProductById, getProductImages } from "@/services/product.service";
import { getAverage } from "@/services/review.service";
import { listByProduct } from "@/services/question.service";

type Client = SupabaseClient<Database>;

export interface ProductDetail {
  product: Product;
  images: ProductImage[];
  rating: { average: number; count: number };
  questions: Question[];
}

// Compartida entre la tool get_product (#2) y el resource
// mercadotech://products/{id} — misma forma, una sola función (spec Fase
// 5.4: "misma forma que la tool #2 — misma función compartida").
export async function getProductDetail(productId: string, supabase: Client): Promise<ProductDetail> {
  const [product, images, rating, questions] = await Promise.all([
    getProductById(productId, supabase),
    getProductImages(productId, supabase),
    getAverage(productId, supabase),
    listByProduct(productId, supabase),
  ]);

  return { product, images, rating, questions };
}
