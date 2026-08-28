import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Product } from "@/types/product";
import { generateEmbedding } from "@/lib/ai/embeddings";
import { mapProductRow, type RawProductRow } from "@/services/product.service";
import { toVectorLiteral } from "@/services/embedding.service";
import {
  VECTOR_SEARCH_DEFAULT_TOP_K,
  VECTOR_SEARCH_MAX_TOP_K,
  VECTOR_SEARCH_DEFAULT_SIMILARITY_THRESHOLD,
} from "@/lib/constants/ai";

type Client = SupabaseClient<Database>;
type KnowledgeSourceType = "producto" | "articulo_soporte";

export interface KnowledgeMatch {
  source_type: KnowledgeSourceType;
  source_id: string;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
}

export interface VectorSearchOptions {
  sourceType?: KnowledgeSourceType;
  topK?: number;
  similarityThreshold?: number;
}

export async function searchByEmbedding(
  embedding: number[],
  opts: VectorSearchOptions = {},
  supabase: Client,
): Promise<KnowledgeMatch[]> {
  const {
    sourceType,
    topK = VECTOR_SEARCH_DEFAULT_TOP_K,
    similarityThreshold = VECTOR_SEARCH_DEFAULT_SIMILARITY_THRESHOLD,
  } = opts;

  const { data, error } = await supabase.rpc("match_knowledge", {
    query_embedding: toVectorLiteral(embedding),
    p_source_type: sourceType,
    match_count: Math.min(topK, VECTOR_SEARCH_MAX_TOP_K),
    similarity_threshold: similarityThreshold,
  });
  if (error) throw error;

  return (data ?? []) as KnowledgeMatch[];
}

// Embedding de la consulta + matching (sin hidratar): lo usa `searchProducts`
// acá abajo y `chat.service` (Fase 4.6) para el modo soporte, que no
// hidrata contra `products` sino que consume el contenido de la ficha tal
// cual. Evita repetir el paso "generar embedding + llamar al RPC" dos veces.
export async function searchKnowledge(
  query: string,
  opts: VectorSearchOptions = {},
  supabase: Client,
): Promise<KnowledgeMatch[]> {
  const embedding = await generateEmbedding(query);
  return searchByEmbedding(embedding, opts, supabase);
}

export interface ProductSearchResult {
  product: Product;
  similarity: number;
}

// Matching + hidratación: precio/imagen ACTUALES desde `products` (no lo
// que quedó guardado en la ficha), descartando huérfanas (producto borrado
// o desactivado desde que se indexó — decisión 6).
export async function searchProducts(
  query: string,
  opts: Omit<VectorSearchOptions, "sourceType"> = {},
  supabase: Client,
): Promise<ProductSearchResult[]> {
  const matches = await searchKnowledge(query, { ...opts, sourceType: "producto" }, supabase);
  if (matches.length === 0) return [];

  const { data, error } = await supabase
    .from("products")
    .select("*, product_images(*), reviews(rating)")
    .in(
      "id",
      matches.map((m) => m.source_id),
    )
    .eq("is_active", true);
  if (error) throw error;

  const productsById = new Map(
    (data as unknown as RawProductRow[]).map((row) => [row.id, mapProductRow(row)]),
  );

  return matches
    .map((match) => {
      const product = productsById.get(match.source_id);
      return product ? { product, similarity: match.similarity } : null;
    })
    .filter((result): result is ProductSearchResult => result !== null);
}
