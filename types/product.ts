import type { Database } from "@/types/database";
import type { ProductCondition } from "@/lib/constants/roles";

type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type ProductImageRow = Database["public"]["Tables"]["product_images"]["Row"];

// price llega como string desde PostgREST (numeric); los services lo parsean
// a number antes de exponer este tipo a componentes.
export interface Product extends Omit<ProductRow, "price" | "condition"> {
  price: number;
  condition: ProductCondition;
  image_url: string | null;
  average_rating: number;
  review_count: number;
}

export interface ProductImage extends ProductImageRow {
  image_url: string;
}
