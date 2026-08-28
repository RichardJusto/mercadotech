import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Product } from "@/types/product";
import { getProductById } from "@/services/product.service";

type Client = SupabaseClient<Database>;

// product.service.ts NO expone getProductsByIds (hallazgo del Prompt 0: la
// tabla "Estado de partida" de la spec de la Sesión 5 asumía que ya
// existía). Se deriva componiendo getProductById existente (lección 6) en
// vez de agregar un service nuevo al proyecto web solo para el MCP. Un id
// que ya no existe (producto eliminado) se descarta en silencio — mismo
// criterio que vector-search.service.searchProducts con fichas huérfanas.
export async function hydrateProducts(ids: string[], supabase: Client): Promise<Product[]> {
  const results = await Promise.allSettled(ids.map((id) => getProductById(id, supabase)));
  return results
    .filter((r): r is PromiseFulfilledResult<Product> => r.status === "fulfilled")
    .map((r) => r.value);
}
